import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createRouteClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
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

    // Create Supabase client with cookie refresh support
    const { supabase, applyCookies } = await createRouteClient();

    // Refresh session (this may update cookies)
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    const user = session?.user ?? null;

    if (authError || !user) {
      const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      applyCookies(response);
      return response;
    }

    // ── DEMO PAYMENT: bypass DB entirely, send test email ──
    const isDemo = id.startsWith("demo-");
    let failedPayment: any = null;

    if (isDemo) {
      const demoMap: Record<string, any> = {
        "demo-1": { customer_name: "John Smith", customer_email: "john@company.com", amount: 4900, currency: "usd", reason: "Card expired" },
        "demo-2": { customer_name: "Sarah Chen", customer_email: "sarah@startup.io", amount: 9900, currency: "usd", reason: "Insufficient funds" },
        "demo-3": { customer_name: "Mike Johnson", customer_email: "mike@tech.co", amount: 2900, currency: "usd", reason: "Card expired" },
      };
      failedPayment = demoMap[id] || demoMap["demo-1"];
      console.log("[API] Sending demo recovery email for", id);
    } else {
      const { data: fp, error: fetchError } = await supabase
        .from("failed_payments")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (fetchError) {
        console.error("[API] POST /send-email fetch error:", fetchError);
        const response = NextResponse.json(
          { error: "Database error", details: fetchError.message },
          { status: 500 }
        );
        applyCookies(response);
        return response;
      }

      if (!fp) {
        const response = NextResponse.json(
          { error: "Failed payment not found" },
          { status: 404 }
        );
        applyCookies(response);
        return response;
      }
      failedPayment = fp;
    }

    // Fetch user settings (handle missing columns gracefully)
    let settings: any = null;
    try {
      const { data: s, error: settingsError } = await supabase
        .from("user_settings")
        .select("company_name, sender_name, sender_email, smtp_host, smtp_port, smtp_user")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!settingsError) {
        settings = s;
      } else {
        console.error("[API] POST /send-email settings error:", settingsError);
      }
    } catch (e) {
      console.error("[API] POST /send-email settings fetch failed:", e);
    }

    // Get attempt number
    let attemptNumber = 1;
    if (!isDemo) {
      const { data: lastAttempt } = await supabaseAdmin
        .from("recovery_attempts")
        .select("attempt_number")
        .eq("failed_payment_id", id)
        .order("attempt_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      attemptNumber = (lastAttempt?.attempt_number ?? 0) + 1;
    }

    const templateFn = TEMPLATES[Math.min(attemptNumber - 1, TEMPLATES.length - 1)];
    if (!templateFn) {
      const response = NextResponse.json(
        { error: "No template available for this attempt" },
        { status: 400 }
      );
      applyCookies(response);
      return response;
    }

    // Generate email
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

    const finalBody = psNote ? `${emailBody}\n\nP.S. ${psNote}` : emailBody;

    // Send email
    const from = settings?.sender_email || process.env.SMTP_USER || "noreply@dunning-tool.vercel.app";

    try {
      // Use Gmail fallback config for now
      const emailConfig = {
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        user: "ai.studioprojects2025@gmail.com",
        pass: process.env.GMAIL_APP_PASSWORD || "",
        fromEmail: "ai.studioprojects2025@gmail.com",
        fromName: settings?.sender_name || "Pitiu",
      };
      await sendEmail(emailConfig, {
        to: failedPayment.customer_email,
        subject: subject,
        html: finalBody,
        text: finalBody,
      });
    } catch (sendErr: any) {
      console.error("[API] POST /send-email send failed:", sendErr.message);

      if (!isDemo) {
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
          error_message: sendErr.message || "Unknown send error",
        });
      }

      const response = NextResponse.json(
        { error: "Failed to send email", details: sendErr.message },
        { status: 500 }
      );
      applyCookies(response);
      return response;
    }

    // Log success (skip for demo)
    let attempt: any = null;
    if (!isDemo) {
      const { data: attemptData, error: attemptError } = await supabaseAdmin
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

      attempt = attemptData;

      if (attemptError) {
        console.error("[API] POST /send-email attempt insert error:", attemptError);
      }
    }

    console.log(
      `[API] Recovery attempt #${attemptNumber} sent for ${id} to ${failedPayment.customer_email}`
    );

    // Return response with refreshed cookies applied
    const response = NextResponse.json(
      {
        message: "Recovery email sent",
        attemptId: attempt?.id,
        attemptNumber,
        recipient: failedPayment.customer_email,
      },
      { status: 200 }
    );
    applyCookies(response);
    return response;
  } catch (err: any) {
    console.error("[API] POST /send-email uncaught error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err?.message },
      { status: 500 }
    );
  }
}
