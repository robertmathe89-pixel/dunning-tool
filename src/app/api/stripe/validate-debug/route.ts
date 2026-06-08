import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json(
        { stage: "input", error: "Missing API key" },
        { status: 400 }
      );
    }

    if (!apiKey.startsWith("sk_")) {
      return NextResponse.json(
        { stage: "format", error: "Invalid format", prefix: apiKey.substring(0, 10) },
        { status: 400 }
      );
    }

    // Try Stripe init
    let testStripe: Stripe;
    try {
      testStripe = new Stripe(apiKey, { apiVersion: "2026-04-22.dahlia" });
    } catch (initErr: any) {
      return NextResponse.json(
        { stage: "init", error: initErr.message },
        { status: 400 }
      );
    }

    // Try Stripe API call
    try {
      const account = await testStripe.accounts.retrieve("self");
      return NextResponse.json(
        {
          stage: "success",
          accountId: account.id,
          businessName: account.business_profile?.name ?? null,
        },
        { status: 200 }
      );
    } catch (stripeErr: any) {
      return NextResponse.json(
        {
          stage: "stripe_api",
          error: stripeErr.message,
          code: stripeErr.code,
          type: stripeErr.type,
        },
        { status: 400 }
      );
    }
  } catch (err: any) {
    return NextResponse.json(
      { stage: "uncaught", error: err?.message },
      { status: 500 }
    );
  }
}
