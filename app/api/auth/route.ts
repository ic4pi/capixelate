import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import {
  ADMIN_COOKIE,
  clearLoginFails,
  getEnvAdmin,
  isAdmin,
  loginThrottled,
  recordLoginFail,
  safeEqual,
  signAdminToken,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
    if (loginThrottled(ip)) {
      return NextResponse.json({ error: "Too many attempts, try again later" }, { status: 429 });
    }

    const { username, password } = await req.json();
    if (typeof username !== "string" || typeof password !== "string") {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    let valid = false;
    const env = getEnvAdmin();
    if (env && safeEqual(username, env.username) && safeEqual(password, env.password)) {
      valid = true;
    } else {
      const user = await prisma.adminUser.findUnique({ where: { username } });
      if (user) valid = await bcrypt.compare(password, user.passwordHash);
    }

    if (!valid) {
      recordLoginFail(ip);
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = await signAdminToken(username);
    if (!token) {
      return NextResponse.json({ error: "Server auth is not configured" }, { status: 500 });
    }
    clearLoginFails(ip);

    const response = NextResponse.json({ success: true });
    response.cookies.set(ADMIN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 86400,
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Auth failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({ authenticated: await isAdmin(req) });
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(ADMIN_COOKIE);
  return response;
}
