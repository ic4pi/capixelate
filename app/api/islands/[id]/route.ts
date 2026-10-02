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
    const island = await prisma.island.update({
      where: { id },
      data: pickFields(body, {
        name: "string",
        posX: "number",
        posZ: "number",
        scale: "number",
        modelUrl: "string?",
        modelRotationY: "number",
        modelYOffset: "number",
        isActive: "boolean",
      }),
    });
    return NextResponse.json({ island });
  } catch {
    return NextResponse.json({ error: "Failed to update island" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.island.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete island" }, { status: 500 });
  }
}
