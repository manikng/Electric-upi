import { NextResponse, type NextRequest } from "next/server";

// ── Matcher ──
// Only run proxy on routes that need auth (avoids Next.js /_next/* noise).
export const config = {
  matcher: [
    "/list-charger/:path*",
    "/booking/:path*",
    "/host/:path*",
    "/driver/:path*",
    "/protected/:path*",
  ],
};

// ── Proxy ──
export async function proxy(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cookie = request.headers.get("cookie");

  // We can NOT call supabase here in edge runtime without bundling all node_modules
  // Instead, we let the server pages handle the check (they already do redirect). 
  // This proxy is just a fast-path: check for the presence of auth cookies.
  const hasSupabaseCookie = cookie ? 
    /sb-[^-]+-auth-token/.test(cookie) || 
    /sb-access-token/.test(cookie) || 
    /sb-refresh-token/.test(cookie)
    : false;

  if (!hasSupabaseCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

