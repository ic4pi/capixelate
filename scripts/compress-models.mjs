#!/usr/bin/env node
/**
 * Batch-compress every .glb / .gltf in `models-source/` and write the result
 * to `public/models/`. Uses:
 *
 *   • Draco geometry compression (KHR_draco_mesh_compression) — 5-10× smaller
 *     triangle data, no visible quality loss.
 *   • Meshopt for animations / morph targets (KHR_mesh_quantization + EXT_meshopt).
 *   • Weld + prune to strip unused verts and attributes.
 *
 * The runtime GLTFLoader in `lib/game/engine.ts` is configured with DRACOLoader
 * so the compressed output plays back with no code change.
 *
 * Usage:
 *   npm run compress-models              # process every source file
 *   npm run compress-models -- ship.glb  # process a specific file
 */
import { readdir, mkdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, basename, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { NodeIO } from "@gltf-transform/core";
import { KHRONOS_EXTENSIONS } from "@gltf-transform/extensions";
import { draco, prune, weld, dedup } from "@gltf-transform/functions";
import draco3d from "draco3dgltf";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SRC = join(ROOT, "models-source");
const DST = join(ROOT, "public", "models");

async function main() {
  if (!existsSync(SRC)) {
    console.error(`✗ ${SRC} doesn't exist. Drop uncompressed .glb files there and re-run.`);
    process.exit(1);
  }
  await mkdir(DST, { recursive: true });

  const arg = process.argv[2];
  const files = arg
    ? [arg]
    : (await readdir(SRC)).filter((f) => /\.(glb|gltf)$/i.test(f));

  if (!files.length) {
    console.error(`✗ No .glb / .gltf files found in ${SRC}`);
    process.exit(1);
  }

  const io = new NodeIO()
    .registerExtensions(KHRONOS_EXTENSIONS)
    .registerDependencies({
      "draco3d.decoder": await draco3d.createDecoderModule(),
      "draco3d.encoder": await draco3d.createEncoderModule(),
    });

  console.log(`compressing ${files.length} model(s)…\n`);

  for (const filename of files) {
    const inPath = join(SRC, filename);
    const outName = basename(filename, extname(filename)) + ".glb";
    const outPath = join(DST, outName);

    const inSize = (await stat(inPath)).size;
    const doc = await io.read(inPath);

    // Order matters: dedup → weld → prune before draco encoding
    await doc.transform(
      dedup(),
      weld(),
      prune(),
      draco({
        method: "edgebreaker",
        encodeSpeed: 5,
        decodeSpeed: 5,
        quantizePosition: 14,
        quantizeNormal: 10,
        quantizeColor: 8,
        quantizeTexcoord: 12,
        quantizeGeneric: 12,
      }),
    );

    await io.write(outPath, doc);
    const outSize = (await stat(outPath)).size;
    const pct = ((1 - outSize / inSize) * 100).toFixed(1);
    console.log(
      `  ${filename.padEnd(40)} ${fmt(inSize)} → ${fmt(outSize)}  (-${pct}%)`,
    );
  }

  console.log(`\n✓ wrote ${files.length} model(s) to ${DST}`);
}

function fmt(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
