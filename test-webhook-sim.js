const { createClient } = require("@supabase/supabase-js");
const { getEmailConfig, sendEmail, renderDunningEmail } = require("./src/lib/email/service");

const supabaseUrl = "https://nxuiragfxjyjrcmizijj.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

console.log("Supabase URL:", supabaseUrl);
console.log("Service Key present:", supabaseServiceKey ? "YES (length: " + supabaseServiceKey.length + ")" : "NO");

if (!supabaseServiceKey) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY not set");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function simulateWebhook() {
  console.log("🧪 Simulating invoice.payment_failed webhook...\n");

  const testFounderId = "test-founder-001";
  
  const { data: existing } = await supabase
    .from("user_settings")
    .select("founder_id")
    .eq("founder_id", testFounderId)
    .single();

  if (!existing) {
    await supabase.from("user_settings").insert({
      founder_id: testFounderId,
      sender_name: "Robert",
      company_name: "Test Company",
    });
    console.log("✅ Created test founder");
  }

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .insert({
      founder_id: testFounderId,
      stripe_customer_id: "cus_test_123",
      email: "ai.studioprojects2025@gmail.com",
      name: "Test Customer",
      status: "active",
    })
    .select()
    .single();

  if (customerError) {
    console.error("❌ Failed to create customer:", customerError.message);
    return;
  }
  console.log("✅ Created test customer:", customer.id);

  const mockInvoice = {
    amount_due: 2900,
    currency: "usd",
    hosted_invoice_url: "https://stripe.com/test-invoice",
  };

  const customerName = customer.name || "there";
  const customerEmail = customer.email;
  const amountDue = mockInvoice.amount_due;
  const currency = mockInvoice.currency;

  const emailConfig = await getEmailConfig(testFounderId);
  if (!emailConfig) {
    console.error("❌ No email config available");
    return;
  }
  console.log("✅ Email config loaded (fallback:", emailConfig.fromEmail, ")");

  const { html, text } = renderDunningEmail({
    customerName,
    amount: amountDue,
    currency: currency.toUpperCase(),
    retryUrl: mockInvoice.hosted_invoice_url,
    founderName: "Robert",
    companyName: "Test Company",
  });

  const result = await sendEmail(emailConfig, {
    to: customerEmail,
    subject: `Payment update needed — Test Company`,
    html,
    text,
  });

  if (result.success) {
    await supabase.from("recovery_attempts").insert({
      customer_id: customer.id,
      attempt_no: 1,
      message_id: result.messageId,
      event_type: "invoice.payment_failed",
      stripe_event_id: "evt_test_simulated",
    });

    console.log("\n🎉 SUCCESS! Dunning email sent!");
    console.log("   Message ID:", result.messageId);
    console.log("   To:", customerEmail);
    console.log("   Amount:", "$29.00");
  } else {
    console.error("\n❌ Failed to send email:", result.error);
  }

  console.log("\n🧹 Cleaning up test data...");
  await supabase.from("recovery_attempts").delete().eq("stripe_event_id", "evt_test_simulated");
  await supabase.from("customers").delete().eq("id", customer.id);
  await supabase.from("user_settings").delete().eq("founder_id", testFounderId);
  console.log("✅ Cleanup complete");
}

simulateWebhook().catch(console.error);
