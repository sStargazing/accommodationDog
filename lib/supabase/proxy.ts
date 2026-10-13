import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { getSupabaseEnv, isSupabaseConfigured } from "./env";

/** Routes that need a signed-in user. Pages re-check on the server; this is an early redirect. */
const PROTECTED_PREFIXES = ["/create", "/my-listings", "/saved", "/admin", "/settings"];
/** Routes a signed-in user has no reason to see. */
const GUEST_ONLY_PATHS = ["/login", "/signup"];

const matchesPrefix = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);

/**
 * Refreshes the Supabase session cookie on every request and performs
 * optimistic auth redirects. Authorization itself happens next to the data
 * (Server Components, Server Actions and RLS).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!isSupabaseConfigured) return response;

  const { url, key } = getSupabaseEnv();
  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });

  // Do not run code between createServerClient and getClaims: getClaims is
  // what refreshes an expired session.
  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims);
  const path = request.nextUrl.pathname;

  if (!isSignedIn && PROTECTED_PREFIXES.some((prefix) => matchesPrefix(path, prefix))) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${path}${request.nextUrl.search}`);
    return redirectWithCookies(loginUrl, response);
  }

  if (isSignedIn && GUEST_ONLY_PATHS.includes(path)) {
    return redirectWithCookies(new URL("/", request.url), response);
  }

  return response;
}

/** Redirects while keeping any refreshed session cookies and no-cache headers. */
function redirectWithCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  from.headers.forEach((value, name) => {
    if (["cache-control", "expires", "pragma"].includes(name)) redirect.headers.set(name, value);
  });
  return redirect;
}
