import { createClient } from "@supabase/supabase-js";

/**
 * Admin client — uses Service Role Key.
 * ONLY use in server-side API routes, never expose to browser.
 * Bypasses RLS. Use with caution.
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
