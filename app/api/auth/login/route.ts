import { NextRequest, NextResponse } from "next/server";

import {
  applySessionCookie,
  authenticateAdmin,
  checkLoginRateLimit,
  createSessionToken,
  resetLoginRateLimit
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  const rateLimit = checkLoginRateLimit(request);

  if (rateLimit.limited) {
    return NextResponse.json(
      { ok: false, reason: "Terlalu banyak percobaan login. Coba lagi nanti." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds ?? 60)
        }
      }
    );
  }

  try {
    const body = await request.json();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");

    if (!email || !password) {
      return NextResponse.json({ ok: false, reason: "email dan password wajib diisi" }, { status: 400 });
    }

    const user = await authenticateAdmin(email, password);

    if (!user) {
      return NextResponse.json({ ok: false, reason: "Email atau password salah" }, { status: 401 });
    }

    const token = await createSessionToken({
      sub: user.id,
      email: user.email
    });

    const response = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email
      }
    });

    resetLoginRateLimit(request);
    applySessionCookie(response, token);
    return response;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
