export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

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
 * Proxy any Vercel Blob URL through the server.
 * Works for both public and private stores since the server
 * has BLOB_READ_WRITE_TOKEN.
 * Usage: /api/blob?u=https://xxx.blob.vercel-storage.com/file.glb
 */
export async function GET(req: NextRequest) {
  const blobUrl = req.nextUrl.searchParams.get("u");
  if (!blobUrl) return NextResponse.json({ error: "Missing ?u= param" }, { status: 400 });

  try {
    const res = await fetch(blobUrl, {
      headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN ?? ""}` },
    });

    if (!res.ok) {
      // Try download URL variant
      const dlUrl = blobUrl.includes("?") ? blobUrl : blobUrl + "?download=1";
      const res2  = await fetch(dlUrl);
      if (!res2.ok) return NextResponse.json({ error: `Blob fetch failed: ${res.status}` }, { status: 500 });
      return streamBlob(res2, blobUrl);
    }

    return streamBlob(res, blobUrl);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

function streamBlob(res: Response, url: string) {
  const ext = "." + (url.split("?")[0].split(".").pop() ?? "bin").toLowerCase();
  return new NextResponse(res.body, {
    headers: {
      "Content-Type":  MIME[ext] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
