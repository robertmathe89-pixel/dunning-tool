import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Creates a Supabase server client for use in Route Handlers (API routes).
 * 
 * IMPORTANT: This client uses getSession() which auto-refreshes expired tokens.
 * The refreshed cookies are collected and must be applied to your NextResponse.
 * 
 * Example:
 *   const { supabase, applyCookies } = createRouteClient();
 *   const { data: { session } } = await supabase.auth.getSession();
 *   // ... do work ...
 *   const response = NextResponse.json({ ... });
 *   applyCookies(response); // <-- REQUIRED for cookie refresh to work!
 *   return response;
 */
export function createRouteClient() {
  const cookieStore = cookies();
  const cookieList = cookieStore.getAll();
  
  // Collect cookies that need to be set (from token refresh)
  const cookiesToSet: Array<{ name: string; value: string; options?: any }> = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieList;
        },
        setAll(newCookies) {
          newCookies.forEach(({ name, value, options }) => {
            cookiesToSet.push({ name, value, options });
          });
        },
      },
    }
  );

  // Apply collected cookies to a NextResponse
  // We copy what Supabase SSR gives us without modifying options
  const applyCookies = (response: any) => {
    cookiesToSet.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });
  };

  return { supabase, applyCookies };
}

/**
 * Simple read-only server client.
 * Use when you don't need token refresh (e.g., admin operations with service role).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Read-only
        },
      },
    }
  );
}
