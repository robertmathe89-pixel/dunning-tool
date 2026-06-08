import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("user_settings")
      .select("user_id")
      .limit(1);

    return NextResponse.json(
      {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 20) + "...",
        serviceKeyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 10) + "...",
        serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length,
        queryError: error?.message || null,
        queryData: data,
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
