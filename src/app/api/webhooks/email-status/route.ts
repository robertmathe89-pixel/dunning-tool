import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/webhooks/email-status
 * 
 * Receive email event webhooks from email providers (SendGrid, Postmark, etc.)
 * and update email_logs with open/click/bounce/delivery events.
 * 
 * Expected payload varies by provider. This handles a generic format.
 */

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    const payload = await request.json();

    // Support multiple webhook formats
    const events = Array.isArray(payload) ? payload : [payload];

    const results = {
      processed: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const event of events) {
      try {
        // Extract common fields (provider-specific mapping)
        const messageId = event.messageId || event.MessageID || event["message-id"];
        const eventType = mapEventType(event.event || event.Event || event.type);
        const recipient = event.email || event.recipient || event.Email;
        const timestamp = event.timestamp
          ? new Date(event.timestamp * 1000).toISOString()
          : new Date().toISOString();
        const reason = event.reason || event.response || event.bounce_reason;

        if (!messageId || !eventType) {
          results.failed++;
          results.errors.push(`Missing messageId or eventType: ${JSON.stringify(event)}`);
          continue;
        }

        // Find the recovery_attempt by message_id
        const { data: attempt, error: findError } = await supabase
          .from("recovery_attempts")
          .select("id, failed_payment_id")
          .eq("message_id", messageId)
          .single();

        if (findError || !attempt) {
          results.failed++;
          results.errors.push(`Recovery attempt not found for messageId: ${messageId}`);
          continue;
        }

        // Log the event
        const { error: logError } = await supabase.from("email_logs").insert({
          recovery_attempt_id: attempt.id,
          failed_payment_id: attempt.failed_payment_id,
          event_type: eventType,
          recipient: recipient || "unknown",
          message_id: messageId,
          metadata: { reason, raw_event: event },
          created_at: timestamp,
        });

        if (logError) {
          throw new Error(`Failed to log event: ${logError.message}`);
        }

        // Update recovery_attempt status for certain events
        if (eventType === "bounced" || eventType === "dropped") {
          await supabase
            .from("recovery_attempts")
            .update({
              status: "failed",
              error_message: reason || "Email bounced",
              updated_at: new Date().toISOString(),
            })
            .eq("id", attempt.id);
        }

        results.processed++;
      } catch (err: any) {
        results.failed++;
        results.errors.push(err.message);
      }
    }

    return NextResponse.json({
      message: "Email events processed",
      results,
    });

  } catch (err: any) {
    console.error("[email-status] Error:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

/**
 * Map provider-specific event names to our standard types.
 */
function mapEventType(event: string): string | null {
  const mapping: Record<string, string> = {
    // SendGrid
    sg_delivered: "delivered",
    sg_open: "opened",
    sg_click: "clicked",
    sg_bounce: "bounced",
    sg_deferred: "deferred",
    sg_dropped: "dropped",
    sg_spamreport: "spam_reported",
    // Postmark
    pm_Delivery: "delivered",
    pm_Open: "opened",
    pm_Click: "clicked",
    pm_Bounce: "bounced",
    pm_SpamComplaint: "spam_reported",
    // Generic
    sent: "sent",
    delivered: "delivered",
    opened: "opened",
    clicked: "clicked",
    bounced: "bounced",
    failed: "failed",
    complained: "spam_reported",
  };

  return mapping[event] || event;
}
