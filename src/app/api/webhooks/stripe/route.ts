import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { sendEmail, renderDunningEmail, getDefaultEmailConfig } from "@/lib/email";

let stripe: Stripe | null = null;

function getStripe() {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key || key === "STRIPE...RET=" || key.includes("...")) {
      console.warn("[Stripe] Secret key not configured, skipping initialization");
      return null;
    }
    stripe = new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
  }
  return stripe;
}

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const signature = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  const stripeInstance = getStripe();

  if (!stripeInstance) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  try {
    event = stripeInstance.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error("[Stripe Webhook] Invalid signature:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log("[Stripe Webhook] Event received:", event.type, event.id);

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    await handlePaymentFailed(invoice, event.id);
  }

  return NextResponse.json({ received: true });
}

async function handlePaymentFailed(invoice: Stripe.Invoice, eventId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const customerId = invoice.customer as string;
  const amountDue = invoice.amount_due;
  const currency = invoice.currency;

  const stripeInstance = getStripe();
  if (!stripeInstance) {
    console.error("[handlePaymentFailed] Stripe not configured");
    return;
  }

  const customer = await stripeInstance.customers.retrieve(customerId);
  if (customer.deleted) {
    console.log("[handlePaymentFailed] Customer deleted:", customerId);
    return;
  }

  const customerEmail = customer.email;
  const customerName = customer.name || customerEmail?.split("@")[0] || "there";

  if (!customerEmail) {
    console.error("[handlePaymentFailed] No email for customer:", customerId);
    return;
  }

  // Find user by stripe_customer_id in failed_payments or user_settings
  const { data: paymentRecord } = await supabase
    .from("failed_payments")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .single();

  let userId = paymentRecord?.user_id;

  // If no existing payment record, we need to find the user somehow
  // For now, use a default/fallback approach
  if (!userId) {
    console.log("[handlePaymentFailed] No existing payment record for customer:", customerId);
    // Could look up by email in user_settings or auth.users
    // For now, we'll skip - this needs proper user mapping
    return;
  }

  // Get user settings
  const { data: settings } = await supabase
    .from("user_settings")
    .select("sender_name, company_name")
    .eq("user_id", userId)
    .single();

  const founderName = settings?.sender_name || "The Team";
  const companyName = settings?.company_name || undefined;

  // Get email config (with Gmail fallback)
  const emailConfig = getDefaultEmailConfig();
  if (!emailConfig.pass) {
    console.error("[handlePaymentFailed] No email config for user:", userId);
    return;
  }

  const retryUrl = invoice.hosted_invoice_url || "#";

  const { html, text } = renderDunningEmail({
    customerName,
    amount: amountDue,
    currency: currency.toUpperCase(),
    retryUrl,
    founderName,
    companyName,
  });

  const result = await sendEmail(emailConfig, {
    to: customerEmail,
    subject: `Payment update needed — ${companyName || founderName}`,
    html,
    text,
  });

  if (result.success) {
    // Create failed_payment record if not exists
    if (!paymentRecord) {
      await supabase.from("failed_payments").insert({
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_invoice_id: invoice.id,
        customer_email: customerEmail,
        customer_name: customerName,
        amount: amountDue,
        currency: currency,
        status: "pending",
        retry_count: 0,
      });
    }

    // Log recovery attempt
    await supabase.from("recovery_attempts").insert({
      user_id: userId,
      attempt_number: 1,
      status: "sent",
      email_subject: `Payment update needed — ${companyName || founderName}`,
      email_body: html.substring(0, 500),
      message_id: result.messageId,
    });

    console.log("[handlePaymentFailed] Dunning email sent to:", customerEmail);
  } else {
    console.error("[handlePaymentFailed] Failed to send email:", result.error);
  }
}
