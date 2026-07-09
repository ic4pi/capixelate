import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { gunzipSync } from "zlib";
import { v4 as uuidv4 } from "uuid";

const UPLOAD_DIR =
  process.env.UPLOAD_DIR ?? join(process.cwd(), "public", "uploads");

// Temp dir for assembling chunked uploads (always writable)
const TEMP_DIR = join(UPLOAD_DIR, "_tmp");

async function ensureDir(subDir: string) {
  const dir = join(UPLOAD_DIR, subDir);
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  return dir;
}

async function ensureTempDir() {
  if (!existsSync(TEMP_DIR)) await mkdir(TEMP_DIR, { recursive: true });
  return TEMP_DIR;
}

/** Detect gzip magic bytes (1f 8b) and decompress if present. */
function maybeDecompress(buf: Buffer): Buffer {
  if (buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b) {
    return gunzipSync(buf);
  }
  return buf;
}

export async function POST(req: NextRequest) {
  // ── Vercel: proxy every request to Render ────────────────────────────────
  // Chunking ensures each POST body is < 4.5 MB so Vercel's infra never
  // rejects it. All cross-origin and sleeping-service issues are bypassed.
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

  // ── Render: save directly to persistent disk ──────────────────────────────
  try {
    const formData = await req.formData();
    const file         = formData.get("file")         as File | null;
    const category     = (formData.get("category")    as string) || "misc";
    const uploadId     = formData.get("uploadId")     as string | null;
    const chunkIndex   = parseInt((formData.get("chunkIndex")   as string) ?? "0", 10);
    const totalChunks  = parseInt((formData.get("totalChunks")  as string) ?? "1",  10);
    const originalName = (formData.get("originalName") as string) || file?.name || "file";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const chunkBuf = maybeDecompress(Buffer.from(await file.arrayBuffer()));

    // ── Chunked upload ──────────────────────────────────────────────────────
    if (uploadId && totalChunks > 1) {
      const tmpDir = await ensureTempDir();
      const chunkPath = join(tmpDir, `${uploadId}_${chunkIndex}`);
      await writeFile(chunkPath, chunkBuf);

      // Not the last chunk — just acknowledge
      if (chunkIndex < totalChunks - 1) {
        return NextResponse.json({ status: "chunk_received", chunkIndex });
      }

      // Last chunk: assemble all pieces
      const pieces: Buffer[] = [];
      for (let i = 0; i < totalChunks; i++) {
        const cp = join(tmpDir, `${uploadId}_${i}`);
        pieces.push(await readFile(cp));
        await unlink(cp).catch(() => {}); // clean up as we go
      }
      const finalBuf = Buffer.concat(pieces);
      const baseName = originalName.replace(/\.gz$/i, "");
      const ext      = baseName.split(".").pop() ?? "bin";
      const filename = `${uuidv4()}.${ext}`;
      const dir      = await ensureDir(category);
      await writeFile(join(dir, filename), finalBuf);
      return NextResponse.json({
        url: `/api/files/${category}/${filename}`,
        filename,
        originalName: baseName,
      });
    }

    // ── Single-chunk / small file (no uploadId) ────────────────────────────
    const baseName = (originalName || file.name).replace(/\.gz$/i, "");
    const ext      = baseName.split(".").pop() ?? "bin";
    const filename = `${uuidv4()}.${ext}`;
    const dir      = await ensureDir(category);
    await writeFile(join(dir, filename), chunkBuf);
    return NextResponse.json({
      url: `/api/files/${category}/${filename}`,
      filename,
      originalName: baseName,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
