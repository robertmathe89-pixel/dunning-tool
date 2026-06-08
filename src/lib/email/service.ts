import nodemailer from "nodemailer";
import { createClient } from "@/lib/supabase/server";

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

/**
 * Default Gmail fallback config (for testing / default sending).
 */
export function getDefaultEmailConfig(): EmailConfig {
  return {
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    user: "ai.studioprojects2025@gmail.com",
    pass: process.env.GMAIL_APP_PASSWORD || "",
    fromEmail: "ai.studioprojects2025@gmail.com",
    fromName: "Pitiu",
  };
}

/**
 * Get email configuration from user_settings table for a given user.
 * Falls back to default Gmail config if no custom SMTP is set.
 */
export async function getEmailConfig(userId: string): Promise<EmailConfig | null> {
  // For server-side usage, create a direct client
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );

  const { data, error } = await supabase
    .from("user_settings")
    .select("smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass_encrypted, sender_email, sender_name")
    .eq("user_id", userId)
    .single();

  // If no custom config found, use default Gmail fallback
  if (error || !data || !data.smtp_host || !data.smtp_user) {
    const defaultConfig = getDefaultEmailConfig();
    if (!defaultConfig.pass) {
      console.error("[getEmailConfig] No custom SMTP and no GMAIL_APP_PASSWORD env var set");
      return null;
    }
    console.log("[getEmailConfig] Using default Gmail config for user:", userId);
    return defaultConfig;
  }

  return {
    host: data.smtp_host,
    port: data.smtp_port || 587,
    secure: data.smtp_secure ?? false,
    user: data.smtp_user,
    pass: data.smtp_pass_encrypted || "", // Note: this is encrypted, needs decryption in production
    fromEmail: data.sender_email || data.smtp_user,
    fromName: data.sender_name || "Dunning Tool",
  };
}

/**
 * Create a nodemailer transporter from email config.
 */
export function createTransporter(config: EmailConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    // Connection pool settings
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
  });
}

/**
 * Send a single email using the founder's SMTP configuration.
 */
export async function sendEmail(
  config: EmailConfig,
  params: SendEmailParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const transporter = createTransporter(config);

    const result = await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      replyTo: params.replyTo,
    });

    console.log("[sendEmail] Sent:", result.messageId, "to:", params.to);

    return { success: true, messageId: result.messageId };
  } catch (err: any) {
    console.error("[sendEmail] Failed:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Load the dunning email template and personalize it.
 */
export function renderDunningEmail(params: {
  customerName: string;
  amount: number;
  currency: string;
  retryUrl: string;
  founderName: string;
  companyName?: string;
}): { html: string; text: string } {
  const { customerName, amount, currency, retryUrl, founderName, companyName } = params;

  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount / 100); // Stripe amounts are in cents

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Update Needed</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f8f9fa; padding: 24px; border-radius: 8px; margin-bottom: 24px; }
    .amount { font-size: 28px; font-weight: 700; color: #1a1a1a; margin: 16px 0; }
    .button { display: inline-block; background: #0066cc; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 16px 0; }
    .footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e5e5; font-size: 14px; color: #666; }
    .personal { font-style: italic; color: #555; }
  </style>
</head>
<body>
  <div class="header">
    <h2>Hi ${customerName},</h2>
    <p class="personal">Quick note from ${founderName}${companyName ? ` at ${companyName}` : ""} —</p>
  </div>

  <p>We tried to process your subscription payment of <strong class="amount">${formattedAmount}</strong>, but it didn't go through.</p>

  <p>This usually happens when:</p>
  <ul>
    <li>Your card expired</li>
    <li>The bank declined the charge</li>
    <li>There were insufficient funds</li>
  </ul>

  <p>No worries — your account is still active. To keep things running smoothly, could you update your payment method?</p>

  <a href="${retryUrl}" class="button">Update Payment Method</a>

  <p>If you have any questions, just reply to this email. I'm here to help.</p>

  <div class="footer">
    <p>Thanks,<br>${founderName}${companyName ? `<br>${companyName}` : ""}</p>
    <p style="font-size: 12px; color: #999;">This is an automated reminder from ${companyName || founderName}'s billing system.</p>
  </div>
</body>
</html>
  `.trim();

  const text = `
Hi ${customerName},

Quick note from ${founderName}${companyName ? ` at ${companyName}` : ""} —

We tried to process your subscription payment of ${formattedAmount}, but it didn't go through.

This usually happens when:
- Your card expired
- The bank declined the charge
- There were insufficient funds

No worries — your account is still active. To keep things running smoothly, could you update your payment method?

Update here: ${retryUrl}

If you have any questions, just reply to this email. I'm here to help.

Thanks,
${founderName}${companyName ? `\n${companyName}` : ""}
  `.trim();

  return { html, text };
}
