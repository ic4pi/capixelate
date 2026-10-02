export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pickFields } from "@/lib/pick";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.ship.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/ships/[id]:", err);
    return NextResponse.json({ error: "Failed to delete ship" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const ship = await prisma.ship.update({
      where: { id },
      data: pickFields(body, {
        name: "string",
        type: "string",
        modelUrl: "string?",
        modelScale: "number",
        modelRotationY: "number",
        modelYOffset: "number",
        isActive: "boolean",
      }),
    });
    return NextResponse.json({ ship });
  } catch {
    return NextResponse.json({ error: "Failed to update ship" }, { status: 500 });
  }
}
