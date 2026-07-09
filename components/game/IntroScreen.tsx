"use client";
import { useEffect, useState } from "react";

interface IntroScreenProps {
  engineReady: boolean;
  onStart: (sailDirectly: boolean) => void;
}

export default function IntroScreen({ engineReady, onStart }: IntroScreenProps) {
  const [progress, setProgress] = useState(0);

  // Creep to 85% while engine loads, snap to 100 when ready
  useEffect(() => {
    const iv = setInterval(() => {
      setProgress((p) => {
        if (p >= 85) return p;
        return Math.min(p + (p < 40 ? 1.2 : p < 65 ? 0.7 : 0.3), 85);
      });
    }, 160);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (engineReady) setProgress(100);
  }, [engineReady]);

  // Auto-dismiss once engine is ready
  useEffect(() => {
    if (engineReady) {
      const t = setTimeout(() => onStart(false), 800);
      return () => clearTimeout(t);
    }
  }, [engineReady, onStart]);

  return (
    <div
      style={{
        position: "absolute", inset: 0, zIndex: 50,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "radial-gradient(ellipse at center, #0d0900 0%, #050400 100%)",
        userSelect: "none",
      }}
    >
      {/* Title */}
      <div
        style={{
          fontFamily: "serif",
          fontWeight: "bold",
          fontSize: "clamp(2.2rem, 9vw, 4.5rem)",
          letterSpacing: "0.35em",
          color: "#f59e0b",
          textShadow: "0 0 20px #f59e0b, 0 0 50px #f59e0bbb, 0 0 100px #f59e0b66",
          marginBottom: "12px",
          textAlign: "center",
          paddingLeft: "0.35em", // compensate for letter-spacing on last char
        }}
      >
        CAPIXELATE
      </div>

      <div
        style={{
          fontFamily: "monospace",
          fontSize: "11px",
          letterSpacing: "0.4em",
          color: "#92400e",
          textTransform: "uppercase",
          marginBottom: "40px",
        }}
      >
        Portfolio Seas
      </div>

      {/* Glowing progress bar */}
      <div
        style={{
          width: "clamp(180px, 40vw, 260px)",
          height: "5px",
          background: "#1c0a00",
          borderRadius: "3px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            borderRadius: "3px",
            background: "#f59e0b",
            boxShadow: progress === 100
              ? "0 0 18px #f59e0b, 0 0 40px #f59e0bcc, 0 0 80px #f59e0b66"
              : "0 0 14px #f59e0b, 0 0 30px #f59e0baa, 0 0 60px #f59e0b55",
            transition: "width 0.6s ease, box-shadow 0.4s",
          }}
        />
      </div>

      {/* Bottom-right corner — VIEW PORTFOLIO button */}
      <a
        href="/portfolio"
        style={{
          position: "absolute",
          bottom: "20px",
          right: "20px",
          padding: "7px 13px",
          fontFamily: "monospace",
          fontSize: "11px",
          letterSpacing: "0.12em",
          color: "#f59e0b",
          textShadow: "0 0 10px #f59e0b",
          border: "1px solid #f59e0b88",
          borderRadius: "6px",
          boxShadow: "0 0 12px #f59e0b44",
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}
      >
        VIEW PORTFOLIO →
      </a>
    </div>
  );
}
