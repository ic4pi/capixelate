"use client";
import { useEffect, useState } from "react";

interface IntroScreenProps {
  engineReady: boolean;
  onStart: (sailDirectly: boolean) => void;
}

export default function IntroScreen({ engineReady, onStart }: IntroScreenProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => {
      setProgress((p) => {
        if (p >= 85) return p;
        const step = p < 40 ? 1.2 : p < 65 ? 0.7 : 0.3;
        return Math.min(p + step, 85);
      });
    }, 160);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (engineReady) setProgress(100);
  }, [engineReady]);

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center select-none"
      style={{ background: "radial-gradient(ellipse at center, #0d0900 0%, #050400 100%)" }}
    >
      {/* Title */}
      <div
        className="text-4xl sm:text-6xl font-bold tracking-[0.3em] mb-2 px-4 text-center"
        style={{
          fontFamily: "serif",
          color: "#f59e0b",
          textShadow: "0 0 40px #f59e0b99, 0 0 80px #f59e0b44",
        }}
      >
        CAPIXELATE
      </div>
      <div className="text-xs tracking-[0.4em] uppercase mb-16" style={{ color: "#92400e" }}>
        Portfolio Seas
      </div>

      {/* Progress bar */}
      <div className="relative w-48 sm:w-64 h-1.5 rounded-full overflow-hidden mb-4" style={{ background: "#1c0d00" }}>
        <div
          className="absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${progress}%`,
            background:
              progress === 100
                ? "linear-gradient(90deg, #16a34a, #22c55e)"
                : "linear-gradient(90deg, #b45309, #f59e0b, #fde68a)",
            boxShadow:
              progress === 100
                ? "0 0 12px #22c55e, 0 0 24px #22c55e66"
                : "0 0 14px #f59e0b, 0 0 28px #f59e0b55",
          }}
        />
      </div>

      {/* Ready buttons */}
      {engineReady && (
        <div className="flex flex-col items-center gap-3 mt-6 w-full max-w-xs px-6">
          <button
            onClick={() => onStart(false)}
            className="w-full py-3 rounded-xl font-bold tracking-widest text-sm transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #92400e, #b45309)",
              color: "#fef3c7",
              border: "1px solid #f59e0b55",
              boxShadow: "0 0 24px #f59e0b33",
            }}
          >
            ⛵ SET SAIL
          </button>
          <a
            href="/portfolio"
            className="w-full py-3 rounded-xl font-bold tracking-widest text-sm transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] text-center block"
            style={{
              background: "#f59e0b",
              color: "#1c0d00",
              boxShadow: "0 0 20px #f59e0b55",
              textDecoration: "none",
            }}
          >
            🏝 VIEW PORTFOLIO
          </a>
        </div>
      )}

      {/* Skip button — direct link, no game engine needed */}
      <a
        href="/portfolio"
        className="absolute bottom-5 right-5 px-3 py-2 text-[11px] font-bold tracking-wider transition-all duration-150 hover:scale-105 active:scale-95"
        style={{
          background: "#f59e0b",
          color: "#1c0d00",
          borderRadius: "6px",
          boxShadow: "0 0 16px #f59e0b55",
          fontFamily: "monospace",
          textDecoration: "none",
        }}
      >
        VIEW PORTFOLIO →
      </a>
    </div>
  );
}
