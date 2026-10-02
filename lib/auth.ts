import { NextRequest, NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import { timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "capixelate_admin";

const isProd = process.env.NODE_ENV === "production";
// Dev-only fallback so `npm run dev` works with no .env. Never used in production.
const DEV_SECRET = "dev-only-secret-do-not-use-in-production";

/** JWT signing key, or null when production has no NEXTAUTH_SECRET (fail closed). */
export function getSecret(): Uint8Array | null {
  const s = process.env.NEXTAUTH_SECRET;
  if (s && s.length >= 16) return new TextEncoder().encode(s);
  return isProd ? null : new TextEncoder().encode(DEV_SECRET);
}

/** Env admin credentials. No hardcoded defaults in production. */
export function getEnvAdmin(): { username: string; password: string } | null {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (username && password) return { username, password };
  return isProd ? null : { username: "admin", password: "admin" };
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export async function signAdminToken(username: string): Promise<string | null> {
  const secret = getSecret();
  if (!secret) return null;
  return new SignJWT({ username, role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .setIssuedAt()
    .sign(secret);
}

export async function isAdmin(req: NextRequest): Promise<boolean> {
  const secret = getSecret();
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  if (!secret || !token) return false;
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    return payload.role === "admin";
  } catch {
    return false;
  }
}

/** Returns a 401 response when the caller isn't an admin, otherwise null. */
export async function requireAdmin(req: NextRequest): Promise<NextResponse | null> {
  return (await isAdmin(req))
    ? null
    : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// Best-effort in-memory login throttle (per server instance).
const attempts = new Map<string, { count: number; reset: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 5;

export function loginThrottled(ip: string): boolean {
  const a = attempts.get(ip);
  if (!a || a.reset < Date.now()) return false;
  return a.count >= MAX_FAILS;
}
export function recordLoginFail(ip: string) {
  const now = Date.now();
  const a = attempts.get(ip);
  if (!a || a.reset < now) attempts.set(ip, { count: 1, reset: now + WINDOW_MS });
  else a.count++;
}
export function clearLoginFails(ip: string) {
  attempts.delete(ip);
}
