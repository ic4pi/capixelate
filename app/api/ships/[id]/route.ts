export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.ship.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
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
      data: {
        name: body.name,
        type: body.type,
        modelUrl: body.modelUrl,
        isActive: body.isActive,
      },
    });
    return NextResponse.json({ ship });
  } catch {
    return NextResponse.json({ error: "Failed to update ship" }, { status: 500 });
  }
}
