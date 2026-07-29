import { NextRequest, NextResponse } from "next/server";

import { requireSession } from "@/lib/auth";
import { getThreadsAuthorizationUrl } from "@/lib/social";

function getAppBaseUrl(request: NextRequest) {
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = request.headers.get("host")?.trim();
  const protocol = forwardedProto || request.nextUrl.protocol.replace(/:$/, "");
  const effectiveHost = forwardedHost || host || request.nextUrl.host;

  return `${protocol}://${effectiveHost}`;
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const redirectUri = `${getAppBaseUrl(request)}/api/social/threads/callback`;
    const url = await getThreadsAuthorizationUrl(session.businessId, redirectUri);

    return NextResponse.json({ ok: true, url, redirectUri });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        reason: error instanceof Error ? error.message : "Gagal membuat Threads OAuth URL"
      },
      { status: 500 }
    );
  }
}

