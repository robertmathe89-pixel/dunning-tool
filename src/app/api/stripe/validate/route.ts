import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import Stripe from "stripe";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json(
        { error: "Missing API key", details: "Provide a Stripe Standard API key" },
        { status: 400 }
      );
    }

    // Basic format check
    if (!apiKey.startsWith("sk_")) {
      return NextResponse.json(
        { error: "Invalid key format", details: "Stripe secret keys start with 'sk_'" },
        { status: 400 }
      );
    }

    // Try to instantiate Stripe and make a lightweight API call
    const testStripe = new Stripe(apiKey, {
      apiVersion: "2025-04-30.basil",
    });

    let account: Stripe.Account;
    try {
      account = await testStripe.accounts.retrieve();
    } catch (stripeErr: any) {
      console.error("[API] Stripe key validation failed:", stripeErr.message);
      return NextResponse.json(
        {
          error: "Invalid API key",
          details: stripeErr.message,
          valid: false,
        },
        { status: 400 }
      );
    }

    // Key is valid — persist it (upsert into user_settings)
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

    const { error: upsertError } = await supabaseAdmin
      .from("user_settings")
      .upsert(
        {
          user_id: user.id,
          stripe_secret_key: apiKey,
          stripe_key_valid: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (upsertError) {
      console.error("[API] Failed to save Stripe key:", upsertError);
      return NextResponse.json(
        { error: "Database error", details: upsertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        valid: true,
        accountId: account.id,
        accountEmail: account.email ?? null,
        businessName: account.business_profile?.name ?? null,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[API] POST /stripe/validate uncaught error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err?.message },
      { status: 500 }
    );
  }
}
