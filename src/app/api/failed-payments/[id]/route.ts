import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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
      .from("failed_payments")
      .select("*, recovery_attempts(*)")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("[API] GET /failed-payments/[id] error:", error);
      return NextResponse.json(
        { error: "Database error", details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Failed payment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (err: any) {
    console.error("[API] GET /failed-payments/[id] uncaught error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err?.message },
      { status: 500 }
    );
  }
}

const ALLOWED_STATUSES = ["active", "recovered", "churned", "paused"] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { status, failure_reason, next_recovery_at } = body;

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

    // Validate status if provided
    if (status && !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        {
          error: "Invalid status",
          details: `Must be one of: ${ALLOWED_STATUSES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Verify ownership before update (admin client for extra safety)
    const { data: existing } = await supabaseAdmin
      .from("failed_payments")
      .select("user_id")
      .eq("id", id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json(
        { error: "Failed payment not found" },
        { status: 404 }
      );
    }

    if (existing.user_id !== user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const updates: Record<string, any> = {};
    if (status) updates.status = status;
    if (failure_reason !== undefined) updates.failure_reason = failure_reason;
    if (next_recovery_at !== undefined) updates.next_recovery_at = next_recovery_at;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("failed_payments")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[API] PATCH /failed-payments/[id] error:", error);
      return NextResponse.json(
        { error: "Database error", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (err: any) {
    console.error("[API] PATCH /failed-payments/[id] uncaught error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err?.message },
      { status: 500 }
    );
  }
}
