import { NextResponse, type NextRequest } from "next/server";

import { AUTH_COOKIE, isSameOrigin, verifySessionToken } from "@/lib/auth-shared";

const publicPagePaths = new Set(["/login"]);
const publicApiPaths = new Set(["/api/auth/login", "/api/webhook/wa", "/api/cron/creator-publish"]);
const protectedAppPrefixes = ["/dashboard", "/jaka-creator", "/ai-chat", "/wa-monitor", "/knowledge-base", "/settings"];
const protectedApiPrefixes = ["/api/"];

async function hasValidSession(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;

  if (!token) {
    return false;
  }

  try {
    await verifySessionToken(token);
    return true;
  } catch {
    return false;
  }
}

function isProtectedPage(pathname: string) {
  return protectedAppPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isProtectedApi(pathname: string) {
  if (publicApiPaths.has(pathname)) {
    return false;
  }

  return protectedApiPrefixes.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  if (publicPagePaths.has(pathname)) {
    if (await hasValidSession(request)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
  }

  if (isProtectedPage(pathname) || pathname === "/") {
    if (!(await hasValidSession(request))) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (isProtectedApi(pathname)) {
    if (!(await hasValidSession(request))) {
      return NextResponse.json({ ok: false, reason: "Unauthorized" }, { status: 401 });
    }

    if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method) && !isSameOrigin(request)) {
      return NextResponse.json({ ok: false, reason: "Invalid origin" }, { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)"]
};
