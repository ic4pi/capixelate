import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { v4 as uuidv4 } from "uuid";

const UPLOAD_DIR =
  process.env.UPLOAD_DIR ?? join(process.cwd(), "public", "uploads");

async function ensureDir(subDir: string) {
  const dir = join(UPLOAD_DIR, subDir);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  return dir;
}

export async function POST(req: NextRequest) {
  // When running on Vercel (no persistent UPLOAD_DIR) proxy to Render backend
  const remoteBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (remoteBase && !process.env.UPLOAD_DIR) {
    try {
      const formData = await req.formData();
      const upstream = await fetch(`${remoteBase}/api/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await upstream.json();
      return NextResponse.json(data, { status: upstream.status });
    } catch (err) {
      console.error("Proxy upload error:", err);
      return NextResponse.json({ error: "Upload proxy failed" }, { status: 502 });
    }
  }

  // Running on Render — write directly to persistent disk
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const category = (formData.get("category") as string) || "misc";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = file.name.split(".").pop() ?? "bin";
    const filename = `${uuidv4()}.${ext}`;
    const dir = await ensureDir(category);
    await writeFile(join(dir, filename), buffer);

    const url = `/api/files/${category}/${filename}`;
    return NextResponse.json({ url, filename, originalName: file.name });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
