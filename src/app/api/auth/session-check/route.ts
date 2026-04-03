import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "pe_session";

async function parseUpstream(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function GET(request: NextRequest) {
  const authUrl = process.env.NEXT_PUBLIC_AUTH_URL;
  if (!authUrl) {
    return NextResponse.json(
      { ok: false, step: "config", error: "NEXT_PUBLIC_AUTH_URL is not configured" },
      { status: 500 }
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json(
      { ok: false, step: "cookie", error: "Missing pe_session cookie" },
      { status: 401 }
    );
  }

  const origin = request.headers.get("origin") ?? "";
  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(`${authUrl}/api/auth/token/session`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        origin,
        "x-forwarded-host": forwardedHost,
        "x-forwarded-proto": forwardedProto,
      },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { ok: false, step: "fetch", error: "Session validation request failed" },
      { status: 502 }
    );
  }

  const upstream = await parseUpstream(upstreamResponse);
  if (!upstreamResponse.ok) {
    return NextResponse.json(
      {
        ok: false,
        step: "upstream",
        status: upstreamResponse.status,
        upstream,
      },
      { status: upstreamResponse.status }
    );
  }

  return NextResponse.json({
    ok: true,
    step: "validated",
    status: upstreamResponse.status,
    upstream,
  });
}
