import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const islands = await prisma.island.findMany({
      where: { isActive: true },
      include: { projects: { where: { isActive: true } } },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ islands });
  } catch (err) {
    console.error("GET /api/islands:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const island = await prisma.island.create({
      data: {
        name: body.name,
        posX: body.posX ?? 0,
        posZ: body.posZ ?? 0,
        scale: body.scale ?? 1,
        modelUrl: body.modelUrl,
        isActive: true,
      },
    });
    return NextResponse.json({ island });
  } catch (err) {
    console.error("POST /api/islands:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
