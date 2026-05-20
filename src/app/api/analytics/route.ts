import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") ?? "30", 10);

  if (days < 1 || days > 365) {
    return NextResponse.json(
      { error: "Invalid days parameter", details: "Must be between 1 and 365" },
      { status: 400 }
    );
  }

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

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Fetch analytics aggregates
    const { data: stats, error: statsError } = await supabase
      .from("failed_payments")
      .select("status, amount, currency")
      .eq("user_id", user.id)
      .gte("created_at", since);

    if (statsError) {
      console.error("[API] Analytics fetch error:", statsError);
      return NextResponse.json(
        { error: "Database error", details: statsError.message },
        { status: 500 }
      );
    }

    const total = stats?.length ?? 0;
    const recovered =
      stats?.filter((r) => r.status === "recovered").length ?? 0;
    const churned =
      stats?.filter((r) => r.status === "churned").length ?? 0;
    const active =
      stats?.filter((r) => r.status === "active").length ?? 0;

    // Sum revenue recovered (recovered payments)
    const revenueRecovered = stats
      ?.filter((r) => r.status === "recovered")
      .reduce((sum, r) => sum + (r.amount ?? 0), 0) ?? 0;

    // Sum churn prevented = recovered + active (still attempting)
    const churnPrevented = stats
      ?.filter((r) => r.status === "recovered" || r.status === "active")
      .reduce((sum, r) => sum + (r.amount ?? 0), 0) ?? 0;

    // Potential revenue at risk (active only)
    const revenueAtRisk = stats
      ?.filter((r) => r.status === "active")
      .reduce((sum, r) => sum + (r.amount ?? 0), 0) ?? 0;

    const recoveryRate = total > 0 ? Math.round((recovered / total) * 1000) / 10 : 0;

    // Recovery attempts stats
    const { data: attempts, error: attemptsError } = await supabase
      .from("recovery_attempts")
      .select("status, failed_payment_id, failed_payments!inner(user_id)")
      .eq("failed_payments.user_id", user.id)
      .gte("created_at", since);

    if (attemptsError) {
      console.error("[API] Analytics attempts error:", attemptsError);
    }

    const totalAttempts = attempts?.length ?? 0;
    const sentAttempts =
      attempts?.filter((a) => a.status === "sent" || a.status === "delivered").length ?? 0;
    const emailOpenRate = totalAttempts > 0 ? Math.round((sentAttempts / totalAttempts) * 1000) / 10 : 0;

    return NextResponse.json(
      {
        periodDays: days,
        summary: {
          totalFailedPayments: total,
          recovered,
          churned,
          active,
          recoveryRate,
          revenueRecovered,
          churnPrevented,
          revenueAtRisk,
          totalRecoveryAttempts: totalAttempts,
          emailsSent: sentAttempts,
          emailOpenRate,
        },
        currency: stats?.[0]?.currency ?? "usd",
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[API] GET /analytics error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err?.message },
      { status: 500 }
    );
  }
}
