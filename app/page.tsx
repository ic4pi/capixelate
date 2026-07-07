"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import WakeScreen from "@/components/game/WakeScreen";

const GameCanvas = dynamic(() => import("@/components/game/GameCanvas"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950">
      <div
        className="text-5xl font-bold tracking-[0.3em] text-cyan-400 mb-4"
        style={{ fontFamily: "serif", textShadow: "0 0 30px #00ffcc" }}
      >
        CAPIXELATE
      </div>
      <div className="text-slate-500 text-sm tracking-widest">
        Loading the seas...
      </div>
    </div>
  ),
});

export default function Home() {
  // null  = still probing
  // true  = server is warm, show game
  // false = server is cold, show wake screen
  const [serverReady, setServerReady] = useState<boolean | null>(null);
  const probeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const base =
      process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";

    const probe = async () => {
      // After 1.5 s of no response, show the wake screen
      probeTimer.current = setTimeout(() => {
        if (!cancelled) setServerReady(false);
      }, 1500);

      try {
        const start = performance.now();
        const res = await fetch(`${base}/api/healthcheck`, {
          cache: "no-store",
          signal: AbortSignal.timeout(5000),
        });
        const elapsed = performance.now() - start;

        if (!cancelled) {
          clearTimeout(probeTimer.current!);
          // Fast response → server was already warm, skip wake screen
          if (res.ok && elapsed < 1500) {
            setServerReady(true);
          } else {
            // Slow but alive → show wake screen so WakeScreen can finish polling
            setServerReady(false);
          }
        }
      } catch {
        // Still waking; wake screen will keep polling
        if (!cancelled) {
          clearTimeout(probeTimer.current!);
          setServerReady(false);
        }
      }
    };

    probe();
    return () => {
      cancelled = true;
      if (probeTimer.current) clearTimeout(probeTimer.current);
    };
  }, []);

  const handleWakeReady = () => setServerReady(true);

  return (
    <main className="w-screen h-screen overflow-hidden bg-slate-950 relative">
      {/* Wake screen shown while Render cold-starts */}
      {serverReady === false && <WakeScreen onReady={handleWakeReady} />}

      {/* Game only mounts once server is confirmed warm */}
      {serverReady === true && <GameCanvas />}

      <a
        href="/admin"
        className="absolute top-4 right-4 z-50 text-xs text-slate-600 hover:text-cyan-500 transition-colors font-mono tracking-wide opacity-50 hover:opacity-100"
        title="Admin Dashboard"
      >
        ⚙ Admin
      </a>
    </main>
  );
}
