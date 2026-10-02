#!/usr/bin/env node
/**
 * One-off: decimate + bake scale/orientation for the hero models in
 * models-source/ and write them to public/models/. Ships end up bow=+Z,
 * keel at y=0, centered on XZ, `length` units long. Island is centered with
 * its lowest point at y=`yBase`.
 */
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { NodeIO } from "@gltf-transform/core";
import { KHRONOS_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, weld, simplify, prune, draco, getBounds, textureCompress } from "@gltf-transform/functions";
import { MeshoptSimplifier } from "meshoptimizer";
import draco3d from "draco3dgltf";
import sharp from "sharp";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const JOBS = [
  { src: "historical-ship.glb", out: "historical-ship.glb", kind: "ship", size: 14, ratio: 0.1, bowSign: +1 },
  { src: "pirate-ship.glb", out: "pirate-ship.glb", kind: "ship", size: 14, ratio: 0.08, bowSign: +1 },
  { src: "small-ship.glb", out: "small-ship.glb", kind: "ship", size: 11, ratio: 0.5, bowSign: -1 },
  { src: "cargo-ship.glb", out: "cargo-ship.glb", kind: "ship", size: 16, ratio: 0.8, bowSign: -1 },
  { src: "kraken.glb", out: "kraken.glb", kind: "ship", size: 20, ratio: 0.6, bowSign: +1 },
  { src: "island.glb", out: "island.glb", kind: "island", size: 150, ratio: 0.1, yBase: -4 },
];
const only = process.argv[2];

await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS).registerDependencies({
  "draco3d.decoder": await draco3d.createDecoderModule(),
  "draco3d.encoder": await draco3d.createEncoderModule(),
});

for (const j of JOBS) {
  if (only && !j.out.startsWith(only)) continue;
  const doc = await io.read(join(ROOT, "models-source", j.src));
  await doc.transform(
    dedup(), weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio: j.ratio, error: 0.01 }),
    prune(),
    textureCompress({ encoder: sharp, resize: [1024, 1024], targetFormat: "jpeg", quality: 85 }),
  );
  const scene = doc.getRoot().listScenes()[0];
  // Wrap everything under one transform node so we can bake scale/offset.
  const root = doc.createNode("normalize");
  for (const n of scene.listChildren()) { scene.removeChild(n); root.addChild(n); }
  scene.addChild(root);
  const b = getBounds(scene);
  const ext = [b.max[0]-b.min[0], b.max[1]-b.min[1], b.max[2]-b.min[2]];
  const cx = (b.max[0]+b.min[0])/2, cz = (b.max[2]+b.min[2])/2;
  if (j.kind === "ship") {
    // Long axis is X in the source. Rotate so it lies along Z (bow +Z).
    const s = j.size / ext[0];
    // rotation of -90° about Y maps +X -> +Z... (x,z)->(−z... ) computed below
    const ang = j.bowSign > 0 ? -Math.PI/2 : Math.PI/2;
    const q = [0, Math.sin(ang/2), 0, Math.cos(ang/2)];
    root.setRotation(q).setScale([s, s, s]);
    // Rotated center: x' = x cos + z sin, z' = -x sin + z cos
    const c = Math.cos(ang), sn = Math.sin(ang);
    const rx = cx*c + cz*sn, rz = -cx*sn + cz*c;
    root.setTranslation([-rx*s, -b.min[1]*s, -rz*s]);
  } else {
    const s = j.size / Math.max(ext[0], ext[2]);
    root.setScale([s, s, s]).setTranslation([-cx*s, j.yBase - b.min[1]*s, -cz*s]);
  }
  await doc.transform(draco({ method: "edgebreaker", quantizePosition: 14 }));
  await io.write(join(ROOT, "public", "models", j.out), doc);
  console.log(j.out, "ext", ext.map(v=>+v.toFixed(2)));
}
