import { NextRequest, NextResponse } from "next/server";

import { exchangeThreadsAuthorizationCode } from "@/lib/social";
import { requireSession } from "@/lib/auth";

function getAppBaseUrl(request: NextRequest) {
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = request.headers.get("host")?.trim();
  const protocol = forwardedProto || request.nextUrl.protocol.replace(/:$/, "");
  const effectiveHost = forwardedHost || host || request.nextUrl.host;

  return `${protocol}://${effectiveHost}`;
}

function getRedirectUri(request: NextRequest) {
  return `${getAppBaseUrl(request)}/api/social/threads/callback`;
}

function settingsRedirect(request: NextRequest, search: string) {
  return NextResponse.redirect(new URL(`/settings${search}`, getAppBaseUrl(request)));
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")?.trim() || "";
  const error = request.nextUrl.searchParams.get("error")?.trim() || "";
  const errorDescription = request.nextUrl.searchParams.get("error_description")?.trim() || "";

  if (error) {
    const reason = errorDescription || error;
    return settingsRedirect(request, `?threads=error&reason=${encodeURIComponent(reason)}`);
  }

  if (!code) {
    return settingsRedirect(request, "?threads=missing_code");
  }

  try {
    const session = await requireSession();
    const result = await exchangeThreadsAuthorizationCode(session.businessId, code, getRedirectUri(request));
    return settingsRedirect(
      request,
      `?threads=connected&username=${encodeURIComponent(result.username)}&userId=${encodeURIComponent(result.userId)}`
    );
  } catch (caughtError) {
    const reason = caughtError instanceof Error ? caughtError.message : "unknown";
    return settingsRedirect(request, `?threads=error&reason=${encodeURIComponent(reason)}`);
  }
}
