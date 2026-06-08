import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Simple in-memory cache to prevent concurrent getSession() calls from racing
// and hitting Supabase rate limits. Cache is per-process (Next.js dev server).
const sessionCache = new Map<string, { userId: string | null; expiresAt: number }>();
const CACHE_TTL_MS = 5000; // 5 seconds

function getCacheKey(cookieHeader: string): string {
  // Simple hash of the cookie header to create a cache key
  let hash = 0;
  for (let i = 0; i < cookieHeader.length; i++) {
    const char = cookieHeader.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash.toString();
}

function getCachedUser(cookieHeader: string): string | null | undefined {
  const key = getCacheKey(cookieHeader);
  const cached = sessionCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.userId;
  }
  sessionCache.delete(key);
  return undefined;
}

function setCachedUser(cookieHeader: string, userId: string | null): void {
  const key = getCacheKey(cookieHeader);
  sessionCache.set(key, { userId, expiresAt: Date.now() + CACHE_TTL_MS });
}

/**
 * Creates a Supabase server client for use in Route Handlers (API routes).
 *
 * IMPORTANT: This client uses getSession() which auto-refreshes expired tokens.
 * The refreshed cookies are collected and must be applied to your NextResponse.
 *
 * To avoid rate limit races, this function caches the session result for 5 seconds
 * based on the incoming cookies. Multiple concurrent API calls within 5 seconds
 * will share the same session check, preventing token refresh races.
 *
 * Example:
 *   const { supabase, applyCookies } = await createRouteClient();
 *   const { data: { session } } = await supabase.auth.getSession();
 *   // ... do work ...
 *   const response = NextResponse.json({ ... });
 *   applyCookies(response); // <-- REQUIRED for cookie refresh to work!
 *   return response;
 */
export async function createRouteClient(request?: Request) {
  // For Route Handlers, parse cookies from the Request object.
  // cookies() from next/headers is for Server Components and can fail in API routes.
  let cookieList: Array<{ name: string; value: string }> = [];
  
  if (request) {
    const cookieHeader = request.headers.get("cookie") || "";
    cookieList = cookieHeader.split(";").map((c) => {
      const [name, ...rest] = c.trim().split("=");
      return { name, value: rest.join("=") };
    }).filter((c) => c.name);
  } else {
    // Fallback to cookies() if no request provided (Server Component context)
    const cookieStore = await cookies();
    cookieList = cookieStore.getAll();
  }
  
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
  const applyCookies = (response: any) => {
    cookiesToSet.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });
  };

  // Check cache for session result (prevents concurrent refresh races)
  let cachedUserId: string | null | undefined = undefined;
  if (request) {
    const cookieHeader = request.headers.get("cookie") || "";
    cachedUserId = getCachedUser(cookieHeader);
  }

  return { supabase, applyCookies, cachedUserId };
}

/**
 * Get the current user ID, using cache if available to avoid rate limits.
 * If not cached, calls getSession() and caches the result.
 */
export async function getUserIdFromRequest(
  request: Request,
  supabase: ReturnType<typeof createServerClient>,
  applyCookies: (response: any) => void
): Promise<{ userId: string | null; response: any | null }> {
  const cookieHeader = request.headers.get("cookie") || "";
  
  // Check cache first
  const cached = getCachedUser(cookieHeader);
  if (cached !== undefined) {
    return { userId: cached, response: null };
  }

  // Not cached -- call getSession() (may refresh token)
  const { data: { session }, error } = await supabase.auth.getSession();
  const userId = session?.user?.id || null;

  if (error) {
    console.error("[getUserIdFromRequest] getSession error:", error.message);
  }

  // Cache the result
  setCachedUser(cookieHeader, userId);

  // Create a response to apply any refreshed cookies
  const { NextResponse } = await import("next/server");
  const response = NextResponse.next();
  applyCookies(response);

  return { userId, response };
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
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}
