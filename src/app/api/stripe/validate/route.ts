import { NextResponse } from "next/server";
import { createRouteClient, getUserIdFromRequest } from "@/lib/supabase/server";
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
    const testStripe = new Stripe(apiKey);

    let account: Stripe.Account;
    try {
      // Retrieve the account using the key itself (no args needed for secret key)
      account = await testStripe.accounts.retrieve("self");
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
    const { supabase, applyCookies } = await createRouteClient();
    const { userId, response: cachedResponse } = await getUserIdFromRequest(
      request,
      supabase,
      applyCookies
    );

    if (!userId) {
      const response = NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
      if (cachedResponse) {
        cachedResponse.cookies.getAll().forEach((cookie: any) => {
          response.cookies.set(cookie.name, cookie.value, cookie);
        });
      }
      return response;
    }

    const { error: upsertError } = await supabaseAdmin
      .from("user_settings")
      .upsert(
        {
          user_id: userId,
          stripe_secret_key: apiKey,
          stripe_key_valid: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (upsertError) {
      console.error("[API] Failed to save Stripe key:", upsertError);
      const response = NextResponse.json(
        { error: "Database error", details: upsertError.message },
        { status: 500 }
      );
      applyCookies(response);
      return response;
    }

    const response = NextResponse.json(
      {
        valid: true,
        accountId: account.id,
        accountEmail: account.email ?? null,
        businessName: account.business_profile?.name ?? null,
      },
      { status: 200 }
    );
    applyCookies(response);
    return response;
  } catch (err: any) {
    console.error("[API] POST /stripe/validate uncaught error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err?.message },
      { status: 500 }
    );
  }
}
