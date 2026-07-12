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
  ];

  const results: string[] = [];
  for (const sql of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
      const name = sql.match(/"(\w+)"/)?.[1] ?? "?";
      results.push(`${name}: created ✓`);
    } catch (err) {
      results.push(`ERROR: ${String(err)}`);
    }
  }

  return NextResponse.json({ success: true, tables: results });
}
