import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { emailTemplate = "default", customMessage } = body;

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch the failed payment with ownership check
    const { data: failedPayment, error: fetchError } = await supabase
      .from("failed_payments")
      .select("*, user_settings!inner(stripe_customer_id, recovery_email_from, recovery_email_reply_to)")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError) {
      console.error("[API] POST /send-email fetch error:", fetchError);
      return NextResponse.json(
        { error: "Database error", details: fetchError.message },
        { status: 500 }
      );
    }

    if (!failedPayment) {
      return NextResponse.json(
        { error: "Failed payment not found" },
        { status: 404 }
      );
    }

    // Get the latest attempt number
    const { data: lastAttempt } = await supabaseAdmin
      .from("recovery_attempts")
      .select("attempt_number")
      .eq("failed_payment_id", id)
      .order("attempt_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextAttemptNumber = (lastAttempt?.attempt_number ?? 0) + 1;

    // Create a recovery attempt record
    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from("recovery_attempts")
      .insert({
        failed_payment_id: id,
        attempt_number: nextAttemptNumber,
        status: "pending",
        scheduled_at: new Date().toISOString(),
        email_template: emailTemplate,
        custom_message: customMessage ?? null,
      })
      .select()
      .single();

    if (attemptError) {
      console.error("[API] POST /send-email attempt insert error:", attemptError);
      return NextResponse.json(
        { error: "Failed to create recovery attempt", details: attemptError.message },
        { status: 500 }
      );
    }

    console.log(
      `[API] Manual recovery attempt #${nextAttemptNumber} queued for failed_payment ${id}`
    );

    return NextResponse.json(
      {
        message: "Recovery email queued",
        attemptId: attempt.id,
        attemptNumber: nextAttemptNumber,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[API] POST /send-email uncaught error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err?.message },
      { status: 500 }
    );
  }
}
