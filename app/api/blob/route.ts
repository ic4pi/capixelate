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

export async function GET(req: NextRequest) {
  const blobUrl = req.nextUrl.searchParams.get("u");
  if (!blobUrl) return NextResponse.json({ error: "Missing ?u= param" }, { status: 400 });

  const ext         = "." + (blobUrl.split("?")[0].split(".").pop() ?? "bin").toLowerCase();
  const contentType = MIME[ext] ?? "application/octet-stream";

  try {
    // Get blob metadata (confirms it exists and gives us the downloadUrl)
    const info = await head(blobUrl);

    // downloadUrl works for both public and private blobs when called server-side
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
    console.error("Blob proxy error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
