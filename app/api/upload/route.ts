export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { put, del, head } from "@vercel/blob";
import type { PutBlobResult } from "@vercel/blob";
import { v4 as uuidv4 } from "uuid";

export const maxDuration = 60;

/**
 * Try `access: "public"` first (produces a directly-loadable CDN URL),
 * fall back to `access: "private"` if the store rejects public uploads
 * (e.g. private-only stores return "access denied for this resource").
 * Private blobs work in the game via the /api/blob proxy route.
 */
async function putWithFallback(name: string, body: Buffer): Promise<PutBlobResult> {
  try {
    return await put(name, body, { access: "public" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Only swap to private for authorization/access-mode errors — real bugs
    // (network, 500s, quota) should propagate so we don't hide them.
    if (/access denied|not allowed|forbidden|private/i.test(msg)) {
      console.warn(`[upload] public put denied, retrying as private: ${msg}`);
      return await put(name, body, { access: "private" });
    }
    throw err;
  }
}

/**
 * Public blobs → return the CDN URL directly (no proxy hop).
 * Private blobs → wrap in /api/blob?u=… so the browser can fetch through
 * the server-side proxy that has the token to sign download URLs.
 */
function toClientUrl(blobUrl: string): string {
  return /\.public\.blob\.vercel-storage\.com\//i.test(blobUrl)
    ? blobUrl
    : `/api/blob?u=${encodeURIComponent(blobUrl)}`;
}

/**
 * Upload handler for the admin panel. Files go to Vercel Blob with public
 * access, and we return the raw `blob.url` — a CDN-backed URL that the
 * game can fetch directly with no server-side proxy. That URL is what
 * gets persisted on `Ship.modelUrl`, `Island.modelUrl`, `Enemy.modelUrl`,
 * `Project.iconUrl` etc.
 *
 * Historical note: earlier revisions wrapped every upload as
 * `/api/blob?u=<encoded_blob_url>` and proxied every asset request
 * server-side. That proxy silently failed in production so uploaded
 * assets never appeared in the game. `/api/blob` still exists to keep
 * legacy DB rows working — it just 302-redirects to the underlying URL.
 */
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
    const originalBase = originalName.replace(/\.gz$/i, "");
    const ext          = originalBase.split(".").pop() ?? "bin";
    // Use UUID filename to avoid special-char issues in blob paths
    const safeName     = `${uuidv4()}.${ext}`;

    // ── Single chunk (small file) ─────────────────────────────────────────
    if (!uploadId || totalChunks <= 1) {
      const blob = await putWithFallback(safeName, chunkBuf);
      return NextResponse.json({ url: toClientUrl(blob.url), originalName: originalBase });
    }

    // ── Multi-chunk: store each chunk as a temp blob, assemble on last chunk
    const chunkKey = `_chunks/${uploadId}/${chunkIndex}`;
    await putWithFallback(chunkKey, chunkBuf);

    // Not the last chunk — acknowledge and wait for more
    if (chunkIndex < totalChunks - 1) {
      return NextResponse.json({ status: "chunk_received", chunkIndex });
    }

    // Last chunk — fetch all chunks from Blob, assemble, upload final file
    const pieces: Buffer[] = [];
    const chunkUrls: string[] = [];

    for (let i = 0; i < totalChunks; i++) {
      const key = `_chunks/${uploadId}/${i}`;
      const info = await head(key).catch(() => null);
      if (!info?.url) {
        return NextResponse.json({ error: `Missing chunk ${i} — please retry the upload` }, { status: 500 });
      }
      const resp = await fetch(info.url);
      pieces.push(Buffer.from(await resp.arrayBuffer()));
      chunkUrls.push(info.url);
    }

    const finalBuf = Buffer.concat(pieces);
    const blob     = await putWithFallback(safeName, finalBuf);

    // Clean up temp chunk blobs (fire-and-forget)
    Promise.all(chunkUrls.map((u) => del(u))).catch(() => {});

    return NextResponse.json({ url: toClientUrl(blob.url), originalName: originalBase });

  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
