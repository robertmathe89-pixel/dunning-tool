import { getDefaultEmailConfig, sendEmail } from "./src/lib/email/service";

// Load from local env for testing


async function testEmail() {
  console.log("Testing Gmail SMTP connection...");

  const config = getDefaultEmailConfig();
  // For local testing, ensure env is loaded
  if (!config.pass && process.env.GMAIL_APP_PASSWORD) {
    (config as any).pass = process.env.GMAIL_APP_PASSWORD;
  }
  console.log("Config:", { ...config, pass: config.pass ? "[SET]" : "[MISSING]" });

  if (!config.pass) {
    console.error("❌ GMAIL_APP_PASSWORD not set — trying direct value");
    // Fallback for local testing only
    (config as any).pass = process.env.GMAIL_APP_PASSWORD || "";
  }

  if (!config.pass) {
    console.error("❌ Still no password. Set GMAIL_APP_PASSWORD env var.");
    process.exit(1);
  }

  try {
    const result = await sendEmail(config, {
      to: "ai.studioprojects2025@gmail.com",
      subject: "Dunning Tool — Email Test",
      html: "<p>Hey Robert,</p><p>This is a test email from the Dunning Tool. If you're reading this, the SMTP connection works!</p><p>— Pitiu 🦅</p>",
      text: "Hey Robert,\n\nThis is a test email from the Dunning Tool. If you're reading this, the SMTP connection works!\n\n— Pitiu",
    });

    if (result.success) {
      console.log("✅ Email sent! Message ID:", result.messageId);
    } else {
      console.error("❌ Failed:", result.error);
      process.exit(1);
    }
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
}

testEmail();
