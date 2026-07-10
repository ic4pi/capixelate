export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const dbUrl = process.env.DATABASE_URL ?? "(not set — using file:./dev.db)";
  const hasToken = !!(process.env.TURSO_AUTH_TOKEN ?? process.env.DATABASE_AUTH_TOKEN);
  const uploadDir = process.env.UPLOAD_DIR ?? "(not set)";
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "(not set)";

  let dbStatus = "unknown";
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "connected ✓";
  } catch (err) {
    dbStatus = `ERROR: ${String(err)}`;
  }

  return NextResponse.json({
    database_url: dbUrl.replace(/\/\/[^@]+@/, "//***@"), // hide credentials
    turso_auth_token: hasToken ? "set ✓" : "NOT SET ✗",
    upload_dir: uploadDir,
    api_base_url: apiBase,
    db_connection: dbStatus,
    node_env: process.env.NODE_ENV,
  });
}
