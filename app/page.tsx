"use client";
import dynamic from "next/dynamic";

const GameCanvas = dynamic(() => import("@/components/game/GameCanvas"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: "100%", height: "100%",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "radial-gradient(ellipse at center, #0d0900 0%, #050400 100%)",
      }}
    >
      <div
        style={{
          fontFamily: "serif", fontWeight: "bold",
          fontSize: "clamp(2.2rem, 9vw, 4.5rem)",
          letterSpacing: "0.35em", paddingLeft: "0.35em",
          color: "#f59e0b",
          textShadow: "0 0 20px #f59e0b, 0 0 50px #f59e0bbb, 0 0 100px #f59e0b66",
          marginBottom: "12px", textAlign: "center",
        }}
      >
        CAPIXELATE
      </div>
      <div style={{ fontFamily: "monospace", fontSize: "11px", letterSpacing: "0.4em", color: "#92400e", marginBottom: "40px" }}>
        Portfolio Seas
      </div>
      <div style={{ width: "clamp(180px,40vw,260px)", height: "5px", background: "#1c0a00", borderRadius: "3px", overflow: "hidden" }}>
        <div style={{
          height: "100%", width: "40%", borderRadius: "3px", background: "#f59e0b",
          boxShadow: "0 0 14px #f59e0b, 0 0 30px #f59e0baa",
          animation: "pg 1.8s ease-in-out infinite",
        }} />
      </div>
      <style>{`@keyframes pg { 0%{margin-left:-40%} 100%{margin-left:100%} }`}</style>
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
