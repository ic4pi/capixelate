export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const ships = await prisma.ship.findMany({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ ships });
  } catch (err) {
    console.error("GET /api/ships:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ship = await prisma.ship.create({
      data: {
        name: body.name,
        type: body.type ?? "player",
        modelUrl: body.modelUrl,
        modelScale: body.modelScale ?? 1,
        modelRotationY: body.modelRotationY ?? 0,
        modelYOffset: body.modelYOffset ?? 0,
        isActive: true,
      },
    });
    return NextResponse.json({ ship });
  } catch (err) {
    console.error("POST /api/ships:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
