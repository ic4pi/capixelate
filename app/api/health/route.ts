export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const dbUrl = process.env.DATABASE_URL ?? "(not set — using file:./dev.db)";
  const hasTursoToken = !!(process.env.TURSO_AUTH_TOKEN ?? process.env.DATABASE_AUTH_TOKEN);
  const blobToken     = process.env.BLOB_READ_WRITE_TOKEN ?? "";
  const hasBlobToken  = !!blobToken;
  const hasAdminUser  = !!process.env.ADMIN_USERNAME;
  const hasAdminPass  = !!process.env.ADMIN_PASSWORD;
  const hasNextAuth   = !!process.env.NEXTAUTH_SECRET;

  let dbStatus = "unknown";
  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "connected ✓";
    dbOk = true;
  } catch (err) {
    dbStatus = `ERROR: ${String(err)}`;
  }

  // Unauthenticated callers only learn up/down — no config details.
  if (!(await isAdmin(req))) {
    return NextResponse.json({ ok: dbOk }, { status: dbOk ? 200 : 503 });
  }

  // List all env vars containing BLOB so we can spot a renamed/prefixed token
  const blobEnvVars = Object.keys(process.env)
    .filter((k) => k.toUpperCase().includes("BLOB"))
    .sort();

  return NextResponse.json({
    // — Required for the game to work —
    database_url:            dbUrl.replace(/\/\/[^@]+@/, "//***@"),
    turso_auth_token:        hasTursoToken ? "set ✓" : "NOT SET ✗",
    blob_read_write_token:   hasBlobToken
      ? `set ✓${blobToken.startsWith("vercel_blob_rw_") ? "" : " (unexpected prefix — should start with 'vercel_blob_rw_')"}`
      : "NOT SET ✗",
    admin_username:          hasAdminUser  ? "set ✓" : "NOT SET ✗",
    admin_password:          hasAdminPass  ? "set ✓" : "NOT SET ✗",
    nextauth_secret:         hasNextAuth   ? "set ✓" : "NOT SET ✗",
    // — Diagnostic: all BLOB-related env var names visible to this deployment —
    blob_env_vars_found:     blobEnvVars.length > 0 ? blobEnvVars : "(none)",
    // — DB connection test —
    db_connection: dbStatus,
    node_env: process.env.NODE_ENV,
  });
}
