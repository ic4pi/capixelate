export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { put, del, head } from "@vercel/blob";
import { v4 as uuidv4 } from "uuid";

export const maxDuration = 60;

/**
 * If the blob was uploaded with `access: "public"` the returned URL is
 * directly reachable from any browser — no proxy needed. Wrapping every
 * upload in `/api/blob?u=…` forces the game to route asset loads through
 * a server proxy that (a) has to hold BLOB_READ_WRITE_TOKEN wherever the
 * API lives, and (b) has repeatedly broken silently. For public blobs
 * we hand the client the real URL directly. Only truly private blobs
 * (fallback path below) need the proxy.
 */
function isPublicBlobUrl(url: string): boolean {
  return /\.public\.blob\.vercel-storage\.com\//i.test(url);
}

function toClientUrl(blobUrl: string): string {
  return isPublicBlobUrl(blobUrl)
    ? blobUrl
    : `/api/blob?u=${encodeURIComponent(blobUrl)}`;
}

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
      const blob = await put(safeName, chunkBuf, { access: "public" }).catch(() =>
        put(safeName, chunkBuf, { access: "private" })
      );
      return NextResponse.json({ url: toClientUrl(blob.url), originalName: originalBase });
    }

    // ── Multi-chunk: store each chunk as a temp blob ───────────────────────
    const chunkKey = `_chunks/${uploadId}/${chunkIndex}`;
    await put(chunkKey, chunkBuf, { access: "public" }).catch(() =>
      put(chunkKey, chunkBuf, { access: "private" })
    );

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
    const blob     = await put(safeName, finalBuf, { access: "public" }).catch(() =>
      put(safeName, finalBuf, { access: "private" })
    );

    // Clean up temp chunk blobs (fire-and-forget)
    Promise.all(chunkUrls.map((u) => del(u))).catch(() => {});

    return NextResponse.json({ url: toClientUrl(blob.url), originalName: originalBase });

  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
