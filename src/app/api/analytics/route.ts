import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30", 10);

import { NextResponse } from "next/server";
import { createRouteClient, getUserIdFromRequest } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30", 10);

    // Create Supabase client with cookie refresh support
    const { supabase, applyCookies } = await createRouteClient();

    // Use cached session check to avoid rate limit races with concurrent API calls
    const { userId, response: cachedResponse } = await getUserIdFromRequest(request, supabase, applyCookies);

    if (!userId) {
      const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      if (cachedResponse) {
        // Copy any refreshed cookies from the cached response
        cachedResponse.cookies.getAll().forEach((cookie) => {
          response.cookies.set(cookie.name, cookie.value, cookie);
        });
      }
      return response;
    }

    // Recovery rate: recovered / total
    const { data: allPayments, error: allError } = await supabaseAdmin
      .from("failed_payments")
      .select("status")
      .eq("user_id", userId)
      .gte("created_at", new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

    if (allError) {
      console.error("[API] GET /analytics error:", allError);
      const response = NextResponse.json(
        { error: "Database error" },
        { status: 500 }
      );
      applyCookies(response);
      return response;
    }

    const totalFailed = allPayments?.length ?? 0;
    const recoveredCount = allPayments?.filter((p) => p.status === "recovered").length ?? 0;
    const recoveryRate = totalFailed > 0 ? (recoveredCount / totalFailed) * 100 : 0;

    // Revenue recovered
    const { data: recoveredPayments, error: revError } = await supabaseAdmin
      .from("failed_payments")
      .select("amount")
      .eq("user_id", userId)
      .eq("status", "recovered")
      .gte("created_at", new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

    if (revError) {
      console.error("[API] GET /analytics revenue error:", revError);
    }

    const revenueRecovered =
      recoveredPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) ?? 0;

    // Churn prevented = recovered count (each recovered = churn prevented)
    const churnPrevented = recoveredCount;

    const response = NextResponse.json(
      {
        data: {
          recoveryRate,
          revenueRecovered,
          churnPrevented,
          totalFailed,
          recoveredCount,
        },
      },
      { status: 200 }
    );
    applyCookies(response);
    return response;
  } catch (err: any) {
    console.error("[API] GET /analytics uncaught error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err?.message },
      { status: 500 }
    );
  }
}
