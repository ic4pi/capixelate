"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const IslandScene = dynamic(() => import("@/components/game/IslandScene"), { ssr: false });

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

interface Project {
  id: string;
  title: string;
  description: string;
  url: string;
  iconUrl?: string;
  imageUrl?: string;
  tags: string;
}

export default function PortfolioPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/projects`)
      .then((r) => r.json())
      .then((d) => setProjects(d.projects ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const icons = projects.map((p) => p.iconUrl).filter(Boolean) as string[];

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      {/* 3D island background — drag to orbit 360° */}
      <IslandScene projectIcons={icons} />

      {/* All UI sits above the canvas */}
      <div className="relative z-10 min-h-screen flex flex-col">

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ background: "linear-gradient(to bottom, rgba(1,6,8,0.85) 0%, transparent 100%)" }}
        >
          <a
            href="/"
            className="text-xs font-mono tracking-widest transition-colors"
            style={{ color: "#92400e" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#f59e0b")}
            onMouseLeave={e => (e.currentTarget.style.color = "#92400e")}
          >
            ← BACK TO SEAS
          </a>
          <div
            className="text-xl sm:text-2xl font-bold tracking-[0.25em]"
            style={{ fontFamily: "serif", color: "#f59e0b", textShadow: "0 0 24px #f59e0b88" }}
          >
            CAPIXELATE
          </div>
          <div className="text-[10px] font-mono text-amber-900 hidden sm:block">DRAG TO ORBIT</div>
        </div>

        {/* Spacer so cards start near bottom half */}
        <div className="flex-1 min-h-[35vh] pointer-events-none" />

        {/* Projects */}
        <div
          className="px-4 pb-10 pt-6"
          style={{ background: "linear-gradient(to top, rgba(1,3,4,0.92) 60%, transparent 100%)" }}
        >
          <div className="max-w-2xl mx-auto">
            <h1
              className="text-center text-2xl sm:text-3xl font-bold mb-1"
              style={{ fontFamily: "serif", color: "#fde68a" }}
            >
              Portfolio
            </h1>
            <p className="text-center text-[11px] font-mono tracking-widest text-amber-800 mb-7">
              PROJECTS &amp; WORK
            </p>

            {loading && (
              <div className="flex justify-center py-10">
                <div className="w-40 h-1.5 rounded-full overflow-hidden" style={{ background: "#1c0d00" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: "55%",
                      background: "linear-gradient(90deg, #b45309, #f59e0b)",
                      boxShadow: "0 0 12px #f59e0b",
                      animation: "port-slide 1.6s ease-in-out infinite",
                    }}
                  />
                </div>
                <style>{`@keyframes port-slide{0%{margin-left:0}50%{margin-left:45%}100%{margin-left:0}}`}</style>
              </div>
            )}

            {!loading && projects.length === 0 && (
              <p className="text-center text-amber-900 font-mono text-sm py-10">
                No projects yet — add some in the admin panel.
              </p>
            )}

            {!loading && projects.length > 0 && (
              <div className="flex flex-col gap-4">
                {projects.map((p) => {
                  let tags: string[] = [];
                  try { tags = JSON.parse(p.tags); } catch { tags = []; }
                  return (
                    <a
                      key={p.id}
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-start gap-4 rounded-2xl p-4 transition-all duration-200 hover:scale-[1.01]"
                      style={{
                        background: "rgba(0,0,0,0.6)",
                        border: "1px solid rgba(245,158,11,0.2)",
                        backdropFilter: "blur(8px)",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                        textDecoration: "none",
                      }}
                    >
                      {/* Icon */}
                      <div
                        className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden"
                        style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)" }}
                      >
                        {p.iconUrl ? (
                          <img src={p.iconUrl} alt="" className="w-8 h-8 object-contain" />
                        ) : (
                          <span style={{ color: "#f59e0b", fontSize: 22 }}>🏝</span>
                        )}
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <div
                          className="font-bold text-base mb-0.5 group-hover:text-amber-300 transition-colors"
                          style={{ fontFamily: "serif", color: "#fde68a" }}
                        >
                          {p.title}
                        </div>
                        <p className="text-slate-400 text-sm leading-relaxed mb-2 line-clamp-2">
                          {p.description}
                        </p>
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {tags.map((t: string) => (
                              <span
                                key={t}
                                className="text-[10px] font-mono px-1.5 py-0.5 rounded-full"
                                style={{
                                  background: "rgba(245,158,11,0.1)",
                                  color: "#92400e",
                                  border: "1px solid rgba(245,158,11,0.15)",
                                }}
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex-shrink-0 self-center text-amber-700 group-hover:text-amber-400 transition-colors text-lg">
                        →
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
