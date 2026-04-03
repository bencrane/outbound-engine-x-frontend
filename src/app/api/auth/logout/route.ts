import { NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "pe_session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
