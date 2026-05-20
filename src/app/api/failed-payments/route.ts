import { NextResponse } from "next/server";
import { createRouteClient, getUserIdFromRequest } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";
    const limit = parseInt(searchParams.get("limit") || "50", 10);

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

    // Build query
    let query = supabase
      .from("failed_payments")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[API] GET /failed-payments error:", error);
      const response = NextResponse.json(
        { error: "Database error", details: error.message },
        { status: 500 }
      );
      applyCookies(response);
      return response;
    }

    const response = NextResponse.json({ data: data || [] }, { status: 200 });
    applyCookies(response);
    return response;
  } catch (err: any) {
    console.error("[API] GET /failed-payments uncaught error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err?.message },
      { status: 500 }
    );
  }
}
