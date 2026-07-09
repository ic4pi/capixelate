import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { gunzipSync } from "zlib";
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

/** Detect gzip magic bytes (1f 8b) and decompress if present. */
function maybeDecompress(buf: Buffer): Buffer {
  if (buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b) {
    return gunzipSync(buf);
  }
  return buf;
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
      if (!upstream.ok) {
        const text = await upstream.text().catch(() => "");
        console.error("Proxy upstream error:", upstream.status, text.slice(0, 200));
        return NextResponse.json(
          { error: `Upload proxy failed (${upstream.status})` },
          { status: upstream.status }
        );
      }
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
    // Decompress if the browser gzip-compressed the file before sending
    const buffer = maybeDecompress(Buffer.from(bytes));

    // Strip any .gz suffix added by the client — always store the real extension
    const baseName = file.name.replace(/\.gz$/i, "");
    const ext = baseName.split(".").pop() ?? "bin";
    const filename = `${uuidv4()}.${ext}`;
    const dir = await ensureDir(category);
    await writeFile(join(dir, filename), buffer);

    const url = `/api/files/${category}/${filename}`;
    return NextResponse.json({ url, filename, originalName: baseName });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
