type Kind = "string" | "number" | "boolean" | "string?";

/**
 * Whitelist + type-check a request body for a Prisma update. Fields that are
 * missing or have the wrong type are dropped, so a partial PUT only touches
 * what was actually sent. Only "string?" fields may be set to null.
 */
export function pickFields(body: unknown, spec: Record<string, Kind>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!body || typeof body !== "object") return out;
  const src = body as Record<string, unknown>;
  for (const [key, kind] of Object.entries(spec)) {
    const v = src[key];
    if (v === undefined) continue;
    if (v === null) {
      if (kind === "string?") out[key] = null;
      continue;
    }
    const t = kind === "string?" ? "string" : kind;
    if (typeof v === t && (t !== "number" || Number.isFinite(v))) out[key] = v;
  }
  return out;
}
