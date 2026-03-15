import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Await params as required by Next 15+ App Router
    const resolvedParams = await params;
    const backendPath = resolvedParams.path.join("/");
    const url = `${process.env.NEXT_PUBLIC_DEX_API_BASE_URL || "https://api.dataengine.run"}/api/${backendPath}`;

    const token = process.env.DATAENGINE_API_TOKEN;
    if (!token) {
      return NextResponse.json(
        { detail: "Server misconfiguration: DATAENGINE_API_TOKEN missing" },
        { status: 500 }
      );
    }

    const bodyText = await req.text();

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: bodyText || "{}",
    });

    const responseBody = await response.text();

    return new NextResponse(responseBody, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { detail: error.message || "Proxy request failed" },
      { status: 500 }
    );
  }
}
