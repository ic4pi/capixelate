export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { list } from "@vercel/blob";

const MIME: Record<string, string> = {
  ".glb":  "model/gltf-binary",
  ".gltf": "model/gltf+json",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif":  "image/gif",
  ".svg":  "image/svg+xml",
};

/**
 * Server-side proxy for Vercel Blob files.
 * Works regardless of whether the store is public or private because
 * the server has the BLOB_READ_WRITE_TOKEN.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const blobPath = path.map(decodeURIComponent).join("/");

  try {
    const { blobs } = await list({ prefix: blobPath, limit: 1 });
    if (!blobs.length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const blob = blobs[0];
    const res  = await fetch(blob.downloadUrl);
    if (!res.ok) return NextResponse.json({ error: "Blob fetch failed" }, { status: 500 });

    const ext         = "." + blobPath.split(".").pop()!.toLowerCase();
    const contentType = MIME[ext] ?? "application/octet-stream";

    return new NextResponse(res.body, {
      headers: {
        "Content-Type":  contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
