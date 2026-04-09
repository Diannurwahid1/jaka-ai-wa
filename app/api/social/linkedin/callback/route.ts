import { NextRequest, NextResponse } from "next/server";

import { exchangeLinkedInAuthorizationCode } from "@/lib/social";

function getAppBaseUrl(request: NextRequest) {
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = request.headers.get("host")?.trim();
  const protocol = forwardedProto || request.nextUrl.protocol.replace(/:$/, "");
  const effectiveHost = forwardedHost || host || request.nextUrl.host;

  return `${protocol}://${effectiveHost}`;
}

function settingsRedirect(request: NextRequest, search: string) {
  return NextResponse.redirect(new URL(`/settings${search}`, getAppBaseUrl(request)));
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")?.trim() || "";
  const error = request.nextUrl.searchParams.get("error")?.trim() || "";

  if (error) {
    return settingsRedirect(request, `?linkedin=error&reason=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return settingsRedirect(request, "?linkedin=missing_code");
  }

  try {
    await exchangeLinkedInAuthorizationCode(code);
    return settingsRedirect(request, "?linkedin=connected");
  } catch (caughtError) {
    const reason = caughtError instanceof Error ? caughtError.message : "unknown";
    return settingsRedirect(request, `?linkedin=error&reason=${encodeURIComponent(reason)}`);
  }
}
