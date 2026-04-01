import { compare, hash } from "bcryptjs";
import { SignJWT } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import {
  AdminSession,
  AUTH_COOKIE,
  isSameOrigin,
  SESSION_DURATION_SECONDS,
  verifySessionToken
} from "@/lib/auth-shared";
import { prisma } from "@/lib/prisma";

const loginAttempts = new Map<string, { count: number; expiresAt: number }>();

const adminUsers = prisma as typeof prisma & {
  adminUser: {
    count: () => Promise<number>;
    create: (args: { data: { email: string; passwordHash: string } }) => Promise<{ id: string; email: string; passwordHash: string }>;
    findUnique: (args: { where: { email: string } }) => Promise<{ id: string; email: string; passwordHash: string } | null>;
    update: (args: {
      where: { id: string };
      data: { passwordHash: string };
    }) => Promise<{ id: string; email: string; passwordHash: string }>;
  };
};

export type AdminSecurityState = {
  email: string | null;
  hasAdmin: boolean;
  usesDefaultCredentials: boolean;
  hasCustomPassword: boolean;
};

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET?.trim() || "wa-ai-local-dev-secret-change-this";
  return new TextEncoder().encode(secret);
}

function getClientIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function ensureAdminSeeded() {
  const existingCount = await adminUsers.adminUser.count();

  if (existingCount > 0) {
    return;
  }

  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD?.trim();

  if (!email || !password) {
    return;
  }

  const passwordHash = await hash(password, 12);

  await adminUsers.adminUser.create({
    data: {
      email: email.toLowerCase(),
      passwordHash
    }
  });
}

export async function authenticateAdmin(email: string, password: string) {
  await ensureAdminSeeded();

  const user = await adminUsers.adminUser.findUnique({
    where: { email: email.trim().toLowerCase() }
  });

  if (!user) {
    return null;
  }

  const valid = await compare(password, user.passwordHash);

  if (!valid) {
    return null;
  }

  return user;
}

export async function getAdminSecurityState(): Promise<AdminSecurityState> {
  await ensureAdminSeeded();

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const defaultPassword = process.env.ADMIN_PASSWORD?.trim();

  if (!email) {
    return {
      email: null,
      hasAdmin: false,
      usesDefaultCredentials: false,
      hasCustomPassword: false
    };
  }

  const user = await adminUsers.adminUser.findUnique({
    where: { email }
  });

  if (!user) {
    return {
      email,
      hasAdmin: false,
      usesDefaultCredentials: false,
      hasCustomPassword: false
    };
  }

  const usesDefaultCredentials = defaultPassword
    ? await compare(defaultPassword, user.passwordHash)
    : false;

  return {
    email: user.email,
    hasAdmin: true,
    usesDefaultCredentials,
    hasCustomPassword: !usesDefaultCredentials
  };
}

export async function changeAdminPassword(userId: string, email: string, currentPassword: string, nextPassword: string) {
  const user = await adminUsers.adminUser.findUnique({
    where: { email: email.trim().toLowerCase() }
  });

  if (!user || user.id !== userId) {
    return { ok: false as const, reason: "User admin tidak ditemukan" };
  }

  const valid = await compare(currentPassword, user.passwordHash);

  if (!valid) {
    return { ok: false as const, reason: "Password saat ini tidak valid" };
  }

  if (nextPassword.length < 10) {
    return { ok: false as const, reason: "Password baru minimal 10 karakter" };
  }

  const sameAsCurrent = await compare(nextPassword, user.passwordHash);

  if (sameAsCurrent) {
    return { ok: false as const, reason: "Password baru harus berbeda dari password lama" };
  }

  const passwordHash = await hash(nextPassword, 12);

  await adminUsers.adminUser.update({
    where: { id: user.id },
    data: { passwordHash }
  });

  return { ok: true as const };
}

export async function createSessionToken(session: AdminSession) {
  return new SignJWT({ email: session.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getAuthSecret());
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;

  if (!token) {
    return null;
  }

  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

export function applySessionCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: AUTH_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: AUTH_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

export function checkLoginRateLimit(request: NextRequest) {
  const key = getClientIp(request);
  const current = loginAttempts.get(key);
  const now = Date.now();

  if (!current || current.expiresAt < now) {
    loginAttempts.set(key, { count: 1, expiresAt: now + 10 * 60 * 1000 });
    return { limited: false };
  }

  if (current.count >= 10) {
    return { limited: true, retryAfterSeconds: Math.ceil((current.expiresAt - now) / 1000) };
  }

  current.count += 1;
  loginAttempts.set(key, current);
  return { limited: false };
}

export function resetLoginRateLimit(request: NextRequest) {
  loginAttempts.delete(getClientIp(request));
}

export { AUTH_COOKIE, isSameOrigin, verifySessionToken };
