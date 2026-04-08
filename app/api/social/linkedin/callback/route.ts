import { NextRequest, NextResponse } from "next/server";

import { exchangeLinkedInAuthorizationCode } from "@/lib/social";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")?.trim() || "";
  const error = request.nextUrl.searchParams.get("error")?.trim() || "";

  if (error) {
    return NextResponse.redirect(new URL(`/settings?linkedin=error&reason=${encodeURIComponent(error)}`, request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/settings?linkedin=missing_code", request.url));
  }

  try {
    await exchangeLinkedInAuthorizationCode(code);
    return NextResponse.redirect(new URL("/settings?linkedin=connected", request.url));
  } catch (caughtError) {
    const reason = caughtError instanceof Error ? caughtError.message : "unknown";
    return NextResponse.redirect(new URL(`/settings?linkedin=error&reason=${encodeURIComponent(reason)}`, request.url));
  }
}
