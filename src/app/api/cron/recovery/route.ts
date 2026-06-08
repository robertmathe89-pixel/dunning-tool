import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getEmailConfig, sendEmail, renderDunningEmail } from "@/lib/email";

/**
 * Vercel Cron Job: Recovery Email Sender
 * 
 * Runs daily at 10:00 AM to check for scheduled recovery emails
 * and sends them using the user's SMTP configuration.
 * 
 * Schedule: 0 10 * * * (daily at 10:00 AM)
 */

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const cronSecret = request.headers.get("x-vercel-cron-secret");
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );

  const results = {
    checked: 0,
    sent: 0,
    failed: 0,
    errors: [] as string[],
  };

  try {
    // 1. Find all recovery attempts that are due
    const { data: attempts, error: fetchError } = await supabase
      .from("recovery_attempts")
      .select(`
        id,
        failed_payment_id,
        attempt_number,
        scheduled_at,
        status,
        failed_payments!inner(
          id,
          customer_email,
          customer_name,
          amount,
          currency,
          user_id,
          retry_url
        )
      `)
      .eq("status", "scheduled")
      .lte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(50);

    if (fetchError) {
      throw new Error(`Failed to fetch recovery attempts: ${fetchError.message}`);
    }

    if (!attempts || attempts.length === 0) {
      return NextResponse.json({
        message: "No scheduled recovery attempts found",
        results,
      });
    }

    results.checked = attempts.length;

    // 2. Group attempts by user (to load email config once per user)
    const attemptsByUser = new Map<string, any[]>();
    for (const attempt of attempts) {
      // failed_payments is returned as an array due to the join
      const payment = Array.isArray(attempt.failed_payments) 
        ? attempt.failed_payments[0] 
        : attempt.failed_payments;
      const userId = payment?.user_id;
      if (!userId) continue;
      
      if (!attemptsByUser.has(userId)) {
        attemptsByUser.set(userId, []);
      }
      attemptsByUser.get(userId)!.push({ ...attempt, payment });
    }

    // 3. Process each user's attempts
    for (const [userId, userAttempts] of attemptsByUser) {
      // Load email config for this user
      const emailConfig = await getEmailConfig(userId);
      
      if (!emailConfig) {
        const error = `No email config for user ${userId}`;
        console.error(`[cron/recovery] ${error}`);
        results.errors.push(error);
        results.failed += userAttempts.length;
        
        // Mark these as failed
        for (const attempt of userAttempts) {
          await supabase
            .from("recovery_attempts")
            .update({
              status: "failed",
              sent_at: new Date().toISOString(),
              error_message: "SMTP configuration missing",
            })
            .eq("id", attempt.id);
        }
        continue;
      }

      // Get user info for personalization
      const { data: user } = await supabase
        .from("user_settings")
        .select("sender_name, company_name")
        .eq("user_id", userId)
        .single();

      // Send each email
      for (const attempt of userAttempts) {
        const payment = attempt.payment;
        
        try {
          // Render email
          const { html, text } = renderDunningEmail({
            customerName: payment.customer_name || "there",
            amount: payment.amount,
            currency: payment.currency,
            retryUrl: payment.retry_url || "#",
            founderName: user?.sender_name || "The Team",
            companyName: user?.company_name || undefined,
          });

          // Send email
          const sendResult = await sendEmail(emailConfig, {
            to: payment.customer_email,
            subject: "Quick update needed for your subscription",
            html,
            text,
          });

          if (sendResult.success) {
            // Mark as sent
            await supabase
              .from("recovery_attempts")
              .update({
                status: "sent",
                sent_at: new Date().toISOString(),
                message_id: sendResult.messageId,
              })
              .eq("id", attempt.id);

            // Log to email_logs
            await supabase.from("email_logs").insert({
              recovery_attempt_id: attempt.id,
              event_type: "sent",
              recipient: payment.customer_email,
              message_id: sendResult.messageId,
              created_at: new Date().toISOString(),
            });

            results.sent++;
          } else {
            throw new Error(sendResult.error || "Unknown send error");
          }
        } catch (err: any) {
          const error = `Failed to send attempt ${attempt.id}: ${err.message}`;
          console.error(`[cron/recovery] ${error}`);
          results.errors.push(error);
          results.failed++;

          // Mark as failed
          await supabase
            .from("recovery_attempts")
            .update({
              status: "failed",
              sent_at: new Date().toISOString(),
              error_message: err.message,
            })
            .eq("id", attempt.id);
        }
      }
    }

    return NextResponse.json({
      message: "Recovery email processing complete",
      results,
    });

  } catch (err: any) {
    console.error("[cron/recovery] Fatal error:", err);
    return NextResponse.json(
      { error: err.message, results },
      { status: 500 }
    );
  }
}
