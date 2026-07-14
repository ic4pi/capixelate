export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Creates all missing tables by running raw SQL directly through the
 * existing Prisma connection — no npx, no filesystem, works on Vercel.
 * Visit /api/migrate?secret=YOUR_NEXTAUTH_SECRET once.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");

  if (secret !== process.env.NEXTAUTH_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const statements = [
    `CREATE TABLE IF NOT EXISTS "Project" (
      "id" TEXT PRIMARY KEY,
      "title" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "url" TEXT NOT NULL,
      "imageUrl" TEXT,
      "iconUrl" TEXT,
      "tags" TEXT NOT NULL DEFAULT '[]',
      "order" INTEGER NOT NULL DEFAULT 0,
      "isActive" INTEGER NOT NULL DEFAULT 1,
      "islandId" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS "Island" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "posX" REAL NOT NULL DEFAULT 0,
      "posZ" REAL NOT NULL DEFAULT 0,
      "scale" REAL NOT NULL DEFAULT 1,
      "modelUrl" TEXT,
      "modelRotationY" REAL NOT NULL DEFAULT 0,
      "modelYOffset" REAL NOT NULL DEFAULT 0,
      "isDiscovered" INTEGER NOT NULL DEFAULT 0,
      "isActive" INTEGER NOT NULL DEFAULT 1,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS "Enemy" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "type" TEXT NOT NULL DEFAULT 'ship',
      "modelUrl" TEXT,
      "modelScale" REAL NOT NULL DEFAULT 1,
      "modelRotationY" REAL NOT NULL DEFAULT 0,
      "modelYOffset" REAL NOT NULL DEFAULT 0,
      "lootImageUrl" TEXT,
      "hitPoints" INTEGER NOT NULL DEFAULT 3,
      "cannonAccuracy" REAL NOT NULL DEFAULT 0.5,
      "difficulty" TEXT NOT NULL DEFAULT 'normal',
      "behavior" TEXT NOT NULL DEFAULT 'fight',
      "attackMode" TEXT NOT NULL DEFAULT 'cannon',
      "fleeThreshold" REAL NOT NULL DEFAULT 0.25,
      "lootValue" INTEGER NOT NULL DEFAULT 100,
      "lootDifficulty" TEXT NOT NULL DEFAULT 'normal',
      "zoneX" REAL NOT NULL DEFAULT 0,
      "zoneZ" REAL NOT NULL DEFAULT 0,
      "zoneRadius" REAL NOT NULL DEFAULT 200,
      "speed" REAL NOT NULL DEFAULT 1,
      "isActive" INTEGER NOT NULL DEFAULT 1,
      "spawnCount" INTEGER NOT NULL DEFAULT 1,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS "Ship" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "type" TEXT NOT NULL DEFAULT 'player',
      "modelUrl" TEXT,
      "modelScale" REAL NOT NULL DEFAULT 1,
      "modelRotationY" REAL NOT NULL DEFAULT 0,
      "modelYOffset" REAL NOT NULL DEFAULT 0,
      "isActive" INTEGER NOT NULL DEFAULT 1,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS "AdminUser" (
      "id" TEXT PRIMARY KEY,
      "username" TEXT NOT NULL UNIQUE,
      "passwordHash" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS "GameConfig" (
      "id" TEXT PRIMARY KEY,
      "key" TEXT NOT NULL UNIQUE,
      "value" TEXT NOT NULL,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    // ── Additive column migrations. These error if the column already exists;
    // the per-statement try/catch below turns that into a benign log message.
    `ALTER TABLE "Island" ADD COLUMN "modelRotationY" REAL NOT NULL DEFAULT 0`,
    `ALTER TABLE "Island" ADD COLUMN "modelYOffset" REAL NOT NULL DEFAULT 0`,
    `ALTER TABLE "Ship" ADD COLUMN "modelScale" REAL NOT NULL DEFAULT 1`,
    `ALTER TABLE "Ship" ADD COLUMN "modelRotationY" REAL NOT NULL DEFAULT 0`,
    `ALTER TABLE "Ship" ADD COLUMN "modelYOffset" REAL NOT NULL DEFAULT 0`,
    `ALTER TABLE "Enemy" ADD COLUMN "modelScale" REAL NOT NULL DEFAULT 1`,
    `ALTER TABLE "Enemy" ADD COLUMN "modelRotationY" REAL NOT NULL DEFAULT 0`,
    `ALTER TABLE "Enemy" ADD COLUMN "modelYOffset" REAL NOT NULL DEFAULT 0`,
  ];

  const results: string[] = [];
  for (const sql of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
      const name = sql.match(/"(\w+)"/)?.[1] ?? "?";
      const verb = sql.startsWith("ALTER") ? "altered" : "created";
      results.push(`${name}: ${verb} ✓`);
    } catch (err) {
      // ALTER TABLE ADD COLUMN errors when the column already exists — that's
      // fine on re-runs; log at debug level instead of ERROR so it doesn't
      // look like a failure in the response.
      const msg = String(err);
      if (sql.startsWith("ALTER") && /duplicate column|already exists/i.test(msg)) {
        const table = sql.match(/"(\w+)"/)?.[1] ?? "?";
        const col   = sql.match(/COLUMN "(\w+)"/)?.[1] ?? "?";
        results.push(`${table}.${col}: already present`);
      } else {
        results.push(`ERROR: ${msg}`);
      }
    }
  }

  return NextResponse.json({ success: true, tables: results });
}
