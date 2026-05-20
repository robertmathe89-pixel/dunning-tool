import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail, logEmailSent } from "@/lib/email";
import {
  email1Initial,
  email2Reminder,
  email3Urgency,
  email4Final,
} from "@/lib/email/templates";

const TEMPLATES = [email1Initial, email2Reminder, email3Urgency, email4Final];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { psNote, tone = "friendly" } = body;

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the failed payment with owner check
    const { data: failedPayment, error: fetchError } = await supabase
      .from("failed_payments")
      .select("*")
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

    // Fetch user settings (sender name, email, SMTP config)
    const { data: settings, error: settingsError } = await supabase
      .from("user_settings")
      .select("company_name, sender_name, sender_email, smtp_host, smtp_port, smtp_user, smtp_pass")
      .eq("user_id", user.id)
      .maybeSingle();

    if (settingsError) {
      console.error("[API] POST /send-email settings error:", settingsError);
    }

    // Get the latest attempt number
    const { data: lastAttempt } = await supabaseAdmin
      .from("recovery_attempts")
      .select("attempt_number")
      .eq("failed_payment_id", id)
      .order("attempt_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const attemptNumber = (lastAttempt?.attempt_number ?? 0) + 1;

    // Pick template based on attempt number (or cap at last)
    const templateFn = TEMPLATES[Math.min(attemptNumber - 1, TEMPLATES.length - 1)];
    if (!templateFn) {
      return NextResponse.json(
        { error: "No template available for this attempt" },
        { status: 400 }
      );
    }

    // Generate email content
    const customerName = failedPayment.customer_name || failedPayment.customer_email?.split("@")[0] || "there";
    const companyName = settings?.company_name || "Your Product";
    const founderName = settings?.sender_name || "Founder";
    const updateLink = `${process.env.NEXT_PUBLIC_APP_URL || "https://dunning-tool.vercel.app"}/pay?pi=${failedPayment.stripe_payment_intent_id}`;

    const { subject, body: emailBody } = templateFn(
      customerName,
      companyName,
      companyName,
      updateLink,
      founderName,
      attemptNumber === 2 ? 3 : attemptNumber === 3 ? 7 : attemptNumber === 4 ? 14 : 1
    );

    // Append P.S. note if provided
    const finalBody = psNote ? `${emailBody}\n\nP.S. ${psNote}` : emailBody;

    // Send the email
    const from = settings?.sender_email || process.env.SMTP_USER || "noreply@dunning-tool.vercel.app";

    let sendResult;
    try {
      const info = await sendEmail(
        failedPayment.customer_email,
        subject,
        finalBody,
        from
      );
      sendResult = { success: true, info };
    } catch (sendErr: any) {
      sendResult = { success: false, error: sendErr.message };
    }

    if (!sendResult.success) {
      console.error("[API] POST /send-email send failed:", sendResult.error);

      // Log failed attempt
      await supabaseAdmin.from("recovery_attempts").insert({
        user_id: user.id,
        failed_payment_id: id,
        attempt_number: attemptNumber,
        status: "failed",
        scheduled_at: new Date().toISOString(),
        sent_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        email_subject: subject,
        email_body: finalBody,
        result: "failed",
        error_message: sendResult.error || "Unknown send error",
      });

      return NextResponse.json(
        { error: "Failed to send email", details: sendResult.error },
        { status: 500 }
      );
    }

    // Log successful attempt
    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from("recovery_attempts")
      .insert({
        user_id: user.id,
        failed_payment_id: id,
        attempt_number: attemptNumber,
        status: "sent",
        scheduled_at: new Date().toISOString(),
        sent_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        email_subject: subject,
        email_body: finalBody,
        result: "success",
      })
      .select()
      .single();

    if (attemptError) {
      console.error("[API] POST /send-email attempt insert error:", attemptError);
      // Email sent but DB record failed — not critical, just log
    }

    // Also log to email_logs for analytics
    await logEmailSent(id, templateFn.name, subject);

    console.log(
      `[API] Recovery attempt #${attemptNumber} sent for failed_payment ${id} to ${failedPayment.customer_email}`
    );

    return NextResponse.json(
      {
        message: "Recovery email sent",
        attemptId: attempt?.id,
        attemptNumber,
        recipient: failedPayment.customer_email,
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
