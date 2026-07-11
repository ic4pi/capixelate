export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const dbUrl = process.env.DATABASE_URL ?? "(not set — using file:./dev.db)";
  const hasTursoToken = !!(process.env.TURSO_AUTH_TOKEN ?? process.env.DATABASE_AUTH_TOKEN);
  const hasBlobToken  = !!process.env.BLOB_READ_WRITE_TOKEN;
  const hasAdminUser  = !!process.env.ADMIN_USERNAME;
  const hasAdminPass  = !!process.env.ADMIN_PASSWORD;
  const hasNextAuth   = !!process.env.NEXTAUTH_SECRET;

  let dbStatus = "unknown";
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "connected ✓";
  } catch (err) {
    dbStatus = `ERROR: ${String(err)}`;
  }

  return NextResponse.json({
    // — Required for the game to work —
    database_url:            dbUrl.replace(/\/\/[^@]+@/, "//***@"),
    turso_auth_token:        hasTursoToken ? "set ✓" : "NOT SET ✗",
    blob_read_write_token:   hasBlobToken  ? "set ✓" : "NOT SET ✗  ← causes 'Failed to retrieve client token'",
    admin_username:          hasAdminUser  ? "set ✓" : "NOT SET ✗",
    admin_password:          hasAdminPass  ? "set ✓" : "NOT SET ✗",
    nextauth_secret:         hasNextAuth   ? "set ✓" : "NOT SET ✗",
    // — DB connection test —
    db_connection: dbStatus,
    node_env: process.env.NODE_ENV,
  });
}
