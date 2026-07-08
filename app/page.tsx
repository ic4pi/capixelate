"use client";
import dynamic from "next/dynamic";

const GameCanvas = dynamic(() => import("@/components/game/GameCanvas"), {
  ssr: false,
  loading: () => (
    <div
      className="w-full h-full flex flex-col items-center justify-center"
      style={{ background: "radial-gradient(ellipse at center, #0d0900 0%, #050400 100%)" }}
    >
      <div
        className="text-5xl font-bold tracking-[0.35em] mb-1 px-4 text-center"
        style={{ fontFamily: "serif", color: "#f59e0b", textShadow: "0 0 40px #f59e0b99, 0 0 80px #f59e0b44" }}
      >
        CAPIXELATE
      </div>
      <div className="text-xs tracking-[0.4em] uppercase mb-12" style={{ color: "#92400e" }}>
        Portfolio Seas
      </div>
      {/* Glowing yellow progress bar */}
      <div className="relative w-48 h-1.5 rounded-full overflow-hidden" style={{ background: "#1c0d00" }}>
        <div
          className="absolute top-0 h-full rounded-full"
          style={{
            width: "45%",
            background: "linear-gradient(90deg, #b45309, #f59e0b, #fde68a)",
            boxShadow: "0 0 14px #f59e0b, 0 0 28px #f59e0b66",
            animation: "page-progress 1.8s ease-in-out infinite",
          }}
        />
      </div>
      <style>{`
        @keyframes page-progress {
          0%   { left: -45%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  ),
});

export default function Home() {
  return (
    <main className="w-screen h-screen overflow-hidden bg-slate-950">
      <GameCanvas />
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
