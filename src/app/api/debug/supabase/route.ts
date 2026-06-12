import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const { data: userData, error: userError } = await supabaseAdmin
      .from("user_settings")
      .select("user_id")
      .limit(1);

    const { data: failedPayments, error: fpError } = await supabaseAdmin
      .from("failed_payments")
      .select("id, stripe_customer_id, stripe_invoice_id, customer_email, amount, currency, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    const { data: recoveryAttempts, error: raError } = await supabaseAdmin
      .from("recovery_attempts")
      .select("id, status, attempt_number, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    return NextResponse.json(
      {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 20) + "...",
        serviceKeyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 10) + "...",
        serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length,
        userSettings: { data: userData, error: userError?.message || null },
        failedPayments: { data: failedPayments, error: fpError?.message || null },
        recoveryAttempts: { data: recoveryAttempts, error: raError?.message || null },
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        error: err?.message,
        stack: err?.stack,
      },
      { status: 500 }
    );
  }
}
