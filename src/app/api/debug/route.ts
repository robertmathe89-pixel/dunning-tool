import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { supabase, applyCookies } = await createRouteClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    // Read raw cookies from the request headers
    const cookieHeader = request.headers.get("cookie") || "";
    const cookieNames = cookieHeader
      .split(";")
      .map((c) => c.trim().split("=")[0])
      .filter(Boolean);

    const response = NextResponse.json({
      hasSession: !!session,
      hasUser: !!user,
      sessionError: sessionError?.message || null,
      userError: userError?.message || null,
      userId: user?.id || null,
      cookieCount: cookieNames.length,
      cookieNames: cookieNames,
      rawCookieHeader: cookieHeader.slice(0, 500),
    });
    applyCookies(response);
    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
