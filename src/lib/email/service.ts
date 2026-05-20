import nodemailer, { Transporter } from "nodemailer";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Email service for the Dunning Tool.
 * Handles SMTP sending, connection validation, and Supabase logging.
 */

/** Reusable nodemailer transporter (lazy-initialized from env) */
let transporter: Transporter | null = null;

/**
 * Get or create the SMTP transporter.
 * Uses environment variables: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.
 */
function getTransporter(): Transporter {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error(
      "[EMAIL] SMTP credentials not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in environment variables."
    );
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: port === 587 ? { rejectUnauthorized: false } : undefined,
  });

  return transporter;
}

/**
 * Send an email via Nodemailer.
 *
 * @param to       Recipient email address
 * @param subject  Email subject line
 * @param body     HTML or plain-text body
 * @param from     Optional sender address (defaults to SMTP_USER)
 * @returns        Nodemailer send result
 */
export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  from?: string
): Promise<nodemailer.SentMessageInfo> {
  try {
    const transport = getTransporter();
    const sender = from || process.env.SMTP_FROM || process.env.SMTP_USER;

    if (!to || !to.includes("@")) {
      throw new Error(`[EMAIL] Invalid recipient address: ${to}`);
    }

    const info = await transport.sendMail({
      from: sender,
      to,
      subject,
      html: body,
    });

    return info;
  } catch (err: any) {
    const message = err?.message || String(err);
    if (!message.startsWith("[EMAIL]")) {
      throw new Error(`[EMAIL] Failed to send email: ${message}`);
    }
    throw err;
  }
}

/**
 * Validate SMTP credentials by attempting a connection.
 *
 * @param host SMTP host
 * @param port SMTP port
 * @param user SMTP username
 * @param pass SMTP password
 * @returns    true if connection succeeds
 */
export async function validateSmtpConfig(
  host: string,
  port: number,
  user: string,
  pass: string
): Promise<boolean> {
  try {
    const testTransporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: port === 587 ? { rejectUnauthorized: false } : undefined,
    });

    await testTransporter.verify();
    return true;
  } catch (err: any) {
    const message = err?.message || String(err);
    throw new Error(`[EMAIL] SMTP validation failed: ${message}`);
  }
}

/**
 * Log a sent email to the `email_logs` table in Supabase.
 *
 * @param failedPaymentId  ID of the failed payment record
 * @param templateName     Name of the email template used
 * @param subject          Subject line that was sent
 */
export async function logEmailSent(
  userId: string,
  failedPaymentId: string,
  templateName: string,
  subject: string,
  recipientEmail: string
): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from("email_logs").insert({
      user_id: userId,
      failed_payment_id: failedPaymentId,
      email_type: templateName,
      subject,
      recipient_email: recipientEmail,
      status: "sent",
      sent_at: new Date().toISOString(),
    });

    if (error) {
      console.error("[EMAIL] Failed to log email to Supabase:", error.message);
      // Non-fatal: don't throw, just log
    }
  } catch (err: any) {
    console.error("[EMAIL] Failed to log email:", err?.message || String(err));
    // Non-fatal: don't throw
  }
}
