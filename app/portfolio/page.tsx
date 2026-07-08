"use client";
import { useEffect, useState } from "react";

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

  return (
    <main
      className="min-h-screen w-full"
      style={{ background: "radial-gradient(ellipse at top, #0d0900 0%, #030200 100%)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-8 pb-6 border-b border-amber-900/30">
        <a
          href="/"
          className="text-amber-600 text-sm font-mono tracking-widest hover:text-amber-400 transition-colors"
        >
          ← BACK TO SEAS
        </a>
        <div
          className="text-2xl sm:text-3xl font-bold tracking-[0.25em]"
          style={{ fontFamily: "serif", color: "#f59e0b", textShadow: "0 0 30px #f59e0b66" }}
        >
          CAPIXELATE
        </div>
        <div className="w-24" />
      </div>

      {/* Title */}
      <div className="text-center pt-10 pb-8 px-4">
        <h1
          className="text-3xl sm:text-4xl font-bold mb-2"
          style={{ fontFamily: "serif", color: "#fde68a", textShadow: "0 0 20px #f59e0b44" }}
        >
          Portfolio
        </h1>
        <p className="text-amber-700 text-sm tracking-widest font-mono">PROJECTS &amp; WORK</p>
      </div>

      {/* Projects grid */}
      <div className="max-w-4xl mx-auto px-4 pb-16">
        {loading && (
          <div className="flex flex-col items-center gap-4 py-20">
            <div className="w-48 h-1.5 rounded-full overflow-hidden" style={{ background: "#1c0d00" }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: "60%",
                  background: "linear-gradient(90deg, #b45309, #f59e0b)",
                  boxShadow: "0 0 14px #f59e0b",
                  animation: "port-slide 1.6s ease-in-out infinite",
                }}
              />
            </div>
            <style>{`@keyframes port-slide { 0%{margin-left:0} 50%{margin-left:40%} 100%{margin-left:0} }`}</style>
          </div>
        )}

        {!loading && projects.length === 0 && (
          <div className="text-center py-20 text-amber-800 font-mono text-sm">
            No projects found. Add some in the admin dashboard.
          </div>
        )}

        {!loading && projects.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {projects.map((p) => {
              let tags: string[] = [];
              try { tags = JSON.parse(p.tags); } catch { tags = []; }
              return (
                <a
                  key={p.id}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block rounded-2xl overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:-translate-y-0.5"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(245,158,11,0.2)",
                    boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
                  }}
                >
                  {/* Image */}
                  {p.imageUrl && (
                    <div className="w-full h-40 overflow-hidden">
                      <img
                        src={p.imageUrl}
                        alt={p.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="p-5">
                    {/* Icon + title */}
                    <div className="flex items-center gap-3 mb-2">
                      {p.iconUrl && (
                        <img src={p.iconUrl} alt="" className="w-7 h-7 rounded-lg object-contain" />
                      )}
                      <h2
                        className="text-lg font-bold"
                        style={{ fontFamily: "serif", color: "#fde68a" }}
                      >
                        {p.title}
                      </h2>
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed mb-4">{p.description}</p>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {tags.map((t: string) => (
                          <span
                            key={t}
                            className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                            style={{
                              background: "rgba(245,158,11,0.12)",
                              color: "#b45309",
                              border: "1px solid rgba(245,158,11,0.2)",
                            }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                    <div
                      className="mt-4 text-xs font-mono tracking-widest"
                      style={{ color: "#f59e0b" }}
                    >
                      VISIT PROJECT →
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
