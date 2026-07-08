"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { GameEngine } from "@/lib/game/engine";
import type { GameState, IslandState } from "@/lib/game/types";
import GameHUD from "./GameHUD";

// All API calls and uploaded-file URLs are routed through this base.
// Set NEXT_PUBLIC_API_BASE_URL to the Render service URL on the Vercel deployment.
// Leave it empty for local dev or when the whole app runs on a single host.
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

function apiUrl(path: string) {
  return `${API_BASE}${path}`;
}

// Make a relative /api/files/... path absolute using the API base URL.
// Returns the path unchanged when already absolute (http/https).
function resolveFileUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE}${url}`;
}

interface ProjectData {
  id: string;
  title: string;
  description: string;
  url: string;
  iconUrl?: string;
  imageUrl?: string;
}

interface IslandData {
  id: string;
  name: string;
  posX: number;
  posZ: number;
  scale: number;
  modelUrl?: string;
  projects: ProjectData[];
}

interface EnemyData {
  id: string;
  name: string;
  type: string;
  modelUrl?: string;
  hitPoints: number;
  cannonAccuracy: number;
  difficulty: string;
  behavior: string;
  attackMode: string;
  fleeThreshold: number;
  lootValue: number;
  zoneX: number;
  zoneZ: number;
  zoneRadius: number;
  speed: number;
}

interface ShipData {
  id: string;
  name: string;
  type: string;
  modelUrl?: string;
}

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [hudState, setHudState] = useState<Partial<GameState>>({
    playerHealth: 100,
    playerMaxHealth: 100,
    playerCannonBalls: 40,
    playerGold: 0,
    playerSpeed: 0,
    playerPosition: { x: 0, z: 0 },
    lootMessages: [],
    fogOfWar: new Map(),
    gamePhase: "sailing",
    enemies: [],
  });
  const [nearbyIsland, setNearbyIsland] = useState<IslandState | null>(null);
  const [activeProject, setActiveProject] = useState<{
    title: string;
    description: string;
    url: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const handleIslandProximity = useCallback((island: IslandState) => {
    setNearbyIsland(island);
  }, []);

  const handleSailToIsland = useCallback(() => {
    engineRef.current?.fireSailToIsland();
  }, []);

  const handlePortalClick = useCallback(() => {
    if (nearbyIsland?.projectUrl) {
      window.open(nearbyIsland.projectUrl, "_blank");
    }
  }, [nearbyIsland]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let engine: GameEngine;

    const startGame = async () => {
      try {
        const [islandsRes, enemiesRes, shipsRes] = await Promise.all([
          fetch(apiUrl("/api/islands")),
          fetch(apiUrl("/api/enemies")),
          fetch(apiUrl("/api/ships")),
        ]);

        const islandsJson: { islands: IslandData[] } = await islandsRes.json();
        const enemiesJson: { enemies: EnemyData[] } = await enemiesRes.json();
        const shipsJson: { ships: ShipData[] } = await shipsRes.json();

        const islandsData: IslandState[] = (islandsJson.islands || []).map(
          (isl: IslandData) => ({
            id: isl.id,
            name: isl.name,
            modelUrl: resolveFileUrl(isl.modelUrl),
            position: { x: isl.posX, z: isl.posZ },
            scale: isl.scale,
            projectUrl: isl.projects?.[0]?.url,
            projectTitle: isl.projects?.[0]?.title,
            projectDescription: isl.projects?.[0]?.description,
            projectIconUrl: resolveFileUrl(isl.projects?.[0]?.iconUrl),
            projectImageUrl: resolveFileUrl(isl.projects?.[0]?.imageUrl),
            isDiscovered: false,
          })
        );

        const enemiesData = (enemiesJson.enemies || []).map((en: EnemyData) => ({
          id: en.id,
          name: en.name,
          type: en.type as "ship" | "monster",
          modelUrl: resolveFileUrl(en.modelUrl),
          position: {
            x: en.zoneX + (Math.random() - 0.5) * en.zoneRadius,
            z: en.zoneZ + (Math.random() - 0.5) * en.zoneRadius,
          },
          rotation: Math.random() * Math.PI * 2,
          health: en.hitPoints * 25,
          maxHealth: en.hitPoints * 25,
          state: "patrol" as const,
          behavior: en.behavior as "fight" | "flee" | "fleeBeforeSink",
          speed: en.speed,
          cannonAccuracy: en.cannonAccuracy,
          attackCooldown: 0,
          zoneX: en.zoneX,
          zoneZ: en.zoneZ,
          zoneRadius: en.zoneRadius,
          fleeThreshold: en.fleeThreshold,
          lootValue: en.lootValue,
          attackMode: en.attackMode,
        }));

        // Use the first ship of type "player" as the player ship model
        const playerShip = shipsJson.ships?.find(
          (s: ShipData) => s.type === "player"
        );
        const playerShipModelUrl = resolveFileUrl(playerShip?.modelUrl);

        engine = new GameEngine(canvas);
        engine.onStateUpdate = (state) =>
          setHudState((prev) => ({ ...prev, ...state }));
        engine.onIslandProximity = handleIslandProximity;
        engineRef.current = engine;

        await engine.init(islandsData, enemiesData, playerShipModelUrl);
        setLoading(false);
      } catch (err) {
        console.error("Game init error:", err);

        engine = new GameEngine(canvas);
        engine.onStateUpdate = (state) =>
          setHudState((prev) => ({ ...prev, ...state }));
        engine.onIslandProximity = handleIslandProximity;
        engineRef.current = engine;

        // Fallback islands — close enough to be visible from the start
        // and placed in front of the ship's initial heading (-Z direction)
        const defaultIslands: IslandState[] = [
          {
            id: "main",
            name: "Portfolio Island",
            position: { x: 0, z: -120 },
            scale: 1.2,
            projectUrl: undefined,
            projectTitle: "Explore Projects",
            projectDescription: "Visit this island to see your projects",
            isDiscovered: false,
          },
          {
            id: "island2",
            name: "Discovery Isle",
            position: { x: 200, z: -200 },
            scale: 0.9,
            isDiscovered: false,
          },
          {
            id: "island3",
            name: "Treasure Cove",
            position: { x: -180, z: -220 },
            scale: 1.0,
            isDiscovered: false,
          },
        ];

        await engine.init(defaultIslands, []);
        setLoading(false);
      }
    };

    startGame();

    const handleResize = () => {
      engineRef.current?.onResize();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      engine?.destroy();
    };
  }, [handleIslandProximity]);

  // Clear nearby island when the player moves away
  useEffect(() => {
    const interval = setInterval(() => {
      setNearbyIsland((prev) => {
        if (!prev || !engineRef.current) return null;
        const { playerPosition } = engineRef.current.gameState;
        const dx = prev.position.x - playerPosition.x;
        const dz = prev.position.z - playerPosition.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        return dist > 50 ? null : prev;
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-full">
      {loading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950">
          <div className="text-center">
            <div
              className="text-6xl font-bold text-cyan-400 mb-4 tracking-widest"
              style={{ fontFamily: "serif", textShadow: "0 0 30px #00ffcc" }}
            >
              CAPIXELATE
            </div>
            <div className="text-slate-400 text-lg mb-8">Charting the waters...</div>
            <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden mx-auto">
              <div
                className="h-full bg-cyan-400 rounded-full animate-pulse"
                style={{ width: "70%" }}
              />
            </div>
          </div>
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ touchAction: "none" }}
      />

      {!loading && (
        <GameHUD
          hudState={hudState}
          nearbyIsland={nearbyIsland}
          onSailToIsland={handleSailToIsland}
          onPortalClick={handlePortalClick}
          activeProject={activeProject}
          onCloseProject={() => setActiveProject(null)}
        />
      )}
    </div>
  );
}
