import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "pe_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

interface UpstreamSignInResponse {
  data?: {
    token?: string;
  };
  [key: string]: unknown;
}

export async function POST(request: NextRequest) {
  const authUrl = process.env.NEXT_PUBLIC_AUTH_URL;
  if (!authUrl) {
    return NextResponse.json(
      { ok: false, error: "NEXT_PUBLIC_AUTH_URL is not configured" },
      { status: 500 }
    );
  }

  const body = await request.text();
  const origin = request.headers.get("origin") ?? "";
  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(`${authUrl}/api/auth/sign-in/email`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin,
        "x-forwarded-host": forwardedHost,
        "x-forwarded-proto": forwardedProto,
      },
      body,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Sign-in upstream request failed" },
      { status: 502 }
    );
  }

  let upstreamData: UpstreamSignInResponse | null = null;
  try {
    upstreamData = (await upstreamResponse.json()) as UpstreamSignInResponse;
  } catch {
    upstreamData = null;
  }

  if (!upstreamResponse.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Sign-in failed",
        upstream: upstreamData,
      },
      { status: upstreamResponse.status }
    );
  }

  const token = upstreamData?.data?.token;
  if (!token) {
    return NextResponse.json(
      {
        ok: false,
        error: "Sign-in succeeded but data.token was missing",
        upstream: upstreamData,
      },
      { status: 500 }
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
