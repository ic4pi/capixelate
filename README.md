# Capixelate — Portfolio Seas

A highly creative, immersive pirate sailing portfolio experience built with Next.js, Three.js, and real-time WebGL water shaders.

## Features

### 🌊 Game Experience
- **Real-time 3D ocean** with custom GLSL wave shaders, foam, specular highlights, and moonlit reflections
- **Pirate ship** with keyboard controls, animated sails that billow in the wind, side cannons, and lantern lighting
- **Starry night sky** with moon and atmospheric fog
- **Multiple explorable islands** each with animated campfires and glowing portal icons linked to real projects
- **Enemy ships and sea monsters** with full AI state machines (patrol → chase → attack → flee)
- **Combat system** — fire cannons with SPACE, blow up enemies, collect loot gold
- **Fog-of-war minimap** that reveals as you explore
- **"Sail to Island"** shortcut button

### ⚙️ Admin Dashboard (`/admin`)
- **Project management** — add, edit, remove portfolio projects; assign them to islands
- **Island management** — place islands at world coordinates, set scale, upload custom 3D models
- **Enemy configuration** — full enemy builder:
  - Type: ship / sea monster
  - AI behavior: fight to death / flee immediately / flee before sinking
  - Attack mode: cannon / ram / tentacle / bite / charge
  - Stats: HP, cannon accuracy, speed, flee threshold
  - Patrol zone: set center and radius
  - Loot value and difficulty
  - Spawn count
  - Upload custom 3D model and loot image
- **Ships & Models** — upload custom `.glb`/`.gltf` 3D models for the player ship and others
- **Sea Map** — canvas overview of the full world showing island positions, enemy patrol zones, and player start

### 🗺️ World Map
The game world spans 2000×2000 units. Islands are placed in the north (negative Z), and enemy zones define where ships and monsters patrol.

## Controls

| Key | Action |
|-----|--------|
| `W` / `↑` | Sail forward |
| `S` / `↓` | Reverse |
| `A` / `←` | Turn left |
| `D` / `→` | Turn right |
| `SPACE` | Fire cannons (both sides) |

## Tech Stack

- **Next.js 16** (App Router, TypeScript)
- **Three.js** — custom GLSL shaders for water, WebGL rendering
- **Prisma 7** via `@prisma/adapter-libsql` — SQLite for dev, Turso for prod
- **Tailwind CSS v4**
- **JWT authentication** via `jose`
- **File upload** — [Vercel Blob](https://vercel.com/docs/vercel-blob) (set `BLOB_READ_WRITE_TOKEN`)

## Getting Started

```bash
cd capixelate
npm install
npx prisma migrate dev
npm run dev
```

Visit `http://localhost:3000` for the game.
Visit `http://localhost:3000/admin` for the dashboard.

**Default admin credentials:**
- Username: `admin`
- Password: `capixelate2024`

Change these via environment variables:
```env
ADMIN_USERNAME=yourusername
ADMIN_PASSWORD=yourpassword
NEXTAUTH_SECRET=your-secret-key
```

## Seeding Demo Data

After starting, visit `/admin` and click **✨ Seed Demo Data** to populate 3 islands, 3 projects, 2 enemy ships, and 2 sea monsters.

Or via curl:
```bash
curl -X POST http://localhost:3000/api/seed
```

## Deployment

Deployed on Vercel. Required environment variables:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Turso/libSQL URL (e.g. `libsql://your-db.turso.io`) |
| `TURSO_AUTH_TOKEN` | Auth token for the Turso database |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token for admin uploads |
| `NEXTAUTH_SECRET` | Strong random string used to sign admin JWTs |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Admin login |

After the first deploy, hit `/api/migrate?secret=<NEXTAUTH_SECRET>` once to create the tables.
