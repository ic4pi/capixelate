export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { head, getDownloadUrl } from "@vercel/blob";

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
 * Legacy proxy for uploaded assets. New uploads bypass this route by
 * returning the public blob URL directly (see /api/upload). This handler
 * still exists so that URLs already saved in the database keep working:
 *
 *   - Public blob URLs (…public.blob.vercel-storage.com/…) are simply
 *     redirected to their real location. No server-side head()/fetch
 *     dance and no BLOB_READ_WRITE_TOKEN required at request time —
 *     which fixes the case where the API host (e.g. Render) doesn't
 *     have the token but blobs live on Vercel.
 *   - Private blob URLs still get proxied server-side because the
 *     browser can't reach them without a signed download URL.
 */
export async function GET(req: NextRequest) {
  const blobUrl = req.nextUrl.searchParams.get("u");
  if (!blobUrl) return NextResponse.json({ error: "Missing ?u= param" }, { status: 400 });

  // Public blobs: hand the browser the direct URL. Faster + no token needed.
  if (/\.public\.blob\.vercel-storage\.com\//i.test(blobUrl)) {
    return NextResponse.redirect(blobUrl, 302);
  }

  const ext         = "." + (blobUrl.split("?")[0].split(".").pop() ?? "bin").toLowerCase();
  const contentType = MIME[ext] ?? "application/octet-stream";

  try {
    // Private blob path — needs a signed download URL from the SDK
    const info = await head(blobUrl).catch(() => null);
    const downloadUrl = info?.downloadUrl ?? getDownloadUrl(blobUrl);
    const res = await fetch(downloadUrl);

    if (!res.ok) throw new Error(`Blob responded ${res.status} for ${downloadUrl}`);

    return new NextResponse(res.body, {
      headers: {
        "Content-Type":  contentType,
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("Blob proxy error for", blobUrl, err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
