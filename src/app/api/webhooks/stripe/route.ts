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

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  console.log("[Stripe Webhook] Signature header:", signature ? `${signature.substring(0, 20)}...` : "missing");
  console.log("[Stripe Webhook] Secret configured:", webhookSecret ? `yes (${webhookSecret.substring(0, 10)}...)` : "no");
  console.log("[Stripe Webhook] Payload length:", payload.length);

  try {
    event = stripeInstance.webhooks.constructEvent(payload, signature, webhookSecret!);
  } catch (err: any) {
    console.error("[Stripe Webhook] Invalid signature:", err.message);
    return NextResponse.json({ error: "Invalid signature", details: err.message }, { status: 400 });
  }

  console.log("[Stripe Webhook] Event received:", event.type, event.id);

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    try {
      await handlePaymentFailed(invoice, event.id);
    } catch (err: any) {
      console.error("[Stripe Webhook] handlePaymentFailed error:", err.message);
      return NextResponse.json({ error: "Handler failed", details: err.message }, { status: 500 });
    }
  } else if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;
    try {
      await handlePaymentSucceeded(invoice, event.id);
    } catch (err: any) {
      console.error("[Stripe Webhook] handlePaymentSucceeded error:", err.message);
      return NextResponse.json({ error: "Handler failed", details: err.message }, { status: 500 });
    }
  } else if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    try {
      await handleSubscriptionDeleted(subscription, event.id);
    } catch (err: any) {
      console.error("[Stripe Webhook] handleSubscriptionDeleted error:", err.message);
      return NextResponse.json({ error: "Handler failed", details: err.message }, { status: 500 });
    }
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

  // Find user by stripe_customer_id in user_settings
  const { data: settings } = await supabase
    .from("user_settings")
    .select("user_id, sender_name, company_name")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!settings?.user_id) {
    console.log("[handlePaymentFailed] No user_settings record for customer:", customerId);
    return;
  }

  const userId = settings.user_id;
  const founderName = settings.sender_name || "The Team";
  const companyName = settings.company_name || undefined;

  // Get email config (with Gmail fallback)
  const emailConfig = getDefaultEmailConfig();
  console.log("[handlePaymentFailed] Email config user:", emailConfig.user);
  console.log("[handlePaymentFailed] Email config pass set:", !!emailConfig.pass);
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

  console.log("[handlePaymentFailed] Email result:", result.success, result.error || result.messageId);

  if (result.success) {
    // Create failed_payment record
    let failedPaymentId: string | null = null;
    try {
      const { data: fpData, error: fpError } = await supabase.from("failed_payments").insert({
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_payment_intent_id: invoice.id, // Using invoice ID as fallback for testing
        stripe_invoice_id: invoice.id,
        customer_email: customerEmail,
        customer_name: customerName,
        amount: amountDue,
        currency: currency,
        status: "pending",
        retry_count: 0,
      }).select("id").single();
      
      if (fpError) {
        console.error("[handlePaymentFailed] failed_payments insert error:", fpError.message);
      } else {
        failedPaymentId = fpData.id;
        console.log("[handlePaymentFailed] failed_payments record created:", failedPaymentId);
      }
    } catch (err: any) {
      console.error("[handlePaymentFailed] failed_payments insert exception:", err.message);
    }

    // Log recovery attempt
    if (failedPaymentId) {
      try {
        const { error: raError } = await supabase.from("recovery_attempts").insert({
          user_id: userId,
          failed_payment_id: failedPaymentId,
          attempt_number: 1,
          status: "sent",
          scheduled_at: new Date().toISOString(),
          sent_at: new Date().toISOString(),
          email_subject: `Payment update needed — ${companyName || founderName}`,
          email_body: html.substring(0, 500),
          message_id: result.messageId,
        });
        if (raError) {
          console.error("[handlePaymentFailed] recovery_attempts insert error:", raError.message);
        } else {
          console.log("[handlePaymentFailed] recovery_attempts record created");
        }

        // Schedule next recovery attempt based on retry schedule
        const { data: userSettings } = await supabase
          .from("user_settings")
          .select("retry_schedule, max_retries")
          .eq("user_id", userId)
          .single();

        const retrySchedule = userSettings?.retry_schedule || [1, 3, 7];
        const maxRetries = userSettings?.max_retries || 3;

        // Schedule attempt 2 (if max_retries allows)
        if (maxRetries >= 2 && retrySchedule.length >= 1) {
          const daysToAdd = retrySchedule[0]; // First interval (1 day)
          const scheduledDate = new Date();
          scheduledDate.setDate(scheduledDate.getDate() + daysToAdd);

          const { error: scheduleError } = await supabase.from("recovery_attempts").insert({
            user_id: userId,
            failed_payment_id: failedPaymentId,
            attempt_number: 2,
            status: "scheduled",
            scheduled_at: scheduledDate.toISOString(),
            email_subject: `Reminder: Payment update needed — ${companyName || founderName}`,
          });

          if (scheduleError) {
            console.error("[handlePaymentFailed] Failed to schedule attempt 2:", scheduleError.message);
          } else {
            console.log("[handlePaymentFailed] Scheduled attempt 2 for:", scheduledDate.toISOString());
          }
        }
      } catch (err: any) {
        console.error("[handlePaymentFailed] recovery_attempts insert exception:", err.message);
      }
    }

    console.log("[handlePaymentFailed] Dunning email sent to:", customerEmail);
  } else {
    console.error("[handlePaymentFailed] Failed to send email:", result.error);
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice, eventId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const customerId = invoice.customer as string;
  const invoiceId = invoice.id;

  console.log("[handlePaymentSucceeded] Processing payment success for customer:", customerId, "invoice:", invoiceId);

  // Find the failed payment record for this customer
  const { data: failedPayments, error: fpError } = await supabase
    .from("failed_payments")
    .select("id, status, user_id")
    .eq("stripe_customer_id", customerId)
    .in("status", ["pending", "failed", "dunning"])
    .order("created_at", { ascending: false })
    .limit(1);

  if (fpError) {
    console.error("[handlePaymentSucceeded] Error finding failed payment:", fpError.message);
    return;
  }

  if (!failedPayments || failedPayments.length === 0) {
    console.log("[handlePaymentSucceeded] No active failed payment found for customer:", customerId);
    return;
  }

  const failedPayment = failedPayments[0];

  // Update the failed payment to recovered
  const { error: updateError } = await supabase
    .from("failed_payments")
    .update({
      status: "recovered",
      recovered_at: new Date().toISOString(),
    })
    .eq("id", failedPayment.id);

  if (updateError) {
    console.error("[handlePaymentSucceeded] Error updating failed payment:", updateError.message);
    return;
  }

  // Cancel any scheduled recovery attempts
  const { error: cancelError } = await supabase
    .from("recovery_attempts")
    .update({
      status: "cancelled",
      completed_at: new Date().toISOString(),
      result: "Payment recovered - customer paid",
    })
    .eq("failed_payment_id", failedPayment.id)
    .eq("status", "scheduled");

  if (cancelError) {
    console.error("[handlePaymentSucceeded] Error cancelling recovery attempts:", cancelError.message);
  }

  console.log("[handlePaymentSucceeded] Marked failed payment as recovered:", failedPayment.id);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription, eventId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const customerId = subscription.customer as string;

  console.log("[handleSubscriptionDeleted] Processing subscription deletion for customer:", customerId);

  // Find active failed payments for this customer
  const { data: failedPayments, error: fpError } = await supabase
    .from("failed_payments")
    .select("id, status, user_id")
    .eq("stripe_customer_id", customerId)
    .in("status", ["pending", "failed", "dunning"])
    .order("created_at", { ascending: false });

  if (fpError) {
    console.error("[handleSubscriptionDeleted] Error finding failed payments:", fpError.message);
    return;
  }

  if (!failedPayments || failedPayments.length === 0) {
    console.log("[handleSubscriptionDeleted] No active failed payments found for customer:", customerId);
    return;
  }

  for (const failedPayment of failedPayments) {
    // Update the failed payment to abandoned
    const { error: updateError } = await supabase
      .from("failed_payments")
      .update({
        status: "abandoned",
        abandoned_at: new Date().toISOString(),
      })
      .eq("id", failedPayment.id);

    if (updateError) {
      console.error("[handleSubscriptionDeleted] Error updating failed payment:", updateError.message);
      continue;
    }

    // Cancel any scheduled recovery attempts
    const { error: cancelError } = await supabase
      .from("recovery_attempts")
      .update({
        status: "cancelled",
        completed_at: new Date().toISOString(),
        result: "Subscription cancelled - customer churned",
      })
      .eq("failed_payment_id", failedPayment.id)
      .eq("status", "scheduled");

    if (cancelError) {
      console.error("[handleSubscriptionDeleted] Error cancelling recovery attempts:", cancelError.message);
    }

    console.log("[handleSubscriptionDeleted] Marked failed payment as abandoned:", failedPayment.id);
  }
}
