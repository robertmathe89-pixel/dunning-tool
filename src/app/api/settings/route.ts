import { NextResponse } from "next/server";
import { createRouteClient, getUserIdFromRequest } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
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

    const { data, error } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("[API] GET /settings error:", error);
      const response = NextResponse.json(
        { error: "Database error", details: error.message },
        { status: 500 }
      );
      applyCookies(response);
      return response;
    }

    if (!data) {
      // Return defaults if no settings row exists yet
      const response = NextResponse.json(
        {
          data: {
            user_id: userId,
            stripe_key_valid: false,
            recovery_email_from: null,
            recovery_email_reply_to: null,
            auto_recovery_enabled: true,
            recovery_delay_hours: 6,
            max_recovery_attempts: 3,
            created_at: null,
            updated_at: null,
          },
        },
        { status: 200 }
      );
      applyCookies(response);
      return response;
    }

    // Strip sensitive fields from the response
    const { stripe_secret_key, stripe_webhook_secret, ...safeData } = data;

    const response = NextResponse.json({ data: safeData }, { status: 200 });
    applyCookies(response);
    return response;
  } catch (err: any) {
    console.error("[API] GET /settings uncaught error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err?.message },
      { status: 500 }
    );
  }
}

const ALLOWED_SETTINGS = [
  "recovery_email_from",
  "recovery_email_reply_to",
  "auto_recovery_enabled",
  "recovery_delay_hours",
  "max_recovery_attempts",
  "sender_name",
  "company_name",
  "sender_email",
  "smtp_host",
  "smtp_port",
  "smtp_user",
  "smtp_pass",
] as const;

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

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

    // Build updates from allowed keys only
    const updates: Record<string, any> = {};
    for (const key of ALLOWED_SETTINGS) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid settings to update" },
        { status: 400 }
      );
    }

    updates.updated_at = new Date().toISOString();

    // Upsert: insert if not exists, update if exists
    const { data, error } = await supabaseAdmin
      .from("user_settings")
      .upsert(
        {
          user_id: userId,
          ...updates,
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (error) {
      console.error("[API] PATCH /settings error:", error);
      const response = NextResponse.json(
        { error: "Database error", details: error.message },
        { status: 500 }
      );
      applyCookies(response);
      return response;
    }

    // Strip sensitive fields from response
    const { stripe_secret_key, stripe_webhook_secret, ...safeData } = data;

    const response = NextResponse.json({ data: safeData }, { status: 200 });
    applyCookies(response);
    return response;
  } catch (err: any) {
    console.error("[API] PATCH /settings uncaught error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err?.message },
      { status: 500 }
    );
  }
}
