import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
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

    const { data, error } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("[API] GET /settings error:", error);
      return NextResponse.json(
        { error: "Database error", details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      // Return defaults if no settings row exists yet
      return NextResponse.json(
        {
          data: {
            user_id: user.id,
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
    }

    // Strip sensitive fields from the response
    const { stripe_secret_key, stripe_webhook_secret, ...safeData } = data;

    return NextResponse.json({ data: safeData }, { status: 200 });
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
] as const;

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

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
          user_id: user.id,
          ...updates,
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (error) {
      console.error("[API] PATCH /settings error:", error);
      return NextResponse.json(
        { error: "Database error", details: error.message },
        { status: 500 }
      );
    }

    // Strip sensitive fields from response
    const { stripe_secret_key, stripe_webhook_secret, ...safeData } = data;

    return NextResponse.json({ data: safeData }, { status: 200 });
  } catch (err: any) {
    console.error("[API] PATCH /settings uncaught error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err?.message },
      { status: 500 }
    );
  }
}
