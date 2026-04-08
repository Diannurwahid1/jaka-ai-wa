import { jwtVerify } from "jose";
import { NextRequest } from "next/server";

export const AUTH_COOKIE = "wa_ai_session";
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

export type AdminSession = {
  sub: string;
  email: string;
};

function getDefaultPort(protocol: string) {
  return protocol === "https:" ? "443" : protocol === "http:" ? "80" : "";
}

function normalizeProtocol(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const protocol = value.split(",")[0]?.trim().toLowerCase();

  if (!protocol) {
    return null;
  }

  return protocol.endsWith(":") ? protocol : `${protocol}:`;
}

function normalizeHost(value: string | null | undefined, protocol: string) {
  if (!value) {
    return null;
  }

  const host = value.split(",")[0]?.trim().toLowerCase();

  if (!host) {
    return null;
  }

  try {
    const parsed = new URL(`${protocol}//${host}`);
    return {
      hostname: parsed.hostname.toLowerCase(),
      port: parsed.port || getDefaultPort(parsed.protocol)
    };
  } catch {
    return null;
  }
}

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
    const requestUrl = new URL(request.url);
    const protocols = new Set(
      [normalizeProtocol(request.headers.get("x-forwarded-proto")), requestUrl.protocol].filter(Boolean) as string[]
    );
    const originProtocol = originUrl.protocol.toLowerCase();
    const originHost = {
      hostname: originUrl.hostname.toLowerCase(),
      port: originUrl.port || getDefaultPort(originProtocol)
    };

    for (const protocol of protocols) {
      const hosts = [
        request.headers.get("x-forwarded-host"),
        request.headers.get("host"),
        requestUrl.host
      ];

      for (const host of hosts) {
        const normalizedHost = normalizeHost(host, protocol);

        if (!normalizedHost) {
          continue;
        }

        if (
          normalizedHost.hostname === originHost.hostname &&
          normalizedHost.port === originHost.port &&
          protocol === originProtocol
        ) {
          return true;
        }
      }
    }

    return false;
  } catch {
    return false;
  }
}
