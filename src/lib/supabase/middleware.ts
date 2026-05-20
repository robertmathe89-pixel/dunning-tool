import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Creates a Supabase client inside Next.js middleware.
 *
 * This helper:
 * 1. Attaches the Supabase client to the request (so it can read the session).
 * 2. Refreshes the access token if it has expired.
 * 3. Handles cookie get/set via NextRequest / NextResponse.
 *
 * Usage in middleware.ts:
 *   const { supabase, response } = updateSession(request);
 *   const { data: { user } } = await supabase.auth.getUser();
 */

export async function updateSession(request: NextRequest) {
  // Start with a plain response so we can attach modified cookies later
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        /**
         * get(name) – read a single cookie from the incoming request.
         */
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        /**
         * set(name, value, options) – write a cookie to the *outgoing* response.
         * Must use the response object created above so the browser receives it.
         */
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        /**
         * remove(name, options) – delete a cookie on the outgoing response.
         */
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // Refresh the session if needed.
  // This call touches cookies, which is why we return the modified `response`.
  await supabase.auth.getUser();

  return { supabase, response };
}
