export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

/**
 * Lists every .glb / .gltf file bundled in public/models/ so the admin UI
 * can offer a dropdown of "already-in-the-repo" models to pick from.
 *
 * This means an admin can assign a 3D model to a Ship / Island / Enemy
 * without ever touching the Vercel Blob upload flow — pick from the list,
 * save, done. The engine treats "/models/foo.glb" the same as any other
 * URL, so bundled models and uploaded blobs work identically.
 */
export async function GET() {
  try {
    const modelsDir = join(process.cwd(), "public", "models");
    const files = await readdir(modelsDir).catch(() => []);

    const models = await Promise.all(
      files
        .filter((f) => /\.(glb|gltf)$/i.test(f))
        .sort()
        .map(async (name) => {
          const size = await stat(join(modelsDir, name))
            .then((s) => s.size)
            .catch(() => 0);
          return {
            name,
            url: `/models/${name}`,
            size,
            // Rough categorization from filename so the dropdown can group them
            category: /^ship-/.test(name)
              ? "ship"
              : /^palm-/.test(name)
                ? "palm"
                : /^rocks?-/.test(name)
                  ? "rock"
                  : "prop",
          };
        }),
    );

    return NextResponse.json({ models });
  } catch (err) {
    console.error("GET /api/models:", err);
    return NextResponse.json({ error: String(err), models: [] }, { status: 500 });
  }
}
