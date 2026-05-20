import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next.js Middleware — Auth session refresh + route protection.
 *
 * Protected paths:
 *   - /dashboard/*   → requires authenticated user
 *   - /onboarding/*  → requires authenticated user
 *
 * Unauthenticated users hitting protected routes are redirected to / (landing).
 * Authenticated users are allowed through and their session cookie is refreshed.
 */

// Paths that require an active session
const PROTECTED_PATHS = ["/dashboard"];

// Paths that redirect authenticated users away (e.g. login page)
const AUTH_ONLY_PATHS = ["/login"];

// Paths that anonymous users are allowed to access
const PUBLIC_PATHS = ["/", "/login", "/auth", "/api/webhook"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ---------------------------------------------------------------------------
  // 1. Refresh the Supabase session (sets new cookies on the response if needed)
  // ---------------------------------------------------------------------------
  const { supabase, response } = await updateSession(request);

  // ---------------------------------------------------------------------------
  // 2. Check if the current route is protected
  // ---------------------------------------------------------------------------
  const isProtected = PROTECTED_PATHS.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (!isProtected) {
    // Public route — no auth check needed, just return the session-refreshed response
    return response;
  }

  // ---------------------------------------------------------------------------
  // 3. Protected route — validate the user session
  // ---------------------------------------------------------------------------
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    // No valid session — redirect to landing page
    const loginUrl = new URL("/", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // User is authenticated — proceed with the (possibly cookie-updated) response
  return response;
}

/**
 * Matcher configuration:
 * - Exclude static files, images, and API routes that don't need session refresh.
 * - Include everything else so the middleware can refresh cookies on every page.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static JS/CSS chunks)
     * - _next/image (image optimisation)
     * - favicon.ico, manifest.json, robots.txt
     * - /api/* (API routes handle their own auth if needed)
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|robots.txt|api/).*)",
  ],
};
