import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "pe_session";
const PUBLIC_PATHS = ["/login"];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) {
    return true;
  }

  if (
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  ) {
    return true;
  }

  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    const redirectUrl = new URL("/login", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  const authUrl = process.env.NEXT_PUBLIC_AUTH_URL;
  if (!authUrl) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }

  const origin = request.headers.get("origin") ?? "";
  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";

  try {
    const sessionResponse = await fetch(`${authUrl}/api/auth/token/session`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        origin,
        "x-forwarded-host": forwardedHost,
        "x-forwarded-proto": forwardedProto,
      },
      cache: "no-store",
    });

    if (sessionResponse.ok) {
      return NextResponse.next();
    }
  } catch {
    // Fall through to redirect with cookie clear on any validation error.
  }

  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
