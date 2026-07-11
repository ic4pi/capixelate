export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

/**
 * Vercel Blob client upload token endpoint.
 *
 * The browser calls @vercel/blob/client → upload() which POSTs a JSON body
 * here to get a signed upload token, then uploads the file directly to
 * Vercel's CDN.  No Render, no chunking, no proxying, no size cap issues.
 *
 * Requires BLOB_READ_WRITE_TOKEN on Vercel (created via the Blob store).
 */
export async function POST(req: NextRequest) {
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
          "image/png",
          "image/jpeg",
          "image/webp",
          "image/gif",
          "image/svg+xml",
        ],
        maximumSizeInBytes: 200 * 1024 * 1024, // 200 MB
      }),
      onUploadCompleted: async ({ blob }) => {
        console.log("Blob upload complete:", blob.url);
      },
    });
    return NextResponse.json(response);
  } catch (err) {
    console.error("Blob upload error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
