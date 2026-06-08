import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";

/**
 * POST /api/failed-payments/[id]/abandon
 * 
 * Mark a failed payment as abandoned (churned).
 * - Updates failed_payments.status → "abandoned"
 * - Cancels any pending recovery attempts
 * - Logs the action
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { supabase, applyCookies } = await createRouteClient();

  try {
    // Get current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Verify the payment belongs to this founder
    const { data: payment, error: paymentError } = await supabase
      .from("failed_payments")
      .select("id, founder_id, status")
      .eq("id", id)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (payment.founder_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update payment status
    const { error: updateError } = await supabase
      .from("failed_payments")
      .update({
        status: "abandoned",
        abandoned_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      throw new Error(`Failed to update payment: ${updateError.message}`);
    }

    // Cancel any pending recovery attempts
    const { error: cancelError } = await supabase
      .from("recovery_attempts")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("failed_payment_id", id)
      .eq("status", "scheduled");

    if (cancelError) {
      console.error("[abandon] Failed to cancel pending attempts:", cancelError);
    }

    // Log the action
    await supabase.from("email_logs").insert({
      failed_payment_id: id,
      event_type: "manual_abandoned",
      recipient: "system",
      created_at: new Date().toISOString(),
    });

    const response = NextResponse.json({
      success: true,
      message: "Payment marked as abandoned",
      paymentId: id,
    });

    applyCookies(response);
    return response;

  } catch (err: any) {
    console.error("[abandon] Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
