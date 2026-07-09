"use client";
import { useState, useEffect, useCallback } from "react";
import type { GameState, IslandState } from "@/lib/game/types";

interface GameHUDProps {
  hudState: Partial<GameState>;
  nearbyIsland: IslandState | null;
  onIsland: boolean;
  onSailToIsland: () => void;
  onPortalClick: () => void;
  onDock: () => void;
  onLeaveIsland: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleCam: () => void;
  activeProject: { title: string; description: string; url: string } | null;
  onCloseProject: () => void;
  onTouchInput: (key: "forward" | "backward" | "left" | "right" | "fire", pressed: boolean) => void;
}

export default function GameHUD({
  hudState,
  nearbyIsland,
  onIsland,
  onSailToIsland,
  onPortalClick,
  onDock,
  onLeaveIsland,
  onZoomIn,
  onZoomOut,
  onToggleCam,
  activeProject,
  onCloseProject,
  onTouchInput,
}: GameHUDProps) {
  const [showControls, setShowControls] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const health = hudState.playerHealth ?? 100;
  const maxHealth = hudState.playerMaxHealth ?? 100;
  const healthPct = Math.max(0, (health / maxHealth) * 100);
  const cannonBalls = hudState.playerCannonBalls ?? 40;
  const gold = hudState.playerGold ?? 0;
  const speed = Math.abs(hudState.playerSpeed ?? 0);
  const pos = hudState.playerPosition ?? { x: 0, z: 0 };
  const fogOfWar = hudState.fogOfWar ?? new Map();
  const enemies = hudState.enemies ?? [];
  const phase = hudState.gamePhase ?? "sailing";

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Minimap: smaller on mobile
  const MAP_SIZE = isMobile ? 120 : 180;
  const WORLD_SCALE = MAP_SIZE / 600;

  const worldToMap = useCallback(
    (x: number, z: number) => ({
      mx: MAP_SIZE / 2 + (x - pos.x) * WORLD_SCALE,
      mz: MAP_SIZE / 2 + (z - pos.z) * WORLD_SCALE,
    }),
    [MAP_SIZE, WORLD_SCALE, pos.x, pos.z]
  );

  return (
    <>
      {/* ===== TOP HUD BAR ===== */}
      {isMobile ? (
        /* Mobile top bar: compact single row */
        <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
          {/* Title row */}
          <div className="flex items-center justify-between px-3 pt-2 pb-1">
            <div
              className="pointer-events-auto text-lg font-bold tracking-[0.25em]"
              style={{ fontFamily: "serif", color: "#f59e0b", textShadow: "0 0 16px #f59e0b88" }}
            >
              CAPIXELATE
            </div>
            {/* Compact stats */}
            <div
              className="pointer-events-auto flex items-center gap-2 text-xs font-mono px-2 py-1 rounded-lg"
              style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(245,158,11,0.2)" }}
            >
              <span className="text-orange-400">💣</span>
              <span className="text-white">{cannonBalls}</span>
              <span className="text-slate-600">|</span>
              <span className="text-yellow-400">🪙</span>
              <span className="text-yellow-300 font-bold">{gold}</span>
            </div>
          </div>
          {/* Health bar — thin strip */}
          <div className="pointer-events-auto mx-3 mb-1">
            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${healthPct}%`,
                  background:
                    healthPct > 50
                      ? "linear-gradient(90deg, #16a34a, #22c55e)"
                      : healthPct > 25
                      ? "linear-gradient(90deg, #b45309, #f59e0b)"
                      : "linear-gradient(90deg, #991b1b, #ef4444)",
                  boxShadow: `0 0 6px ${
                    healthPct > 50 ? "#22c55e" : healthPct > 25 ? "#f59e0b" : "#ef4444"
                  }66`,
                }}
              />
            </div>
          </div>
        </div>
      ) : (
        /* Desktop top bar: 3-column layout */
        <div className="absolute top-0 left-0 right-0 pointer-events-none z-10">
          <div className="flex items-start justify-between p-3 gap-3">
            {/* Health panel */}
            <div className="pointer-events-auto bg-black/60 backdrop-blur-sm border border-amber-900/50 rounded-xl p-3 min-w-[200px]">
              <div className="text-xs text-amber-400/80 uppercase tracking-widest mb-1.5 font-mono">
                Hull Integrity
              </div>
              <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${healthPct}%`,
                    background:
                      healthPct > 50
                        ? "linear-gradient(90deg, #16a34a, #22c55e)"
                        : healthPct > 25
                        ? "linear-gradient(90deg, #b45309, #f59e0b)"
                        : "linear-gradient(90deg, #991b1b, #ef4444)",
                    boxShadow: `0 0 8px ${
                      healthPct > 50 ? "#22c55e" : healthPct > 25 ? "#f59e0b" : "#ef4444"
                    }66`,
                  }}
                />
              </div>
              <div className="text-xs text-slate-400 mt-1 font-mono">
                {Math.round(health)}/{maxHealth}
              </div>
            </div>

            {/* Title */}
            <div className="pointer-events-auto text-center">
              <div
                className="text-3xl font-bold tracking-[0.3em] text-amber-300"
                style={{
                  fontFamily: "serif",
                  textShadow: "0 0 20px #f59e0b88, 0 0 40px #f59e0b44",
                }}
              >
                CAPIXELATE
              </div>
              <div className="text-xs text-slate-500 tracking-widest">PORTFOLIO WATERS</div>
            </div>

            {/* Resources panel */}
            <div className="pointer-events-auto bg-black/60 backdrop-blur-sm border border-amber-900/50 rounded-xl p-3 min-w-[170px]">
              <div className="flex items-center gap-3 text-sm font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">⚓</span>
                  <span className="text-white">{Math.round(speed * 10) / 10}</span>
                  <span className="text-slate-500 text-xs">kn</span>
                </div>
                <div className="w-px h-4 bg-slate-700" />
                <div className="flex items-center gap-1.5">
                  <span className="text-orange-400">💣</span>
                  <span className="text-white">{cannonBalls}</span>
                </div>
                <div className="w-px h-4 bg-slate-700" />
                <div className="flex items-center gap-1.5">
                  <span className="text-yellow-400">🪙</span>
                  <span className="text-yellow-300 font-bold">{gold}</span>
                </div>
              </div>
              <div className="text-xs text-slate-600 mt-1 font-mono">
                {Math.round(pos.x)}, {Math.round(pos.z)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MINIMAP (bottom-right) ===== */}
      {!isMobile && (
        <div className="absolute bottom-4 right-4 z-10 pointer-events-none">
          <div
            className="bg-black/70 backdrop-blur-sm border border-amber-900/60 rounded-xl overflow-hidden"
            style={{ width: MAP_SIZE + 16, height: MAP_SIZE + 36 }}
          >
            <div className="text-[10px] text-amber-500/70 uppercase tracking-widest px-2 py-1 font-mono border-b border-amber-900/30">
              Sea Chart
            </div>
            <div className="relative" style={{ width: MAP_SIZE, height: MAP_SIZE }}>
              <div className="absolute inset-0 bg-slate-900/90" />

              {/* Fog of war */}
              <div className="absolute inset-0 pointer-events-none">
                {Array.from(fogOfWar.entries()).map(([key]) => {
                  const [tx, tz] = key.split(",").map(Number);
                  const rx = MAP_SIZE / 2 + (tx * 100 - pos.x) * WORLD_SCALE;
                  const rz = MAP_SIZE / 2 + (tz * 100 - pos.z) * WORLD_SCALE;
                  return (
                    <div
                      key={key}
                      className="absolute bg-cyan-900/20"
                      style={{
                        left: rx,
                        top: rz,
                        width: 100 * WORLD_SCALE,
                        height: 100 * WORLD_SCALE,
                      }}
                    />
                  );
                })}
              </div>

              {/* Enemy dots */}
              {enemies
                .filter((e) => e.state !== "dead")
                .map((enemy) => {
                  const { mx, mz } = worldToMap(enemy.position.x, enemy.position.z);
                  if (mx < 0 || mx > MAP_SIZE || mz < 0 || mz > MAP_SIZE) return null;
                  return (
                    <div
                      key={enemy.id}
                      className="absolute w-2 h-2 rounded-full -translate-x-1 -translate-y-1"
                      style={{
                        left: mx,
                        top: mz,
                        background: enemy.type === "monster" ? "#a855f7" : "#ef4444",
                        boxShadow: `0 0 4px ${enemy.type === "monster" ? "#a855f7" : "#ef4444"}`,
                      }}
                    />
                  );
                })}

              {/* Player dot */}
              <div
                className="absolute w-3 h-3 rounded-full -translate-x-1.5 -translate-y-1.5 z-10"
                style={{
                  left: MAP_SIZE / 2,
                  top: MAP_SIZE / 2,
                  background: "#22d3ee",
                  boxShadow: "0 0 8px #22d3ee",
                }}
              />

              {/* Island markers */}
              {hudState.islands?.map((isl) => {
                const { mx, mz } = worldToMap(isl.position.x, isl.position.z);
                if (mx < 0 || mx > MAP_SIZE || mz < 0 || mz > MAP_SIZE) return null;
                return (
                  <div
                    key={isl.id}
                    className="absolute w-3 h-3 rounded-sm -translate-x-1.5 -translate-y-1.5"
                    style={{
                      left: mx,
                      top: mz,
                      background: "#22c55e",
                      boxShadow: "0 0 6px #22c55e88",
                    }}
                  />
                );
              })}

              <div
                className="absolute inset-0 rounded-none"
                style={{ boxShadow: "inset 0 0 20px rgba(0,0,0,0.7)" }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ===== CONTROLS HINT (desktop, bottom-left) ===== */}
      {!isMobile && (
        <div className="absolute bottom-4 left-4 z-10">
          <button
            onClick={() => setShowControls(!showControls)}
            className="text-xs text-slate-500 hover:text-amber-400 transition-colors mb-2 block font-mono tracking-wide"
          >
            {showControls ? "▼ Hide Controls" : "▲ Show Controls"}
          </button>
          {showControls && (
            <div className="bg-black/60 backdrop-blur-sm border border-amber-900/50 rounded-xl p-3 text-xs font-mono text-slate-400 space-y-1">
              <div className="text-amber-400/80 text-[10px] uppercase tracking-widest mb-2">
                Controls
              </div>
              <div className="flex items-center gap-2">
                <kbd className="bg-slate-800 border border-slate-600 px-1.5 py-0.5 rounded text-[10px] text-white">
                  W
                </kbd>
                <kbd className="bg-slate-800 border border-slate-600 px-1.5 py-0.5 rounded text-[10px] text-white">
                  ↑
                </kbd>
                <span>Sail Forward</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="bg-slate-800 border border-slate-600 px-1.5 py-0.5 rounded text-[10px] text-white">
                  S
                </kbd>
                <kbd className="bg-slate-800 border border-slate-600 px-1.5 py-0.5 rounded text-[10px] text-white">
                  ↓
                </kbd>
                <span>Reverse</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="bg-slate-800 border border-slate-600 px-1.5 py-0.5 rounded text-[10px] text-white">
                  A
                </kbd>
                <kbd className="bg-slate-800 border border-slate-600 px-1.5 py-0.5 rounded text-[10px] text-white">
                  D
                </kbd>
                <span>Steer</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="bg-slate-800 border border-slate-600 px-2 py-0.5 rounded text-[10px] text-white">
                  Space
                </kbd>
                <span>Fire Cannons</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="bg-slate-800 border border-slate-600 px-1.5 py-0.5 rounded text-[10px] text-white">
                  Scroll
                </kbd>
                <span>Zoom</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="bg-slate-800 border border-slate-600 px-1.5 py-0.5 rounded text-[10px] text-white">
                  C
                </kbd>
                <span>Camera Mode</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== SAIL / DOCK BUTTONS (desktop) ===== */}
      {!isMobile && !onIsland && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-3">
          <button
            onClick={onSailToIsland}
            className="px-6 py-3 bg-amber-900/60 hover:bg-amber-700/70 border border-amber-400/40 hover:border-amber-400/80 rounded-xl text-amber-300 text-sm font-bold tracking-widest transition-all duration-200 backdrop-blur-sm"
            style={{ textShadow: "0 0 10px #f59e0b88" }}
          >
            ⚓ SAIL TO NEAREST ISLAND
          </button>
          {nearbyIsland && (
            <button
              onClick={onDock}
              className="px-6 py-3 rounded-xl text-sm font-bold tracking-widest transition-all duration-200 backdrop-blur-sm"
              style={{
                background: "rgba(0,20,15,0.85)",
                border: "1.5px solid #00ffcc99",
                color: "#00ffcc",
                boxShadow: "0 0 20px #00ffcc44",
                textShadow: "0 0 10px #00ffcc88",
              }}
            >
              🏝 DOCK &amp; EXPLORE
            </button>
          )}
        </div>
      )}

      {/* ===== ON-ISLAND BANNER (top of screen when walking on island) ===== */}
      {onIsland && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
          <div
            className="flex items-center gap-3 px-5 py-2.5 rounded-2xl"
            style={{
              background: "rgba(0,0,0,0.78)",
              border: "1.5px solid #00ffcc88",
              boxShadow: "0 0 24px #00ffcc33",
            }}
          >
            <span className="text-cyan-300 text-sm font-mono tracking-widest">
              🏝 EXPLORING ISLAND
            </span>
            <span className="text-slate-500 text-xs font-mono">
              WASD / arrows to walk
            </span>
            <button
              onClick={onLeaveIsland}
              className="text-xs font-bold px-3 py-1.5 rounded-lg ml-2"
              style={{
                background: "rgba(180,30,30,0.7)",
                border: "1px solid #ef444466",
                color: "#fca5a5",
              }}
            >
              ✕ LEAVE
            </button>
          </div>
        </div>
      )}

      {/* ===== MOBILE TOUCH CONTROLS ===== */}
      {isMobile && (
        <MobileTouchControls
          onTouchInput={onTouchInput}
          onSailToIsland={onSailToIsland}
          onDock={onDock}
          onLeaveIsland={onLeaveIsland}
          onZoomIn={onZoomIn}
          onZoomOut={onZoomOut}
          onToggleCam={onToggleCam}
          nearIsland={!!nearbyIsland}
          onIsland={onIsland}
        />
      )}

      {/* ===== NEARBY ISLAND — DOCKED VIEW ===== */}
      {nearbyIsland && (
        <>
          {nearbyIsland.projectImageUrl && (
            <div
              className="absolute inset-0 z-20 pointer-events-none"
              style={{
                backgroundImage: `url(${nearbyIsland.projectImageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                opacity: 0.45,
              }}
            />
          )}

          <div
            className="absolute inset-0 z-20 pointer-events-none"
            style={{
              background: nearbyIsland.projectImageUrl
                ? "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.5) 100%)"
                : "none",
            }}
          />

          {/* Island info panel */}
          <div
            className="absolute z-30 pointer-events-auto w-full max-w-md px-4"
            style={{ bottom: isMobile ? "160px" : "128px", left: "50%", transform: "translateX(-50%)" }}
          >
            <div
              className="rounded-2xl p-4 sm:p-6 text-center"
              style={{
                background: "rgba(0,0,0,0.72)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(0,255,204,0.35)",
                boxShadow: "0 0 50px rgba(0,255,204,0.2), 0 8px 32px rgba(0,0,0,0.6)",
              }}
            >
              <div className="flex items-center justify-center gap-3 mb-3">
                {nearbyIsland.projectIconUrl ? (
                  <img
                    src={nearbyIsland.projectIconUrl}
                    alt=""
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-md object-contain"
                    style={{ filter: "drop-shadow(0 0 6px #f59e0b88)" }}
                  />
                ) : (
                  <span className="text-2xl sm:text-3xl">🏝️</span>
                )}
                <div
                  className="text-xl sm:text-2xl font-bold text-cyan-200"
                  style={{ fontFamily: "serif", textShadow: "0 0 16px #f59e0b66" }}
                >
                  {nearbyIsland.name}
                </div>
              </div>

              {nearbyIsland.projectTitle && (
                <div className="text-amber-400 text-sm font-semibold tracking-wide mb-1">
                  {nearbyIsland.projectTitle}
                </div>
              )}

              {nearbyIsland.projectDescription && (
                <div className="text-slate-300 text-sm mb-4 leading-relaxed">
                  {nearbyIsland.projectDescription}
                </div>
              )}

              {nearbyIsland.projectUrl ? (
                <button
                  onClick={onPortalClick}
                  className="w-full py-3 rounded-xl text-white font-bold text-sm tracking-widest transition-all duration-200 hover:scale-105"
                  style={{
                    background: "linear-gradient(135deg, #92400e, #b45309)",
                    boxShadow: "0 0 24px #f59e0b55, inset 0 1px 0 rgba(255,255,255,0.15)",
                  }}
                >
                  🌀 Enter Portal
                </button>
              ) : (
                <div className="text-slate-500 text-sm italic">
                  This island awaits a project...
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ===== LOOT MESSAGES ===== */}
      <div className="absolute top-20 sm:top-24 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center gap-2">
        {(hudState.lootMessages ?? []).map((msg) => (
          <div
            key={msg.id}
            className="text-yellow-300 font-bold text-base sm:text-lg font-mono tracking-wide px-4 py-2 bg-black/40 rounded-lg"
            style={{
              opacity: msg.opacity,
              textShadow: "0 0 10px #fbbf24",
              transform: `translateY(-${(1 - msg.opacity) * 30}px)`,
              transition: "none",
            }}
          >
            {msg.message}
          </div>
        ))}
      </div>

      {/* ===== GAME OVER ===== */}
      {phase === "dead" && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="text-center">
            <div className="text-5xl sm:text-6xl mb-4">💀</div>
            <div
              className="text-3xl sm:text-4xl font-bold text-red-400 mb-4"
              style={{ fontFamily: "serif", textShadow: "0 0 20px #ef4444" }}
            >
              SHIP SUNK
            </div>
            <div className="text-slate-400 mb-6">
              Gold collected:{" "}
              <span className="text-yellow-400 font-bold">{gold}</span>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-red-900/60 hover:bg-red-700/60 border border-red-400/40 rounded-xl text-red-300 font-bold tracking-widest"
            >
              SAIL AGAIN
            </button>
          </div>
        </div>
      )}

      {/* ===== ACTIVE PROJECT MODAL ===== */}
      {activeProject && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div
            className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 sm:p-8 max-w-lg w-full"
            style={{ boxShadow: "0 0 60px #f59e0b22" }}
          >
            <h2 className="text-xl sm:text-2xl font-bold text-amber-300 mb-3">
              {activeProject.title}
            </h2>
            <p className="text-slate-300 mb-6 text-sm sm:text-base">{activeProject.description}</p>
            <div className="flex gap-3">
              <a
                href={activeProject.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 rounded-xl text-white font-bold text-center transition-all text-sm"
              >
                Visit Project
              </a>
              <button
                onClick={onCloseProject}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition-all text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ===== MOBILE TOUCH CONTROLS COMPONENT ===== */

type TouchKey = "forward" | "backward" | "left" | "right" | "fire";

interface MobileTouchControlsProps {
  onTouchInput: (key: TouchKey, pressed: boolean) => void;
  onSailToIsland: () => void;
  onDock: () => void;
  onLeaveIsland: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleCam: () => void;
  nearIsland: boolean;
  onIsland: boolean;
}

function MobileTouchControls({
  onTouchInput,
  onSailToIsland,
  onDock,
  onLeaveIsland,
  onZoomIn,
  onZoomOut,
  onToggleCam,
  nearIsland,
  onIsland,
}: MobileTouchControlsProps) {
  const [camMode, setCamMode] = useState(0);

  const btnStyle = (color = "#f59e0b"): React.CSSProperties => ({
    background: "rgba(0,0,0,0.65)",
    border: `1.5px solid ${color}55`,
    borderRadius: "10px",
    color: color,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
    userSelect: "none",
    WebkitUserSelect: "none",
    touchAction: "none",
    boxShadow: `0 0 10px ${color}22`,
  });

  const makeHandlers = (key: TouchKey) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      onTouchInput(key, true);
    },
    onPointerUp: () => onTouchInput(key, false),
    onPointerCancel: () => onTouchInput(key, false),
    onPointerLeave: () => onTouchInput(key, false),
  });

  const handleToggleCam = () => {
    onToggleCam();
    setCamMode((m) => (m === 0 ? 1 : 0));
  };

  return (
    <div className="absolute bottom-4 left-0 right-0 z-10 flex items-end justify-between px-4">
      {/* D-pad on the left */}
      <div className="flex flex-col items-center gap-1.5">
        {/* Forward */}
        <div
          style={{ ...btnStyle(), width: 54, height: 54 }}
          {...makeHandlers("forward")}
        >
          ▲
        </div>
        {/* Left / Right row */}
        <div className="flex gap-1.5">
          <div
            style={{ ...btnStyle(), width: 54, height: 54 }}
            {...makeHandlers("left")}
          >
            ◀
          </div>
          <div
            style={{ ...btnStyle("#334155"), width: 54, height: 54 }}
            {...makeHandlers("backward")}
          >
            ▼
          </div>
          <div
            style={{ ...btnStyle(), width: 54, height: 54 }}
            {...makeHandlers("right")}
          >
            ▶
          </div>
        </div>
      </div>

      {/* Right side: camera controls + sail/dock + fire */}
      <div className="flex flex-col items-end gap-1.5">
        {/* Zoom + Camera mode row */}
        <div className="flex items-center gap-1.5">
          {/* Camera mode toggle */}
          <button
            onClick={handleToggleCam}
            className="text-[10px] font-bold tracking-wide px-2 py-1.5 rounded-lg"
            style={{
              background: "rgba(0,0,0,0.65)",
              border: `1.5px solid ${camMode === 1 ? "#a78bfa" : "#64748b"}88`,
              color: camMode === 1 ? "#a78bfa" : "#94a3b8",
              boxShadow: camMode === 1 ? "0 0 10px #a78bfa33" : "none",
              minWidth: 52,
            }}
          >
            {camMode === 0 ? "🎯 DECK" : "🎥 HOVER"}
          </button>
          {/* Zoom out */}
          <button
            onClick={onZoomOut}
            style={{ ...btnStyle("#64748b"), width: 40, height: 40, fontSize: "20px", touchAction: "manipulation" }}
          >
            −
          </button>
          {/* Zoom in */}
          <button
            onClick={onZoomIn}
            style={{ ...btnStyle("#64748b"), width: 40, height: 40, fontSize: "20px", touchAction: "manipulation" }}
          >
            +
          </button>
        </div>

        {/* Sail / Dock / Leave button */}
        {onIsland ? (
          <button
            onClick={onLeaveIsland}
            className="text-[11px] font-bold tracking-wide px-3 py-2 rounded-lg"
            style={{
              background: "rgba(120,10,10,0.85)",
              border: "1.5px solid #ef444488",
              color: "#fca5a5",
              boxShadow: "0 0 14px #ef444433",
            }}
          >
            ✕ LEAVE
          </button>
        ) : nearIsland ? (
          <button
            onClick={onDock}
            className="text-[11px] font-bold tracking-wide px-3 py-2 rounded-lg"
            style={{
              background: "rgba(0,20,10,0.85)",
              border: "1.5px solid #00ffcc88",
              color: "#00ffcc",
              boxShadow: "0 0 14px #00ffcc44",
            }}
          >
            🏝 DOCK
          </button>
        ) : (
          <button
            onClick={onSailToIsland}
            className="text-[10px] font-bold tracking-wide px-3 py-2 rounded-lg"
            style={{
              background: "rgba(0,0,0,0.65)",
              border: "1.5px solid #f59e0b55",
              color: "#f59e0b",
              boxShadow: "0 0 10px #f59e0b22",
            }}
          >
            ⚓ TO ISLAND
          </button>
        )}

        {/* Fire button */}
        <div
          style={{ ...btnStyle("#ef4444"), width: 72, height: 72, borderRadius: "50%", fontSize: "24px" }}
          {...makeHandlers("fire")}
        >
          💣
        </div>
      </div>
    </div>
  );
}
