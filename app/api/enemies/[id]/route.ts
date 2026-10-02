export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pickFields } from "@/lib/pick";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const enemy = await prisma.enemy.update({
      where: { id },
      data: pickFields(body, {
        name: "string",
        type: "string",
        modelUrl: "string?",
        modelScale: "number",
        modelRotationY: "number",
        modelYOffset: "number",
        lootImageUrl: "string?",
        hitPoints: "number",
        cannonAccuracy: "number",
        difficulty: "string",
        behavior: "string",
        attackMode: "string",
        fleeThreshold: "number",
        lootValue: "number",
        lootDifficulty: "string",
        zoneX: "number",
        zoneZ: "number",
        zoneRadius: "number",
        speed: "number",
        spawnCount: "number",
        isActive: "boolean",
      }),
    });
    return NextResponse.json({ enemy });
  } catch {
    return NextResponse.json({ error: "Failed to update enemy" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.enemy.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete enemy" }, { status: 500 });
  }
}
