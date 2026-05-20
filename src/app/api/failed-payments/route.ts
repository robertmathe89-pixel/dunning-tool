import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type FilterStatus = "active" | "recovered" | "churned" | "all";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = (searchParams.get("status") ?? "all") as FilterStatus;
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);
  const sortBy = searchParams.get("sortBy") ?? "created_at";
  const sortOrder = searchParams.get("sortOrder") ?? "desc";

  try {
    const supabase = await createClient();

    // Authenticate user
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

    let query = supabase
      .from("failed_payments")
      .select("*, recovery_attempts(count)", { count: "exact" })
      .eq("user_id", user.id);

    if (status !== "all") {
      query = query.eq("status", status);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await query
      .order(sortBy, { ascending: sortOrder === "asc" })
      .range(from, to);

    if (error) {
      console.error("[API] Failed to fetch failed payments:", error);
      return NextResponse.json(
        { error: "Database error", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        data,
        pagination: {
          page,
          limit,
          total: count ?? 0,
          totalPages: Math.ceil((count ?? 0) / limit),
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[API] GET /failed-payments error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err?.message },
      { status: 500 }
    );
  }
}
