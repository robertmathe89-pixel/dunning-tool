import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    gmail_app_password_set: !!process.env.GMAIL_APP_PASSWORD,
    gmail_app_password_length: process.env.GMAIL_APP_PASSWORD?.length || 0,
    supabase_url_set: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabase_key_set: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    cron_secret_set: !!process.env.CRON_SECRET,
    stripe_secret_set: !!process.env.STRIPE_SECRET_KEY,
  });
}
