"use client";
import { useEffect, useRef, useState } from "react";

interface IntroScreenProps {
  engineReady: boolean;
  onStart: (sailDirectly: boolean) => void;
}

type Phase = "charting" | "legend" | "ready";

const LOADING_MESSAGES = [
  "Charting the waters...",
  "Scanning the horizon...",
  "Loading nautical charts...",
  "Preparing your vessel...",
  "Recruiting your crew...",
  "Stocking the cannons...",
  "The seas are awakening...",
  "Almost ready to sail...",
];

const LEGEND =
  "The seas hold your portfolio. Each island harbors one of your creations — sail close to step ashore and explore it. Enemy ships patrol the waters. Fire your cannons, claim their gold, and find your way to shore, Captain.";

export default function IntroScreen({ engineReady, onStart }: IntroScreenProps) {
  const [phase, setPhase] = useState<Phase>("charting");
  const [msgIdx, setMsgIdx] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const engineReadyRef = useRef(engineReady);
  engineReadyRef.current = engineReady;

  // Cycle loading messages every 5 s
  useEffect(() => {
    const iv = setInterval(() => setMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length), 5000);
    return () => clearInterval(iv);
  }, []);

  // Auto-advance phases so 50 s of cold-start time feels productive
  useEffect(() => {
    const t1 = setTimeout(() => setPhase((p) => (p === "charting" ? "legend" : p)), 14000);
    const t2 = setTimeout(() => {
      if (engineReadyRef.current) setPhase("ready");
    }, 36000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // If engine becomes ready, advance past current phase sooner
  useEffect(() => {
    if (!engineReady) return;
    if (phase === "charting") {
      const t = setTimeout(() => setPhase("legend"), 2000);
      return () => clearTimeout(t);
    }
    if (phase === "legend") {
      const t = setTimeout(() => setPhase("ready"), 1500);
      return () => clearTimeout(t);
    }
  }, [engineReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Typewriter for legend
  useEffect(() => {
    if (phase !== "legend") return;
    setCharCount(0);
    const iv = setInterval(() => {
      setCharCount((c) => {
        if (c >= LEGEND.length) {
          clearInterval(iv);
          return c;
        }
        return c + 2;
      });
    }, 22);
    return () => clearInterval(iv);
  }, [phase]);

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center select-none overflow-hidden"
      style={{ background: "radial-gradient(ellipse at center, #0d0900 0%, #050400 100%)" }}
    >
      {/* Title */}
      <div
        className="text-5xl font-bold tracking-[0.35em] mb-1"
        style={{
          fontFamily: "serif",
          color: "#f59e0b",
          textShadow: "0 0 40px #f59e0b99, 0 0 80px #f59e0b44",
        }}
      >
        CAPIXELATE
      </div>
      <div className="text-xs tracking-[0.4em] mb-14 uppercase" style={{ color: "#92400e" }}>
        Portfolio Seas
      </div>

      {phase === "charting" && (
        <ChartingPhase message={LOADING_MESSAGES[msgIdx]} engineReady={engineReady} />
      )}
      {phase === "legend" && (
        <LegendPhase text={LEGEND.slice(0, charCount)} done={charCount >= LEGEND.length} />
      )}
      {phase === "ready" && <ReadyPhase onStart={onStart} />}

      {/* Phase dots */}
      {phase !== "ready" && (
        <div className="absolute bottom-10 flex items-center gap-3">
          {(["charting", "legend"] as Phase[]).map((p) => (
            <div
              key={p}
              className="rounded-full transition-all duration-700"
              style={{
                width: phase === p ? 20 : 8,
                height: 8,
                background: phase === p ? "#f59e0b" : "#3a2000",
                boxShadow: phase === p ? "0 0 10px #f59e0b" : "none",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ChartingPhase({
  message,
  engineReady,
}: {
  message: string;
  engineReady: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-sm px-8">
      {/* Animated nautical chart */}
      <div
        className="relative w-64 h-48 rounded-xl overflow-hidden"
        style={{ border: "1px solid #f59e0b33", background: "#030500" }}
      >
        {/* Grid */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={`h${i}`}
            className="absolute w-full"
            style={{
              top: `${(i + 1) * (100 / 7)}%`,
              height: "1px",
              background: "#f59e0b1a",
              animation: `ci-fade 0.6s ease ${i * 0.25}s both`,
            }}
          />
        ))}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={`v${i}`}
            className="absolute h-full"
            style={{
              left: `${(i + 1) * (100 / 9)}%`,
              width: "1px",
              background: "#f59e0b1a",
              animation: `ci-fade 0.6s ease ${i * 0.18}s both`,
            }}
          />
        ))}

        {/* Island dots appearing */}
        {[
          { x: "48%", y: "32%", d: "1.2s" },
          { x: "70%", y: "54%", d: "2.1s" },
          { x: "28%", y: "61%", d: "3.0s" },
        ].map((dot, i) => (
          <div
            key={i}
            className="absolute w-2.5 h-2.5 rounded-full -translate-x-1.5 -translate-y-1.5"
            style={{
              left: dot.x,
              top: dot.y,
              background: "#f59e0b",
              boxShadow: "0 0 8px #f59e0b, 0 0 16px #f59e0b44",
              animation: `ci-fade 0.5s ease ${dot.d} both`,
            }}
          />
        ))}

        {/* Player ship blip */}
        <div
          className="absolute w-3 h-3 rounded-full -translate-x-1.5 -translate-y-1.5"
          style={{
            left: "48%",
            top: "78%",
            background: "#22d3ee",
            boxShadow: "0 0 10px #22d3ee",
            animation: "ci-pulse 1.6s ease-in-out infinite",
          }}
        />

        {/* Scan sweep */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, transparent 47%, #f59e0b0d 50%, transparent 53%)",
            animation: "ci-scan 2.8s linear infinite",
          }}
        />

        <div
          className="absolute bottom-1.5 right-2 text-[9px] font-mono"
          style={{ color: "#f59e0b44" }}
        >
          SEA CHART
        </div>
      </div>

      {/* Message */}
      <div className="text-center">
        <div
          className="text-base font-mono tracking-widest"
          style={{ color: "#f59e0b", textShadow: "0 0 12px #f59e0b55" }}
        >
          {message}
        </div>
        <div className="flex justify-center gap-1.5 mt-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: "#f59e0b",
                animation: `ci-bounce 1.2s ease-in-out ${i * 0.22}s infinite`,
              }}
            />
          ))}
        </div>
      </div>

      {engineReady && (
        <div className="text-xs font-mono tracking-widest" style={{ color: "#22c55e" }}>
          ✓ Engines online
        </div>
      )}

      <style>{`
        @keyframes ci-fade   { from { opacity:0 } to { opacity:1 } }
        @keyframes ci-scan   { from { transform:translateY(-110%) } to { transform:translateY(210%) } }
        @keyframes ci-pulse  { 0%,100% { opacity:1; transform:translate(-50%,-50%) scale(1) }
                               50%      { opacity:.4; transform:translate(-50%,-50%) scale(1.6) } }
        @keyframes ci-bounce { 0%,80%,100% { transform:scale(.5); opacity:.3 }
                               40%          { transform:scale(1);  opacity:1  } }
      `}</style>
    </div>
  );
}

function LegendPhase({ text, done }: { text: string; done: boolean }) {
  return (
    <div className="flex flex-col items-center gap-6 max-w-lg px-10 text-center">
      <div
        className="text-xs uppercase tracking-[0.35em] font-mono"
        style={{ color: "#f59e0b77" }}
      >
        — Captain's Briefing —
      </div>
      <p
        className="text-xl leading-relaxed"
        style={{ fontFamily: "serif", color: "#fde68a", textShadow: "0 0 20px #f59e0b33" }}
      >
        {text}
        {!done && (
          <span
            className="inline-block w-0.5 h-5 ml-1 align-middle"
            style={{ background: "#f59e0b", animation: "ci-blink .8s step-end infinite" }}
          />
        )}
      </p>
      <style>{`@keyframes ci-blink { 50% { opacity:0 } }`}</style>
    </div>
  );
}

function ReadyPhase({ onStart }: { onStart: (sailDirectly: boolean) => void }) {
  return (
    <div className="flex flex-col items-center gap-6 max-w-sm px-8 text-center">
      <div
        className="text-2xl font-bold tracking-widest"
        style={{ fontFamily: "serif", color: "#fde68a", textShadow: "0 0 24px #f59e0b66" }}
      >
        ⚓ ALL HANDS ON DECK
      </div>
      <p className="text-sm leading-relaxed" style={{ color: "#a16207" }}>
        Your ship is ready, Captain. Explore the seas at your own pace — or sail straight to your
        portfolio island.
      </p>
      <div className="flex flex-col gap-3 w-full">
        <button
          onClick={() => onStart(false)}
          className="w-full py-4 rounded-xl font-bold tracking-widest text-sm transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, #92400e, #b45309)",
            color: "#fef3c7",
            border: "1px solid #f59e0b55",
            boxShadow: "0 0 24px #f59e0b33",
          }}
        >
          ⛵ SET SAIL
        </button>
        <button
          onClick={() => onStart(true)}
          className="w-full py-4 rounded-xl font-bold tracking-widest text-sm transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, #1c1400, #2a1e00)",
            color: "#f59e0b",
            border: "1px solid #f59e0b33",
            boxShadow: "0 0 12px #f59e0b1a",
          }}
        >
          🏝 GO DIRECTLY TO MY ISLAND
        </button>
      </div>
    </div>
  );
}
