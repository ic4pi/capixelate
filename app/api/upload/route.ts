export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { gunzipSync } from "zlib";
import { v4 as uuidv4 } from "uuid";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

export const maxDuration = 60;

const UPLOAD_DIR =
  process.env.UPLOAD_DIR ?? join(process.cwd(), "public", "uploads");
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
function maybeDecompress(buf: Buffer): Buffer {
  if (buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b) return gunzipSync(buf);
  return buf;
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";

  // ── Path 1: Vercel Blob client-side upload ────────────────────────────────
  // When BLOB_READ_WRITE_TOKEN is set, the @vercel/blob/client library sends
  // a JSON body to this endpoint to get a signed token, then uploads the file
  // DIRECTLY to Vercel's CDN — no Render involved, no size limits, no sleeping.
  if (contentType.includes("application/json") && process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const body = (await req.json()) as HandleUploadBody;
      const response = await handleUpload({
        body,
        request: req,
        onBeforeGenerateToken: async () => ({
          allowedContentTypes: [
            "model/gltf-binary",
            "model/gltf+json",
            "application/octet-stream",
            "application/gzip",
            "image/png",
            "image/jpeg",
            "image/webp",
            "image/gif",
            "image/svg+xml",
          ],
          maximumSizeInBytes: 200 * 1024 * 1024, // 200 MB
        }),
        onUploadCompleted: async ({ blob }) => {
          console.log("Vercel Blob upload complete:", blob.url);
        },
      });
      return NextResponse.json(response);
    } catch (err) {
      console.error("Blob handleUpload error:", err);
      return NextResponse.json({ error: String(err) }, { status: 500 });
    }
  }

  // JSON request but no BLOB token — tell the client to use chunked fallback
  if (contentType.includes("application/json")) {
    return NextResponse.json({ error: "BLOB_NOT_CONFIGURED" }, { status: 501 });
  }

  // ── Path 2: Render persistent disk (FormData) ─────────────────────────────
  if (process.env.UPLOAD_DIR) {
    try {
      const formData = await req.formData();
      const file         = formData.get("file")         as File | null;
      const category     = (formData.get("category")    as string) || "misc";
      const uploadId     = formData.get("uploadId")     as string | null;
      const chunkIndex   = parseInt((formData.get("chunkIndex")   as string) ?? "0", 10);
      const totalChunks  = parseInt((formData.get("totalChunks")  as string) ?? "1", 10);
      const originalName = (formData.get("originalName") as string) || file?.name || "file";

      if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

      const chunkBuf = maybeDecompress(Buffer.from(await file.arrayBuffer()));

      if (uploadId && totalChunks > 1) {
        const tmpDir = await ensureTempDir();
        await writeFile(join(tmpDir, `${uploadId}_${chunkIndex}`), chunkBuf);
        if (chunkIndex < totalChunks - 1)
          return NextResponse.json({ status: "chunk_received", chunkIndex });

        const pieces: Buffer[] = [];
        for (let i = 0; i < totalChunks; i++) {
          const cp = join(tmpDir, `${uploadId}_${i}`);
          pieces.push(await readFile(cp));
          await unlink(cp).catch(() => {});
        }
        const finalBuf = Buffer.concat(pieces);
        const baseName = originalName.replace(/\.gz$/i, "");
        const ext      = baseName.split(".").pop() ?? "bin";
        const filename = `${uuidv4()}.${ext}`;
        const dir      = await ensureDir(category);
        await writeFile(join(dir, filename), finalBuf);
        return NextResponse.json({ url: `/api/files/${category}/${filename}`, filename, originalName: baseName });
      }

      const baseName = originalName.replace(/\.gz$/i, "");
      const ext      = baseName.split(".").pop() ?? "bin";
      const filename = `${uuidv4()}.${ext}`;
      const dir      = await ensureDir(category);
      await writeFile(join(dir, filename), chunkBuf);
      return NextResponse.json({ url: `/api/files/${category}/${filename}`, filename, originalName: baseName });
    } catch (err) {
      console.error("Render disk upload error:", err);
      return NextResponse.json({ error: String(err) }, { status: 500 });
    }
  }

  // ── Path 3: Proxy to Render (Vercel without Blob token, last resort) ──────
  const remoteBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (remoteBase) {
    try {
      const formData = await req.formData();
      const upstream = await fetch(`${remoteBase}/api/upload`, { method: "POST", body: formData });
      if (!upstream.ok) {
        const text = await upstream.text().catch(() => "");
        return NextResponse.json({ error: `Proxy ${upstream.status}: ${text.slice(0, 120)}` }, { status: upstream.status });
      }
      return NextResponse.json(await upstream.json());
    } catch (err) {
      return NextResponse.json({ error: `Proxy failed: ${String(err)}` }, { status: 502 });
    }
  }

  return NextResponse.json({ error: "No upload destination configured. Set BLOB_READ_WRITE_TOKEN on Vercel." }, { status: 501 });
}
