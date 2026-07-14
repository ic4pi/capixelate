# Source models

Drop uncompressed `.glb` / `.gltf` files here (from Blender exports,
Poly Haven downloads, Quaternius packs, etc.) and run:

```
npm run compress-models
```

The script runs Draco geometry compression + Meshopt on every file and
writes the result to `public/models/`. Typical compression ratio is
5–10× for triangle meshes with no visible quality loss.

This folder is **gitignored** — source files stay on your machine, only
the compressed outputs are committed.
