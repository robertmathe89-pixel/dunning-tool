import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";

const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(key);
};

const getWebhookSecret = () => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }
  return secret;
};

export async function POST(request: Request) {
  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    console.error("[STRIPE] Missing signature");
    return NextResponse.json(
      { error: "Missing Stripe signature" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(body, signature, getWebhookSecret());
  } catch (err: any) {
    console.error("[STRIPE] Signature verification failed:", err.message);
    return NextResponse.json(
      { error: "Invalid signature", details: err.message },
      { status: 400 }
    );
  }

  try {
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as any;
      const paymentIntentId =
        typeof invoice.payment_intent === "string"
          ? invoice.payment_intent
          : null;
      const customerId =
        typeof invoice.customer === "string" ? invoice.customer : null;
      const subscriptionId =
        typeof invoice.subscription === "string"
          ? invoice.subscription
          : null;

      console.log("[STRIPE] invoice.payment_failed received", {
        invoiceId: invoice.id,
        customerId,
        paymentIntentId,
        amount: invoice.amount_due,
        currency: invoice.currency,
      });

      // Idempotency: check if this payment already exists
      if (paymentIntentId) {
        const { data: existing } = await supabaseAdmin
          .from("failed_payments")
          .select("id")
          .eq("stripe_payment_intent_id", paymentIntentId)
          .maybeSingle();

        if (existing) {
          console.log(
            `[STRIPE] Idempotency: payment ${paymentIntentId} already recorded (id: ${existing.id})`
          );
          return NextResponse.json(
            { message: "Already processed", id: existing.id },
            { status: 200 }
          );
        }
      }

      // Look up internal user by stripe_customer_id
      const { data: userData } = await supabaseAdmin
        .from("user_settings")
        .select("user_id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();

      const userId = userData?.user_id ?? null;

      // Create failed_payment record
      const { data: failedPayment, error: insertError } = await supabaseAdmin
        .from("failed_payments")
        .insert({
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          stripe_invoice_id: invoice.id,
          stripe_payment_intent_id: paymentIntentId,
          amount: invoice.amount_due,
          currency: invoice.currency,
          status: "active",
          failure_reason:
            invoice.last_finalization_error?.message ??
            invoice.attempt_count > 1
              ? "Payment attempt failed"
              : "Initial payment failure",
          next_recovery_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours later
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("[STRIPE] Failed to insert failed_payment:", insertError);
        return NextResponse.json(
          { error: "Database insert failed", details: insertError.message },
          { status: 500 }
        );
      }

      console.log(`[STRIPE] Created failed_payment id=${failedPayment.id}`);

      // Schedule first recovery attempt
      const { error: attemptError } = await supabaseAdmin
        .from("recovery_attempts")
        .insert({
          failed_payment_id: failedPayment.id,
          attempt_number: 1,
          status: "scheduled",
          scheduled_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
        });

      if (attemptError) {
        console.error(
          `[STRIPE] Failed to schedule recovery attempt for ${failedPayment.id}:`,
          attemptError
        );
      } else {
        console.log(
          `[STRIPE] Scheduled recovery attempt #1 for failed_payment ${failedPayment.id}`
        );
      }

      return NextResponse.json(
        { message: "Processed", id: failedPayment.id },
        { status: 200 }
      );
    }

    // Acknowledge other event types
    console.log(`[STRIPE] Received unhandled event type: ${event.type}`);
    return NextResponse.json({ message: "Ignored" }, { status: 200 });
  } catch (err: any) {
    console.error("[STRIPE] Webhook processing error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err?.message },
      { status: 500 }
    );
  }
}
