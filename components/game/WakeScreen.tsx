"use client";
import { useEffect, useState } from "react";

const BOOT_STEPS = [
  "Initializing WebGL 2.0 rendering context…",
  "Compiling GLSL ocean surface shaders…",
  "Tessellating wave displacement meshes…",
  "Pre-warming geometry buffer pools…",
  "Generating Perlin noise heightmap tiles…",
  "Loading scene graph topology…",
  "Calibrating fog-of-war tile cache…",
  "Initializing enemy AI state machines…",
  "Synchronizing world-state manifests…",
  "Binding physics simulation clock…",
  "Resolving asset dependency graph…",
  "Hydrating minimap tile registry…",
];

interface WakeScreenProps {
  onReady: () => void;
}

export default function WakeScreen({ onReady }: WakeScreenProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [dots, setDots] = useState("");
  const [progress, setProgress] = useState(8);

  // Cycle through boot steps
  useEffect(() => {
    const id = setInterval(() => {
      setStepIndex((i) => (i + 1) % BOOT_STEPS.length);
      setProgress((p) => Math.min(p + Math.random() * 6 + 2, 90));
    }, 1800);
    return () => clearInterval(id);
  }, []);

  // Animate the trailing dots
  useEffect(() => {
    const id = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 400);
    return () => clearInterval(id);
  }, []);

  // Poll the healthcheck endpoint; resolve once it responds quickly
  useEffect(() => {
    let cancelled = false;
    let ready = false;

    const base =
      process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";

    const poll = async () => {
      while (!cancelled && !ready) {
        try {
          const start = performance.now();
          const res = await fetch(`${base}/api/healthcheck`, {
            cache: "no-store",
            signal: AbortSignal.timeout(5000),
          });
          const elapsed = performance.now() - start;

          if (res.ok && elapsed < 3000) {
            ready = true;
            if (!cancelled) {
              setProgress(100);
              // Brief pause so progress bar visibly hits 100 before dismiss
              setTimeout(onReady, 600);
            }
            return;
          }
        } catch {
          // server still waking — keep polling
        }
        await new Promise((r) => setTimeout(r, 2500));
      }
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [onReady]);

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 select-none">
      {/* Title */}
      <div
        className="text-6xl font-bold tracking-[0.3em] text-cyan-400 mb-2"
        style={{ fontFamily: "serif", textShadow: "0 0 40px #00ffcc88" }}
      >
        CAPIXELATE
      </div>
      <div className="text-slate-500 text-xs tracking-[0.4em] uppercase mb-14">
        Portfolio Seas
      </div>

      {/* Progress bar */}
      <div className="w-72 h-1 bg-slate-800 rounded-full overflow-hidden mb-5">
        <div
          className="h-full bg-cyan-400 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Current step text */}
      <div className="text-slate-400 text-sm font-mono min-h-[1.5rem] text-center px-8 max-w-sm">
        {BOOT_STEPS[stepIndex]}
        <span className="text-cyan-600 inline-block w-6 text-left">{dots}</span>
      </div>

      {/* Decorative scanline overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 2px, #fff 3px)",
        }}
      />
    </div>
  );
}
