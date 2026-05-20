import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.json(
      { error: "Missing authorization code" },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[AUTH] Code exchange failed:", error.message);
      return NextResponse.json(
        { error: "Authentication failed", details: error.message },
        { status: 401 }
      );
    }

    console.log("[AUTH] OAuth/magic link callback successful, redirecting to", next);
    return NextResponse.redirect(`${origin}${next}`);
  } catch (err: any) {
    console.error("[AUTH] Callback error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err?.message },
      { status: 500 }
    );
  }
}
