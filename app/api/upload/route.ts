export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const maxDuration = 60;

// In-memory chunk accumulator (lives for the duration of the Vercel function
// instance — good enough since all chunks come in quick succession).
const chunkStore = new Map<string, Buffer[]>();

export async function POST(req: NextRequest) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: "BLOB_READ_WRITE_TOKEN not set — add it in Vercel → Settings → Environment Variables" },
        { status: 500 }
      );
    }

    const formData     = await req.formData();
    const file         = formData.get("file")         as File | null;
    const originalName = (formData.get("originalName") as string) || file?.name || "upload";
    const uploadId     = formData.get("uploadId")     as string | null;
    const chunkIndex   = parseInt((formData.get("chunkIndex")   as string) ?? "0", 10);
    const totalChunks  = parseInt((formData.get("totalChunks")  as string) ?? "1", 10);

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const chunkBuf = Buffer.from(await file.arrayBuffer());

    // ── Multi-chunk upload ──────────────────────────────────────────────────
    if (uploadId && totalChunks > 1) {
      if (!chunkStore.has(uploadId)) chunkStore.set(uploadId, []);
      const chunks = chunkStore.get(uploadId)!;
      chunks[chunkIndex] = chunkBuf;

      // Not the last chunk — just acknowledge
      if (chunkIndex < totalChunks - 1) {
        return NextResponse.json({ status: "chunk_received", chunkIndex });
      }

      // Last chunk — assemble and upload to Blob
      const finalBuf  = Buffer.concat(chunks);
      chunkStore.delete(uploadId);
      const baseName  = originalName.replace(/\.gz$/i, "");
      const blob      = await put(baseName, finalBuf, {
        access: "public",
        contentType: file.type || "application/octet-stream",
      });
      return NextResponse.json({ url: blob.url, originalName: baseName });
    }

    // ── Single chunk (small file) ───────────────────────────────────────────
    const baseName = originalName.replace(/\.gz$/i, "");
    const blob     = await put(baseName, chunkBuf, {
      access: "public",
      contentType: file.type || "application/octet-stream",
    });
    return NextResponse.json({ url: blob.url, originalName: baseName });

  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
