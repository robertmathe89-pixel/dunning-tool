import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

async function testStripe() {
  console.log("Testing Stripe connection...");

  try {
    // Test basic connectivity
    const balance = await stripe.balance.retrieve();
    console.log("✅ Stripe connected! Available balance:", balance.available);

    // Create a test customer
    const customer = await stripe.customers.create({
      email: "test@example.com",
      name: "Test Customer",
    });
    console.log("✅ Test customer created:", customer.id);

    // Create a test product and price
    const product = await stripe.products.create({
      name: "Test Subscription",
    });
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: 2000, // $20.00
      currency: "usd",
      recurring: { interval: "month" },
    });
    console.log("✅ Test price created:", price.id);

    // Create a subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: price.id }],
      payment_behavior: "default_incomplete",
      expand: ["latest_invoice.payment_intent"],
    });
    console.log("✅ Test subscription created:", subscription.id);

    console.log("\n🎉 All Stripe tests passed!");
    console.log("Customer ID:", customer.id);
    console.log("Subscription ID:", subscription.id);

  } catch (err: any) {
    console.error("❌ Stripe error:", err.message);
    process.exit(1);
  }
}

testStripe();
