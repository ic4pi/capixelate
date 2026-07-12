export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { execSync } from "child_process";

/**
 * One-time route to push the Prisma schema to Turso.
 * Visit /api/migrate once — it creates all missing tables.
 * Protected by NEXTAUTH_SECRET so only you can run it.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");

  if (secret !== process.env.NEXTAUTH_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const output = execSync("npx prisma db push --accept-data-loss", {
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL,
        TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN,
      },
      timeout: 60000,
    }).toString();

    return NextResponse.json({ success: true, output });
  } catch (err: unknown) {
    const error = err as { message?: string; stdout?: Buffer; stderr?: Buffer };
    return NextResponse.json({
      error: error.message,
      stdout: error.stdout?.toString(),
      stderr: error.stderr?.toString(),
    }, { status: 500 });
  }
}
