import { jwtVerify } from "jose";
import { NextRequest } from "next/server";

export const AUTH_COOKIE = "wa_ai_session";
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

export type AdminSession = {
  sub: string;
  email: string;
};

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET?.trim() || "wa-ai-local-dev-secret-change-this";
  return new TextEncoder().encode(secret);
}

export async function verifySessionToken(token: string) {
  const verified = await jwtVerify(token, getAuthSecret());

  return {
    sub: verified.payload.sub ?? "",
    email: String(verified.payload.email ?? "")
  } satisfies AdminSession;
}

export function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (!origin) {
    return true;
  }

  try {
    const originUrl = new URL(origin);
    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto = request.headers.get("x-forwarded-proto");
    const requestUrl = new URL(request.url);
    const effectiveHost = forwardedHost || requestUrl.host;
    const effectiveProtocol = forwardedProto ? `${forwardedProto}:` : requestUrl.protocol;

    return originUrl.host === effectiveHost && originUrl.protocol === effectiveProtocol;
  } catch {
    return false;
  }
}
