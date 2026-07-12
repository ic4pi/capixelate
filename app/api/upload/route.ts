export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const maxDuration = 60;

/**
 * Upload files to Vercel Blob using server-side put().
 * Client sends FormData → server streams to Blob CDN → returns public URL.
 * No token dance, no callbacks, no Render dependency.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const originalName = (formData.get("originalName") as string) || file?.name || "upload";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: "BLOB_READ_WRITE_TOKEN not set on Vercel — add it in Settings → Environment Variables" },
        { status: 500 }
      );
    }

    const baseName = originalName.replace(/\.gz$/i, "");
    const blob = await put(baseName, file, {
      access: "public",
      contentType: file.type || "application/octet-stream",
    });

    return NextResponse.json({ url: blob.url, originalName: baseName });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
