import { NextRequest, NextResponse } from "next/server";

/**
 * Build CORS headers for the response.
 *
 * Critical rule: `Access-Control-Allow-Credentials: true` is ONLY valid when
 * the allowed origin is a specific URL — never with the wildcard `"*"`.
 * Browsers hard-block preflight responses that combine the two, which silently
 * kills every cross-origin POST from the Vercel admin to the Render backend.
 *
 * When ALLOWED_ORIGIN is not explicitly configured we echo back the request's
 * own Origin header (if present) instead of `"*"`, so credentials work without
 * requiring any env-var configuration during local dev or first deploy.
 */
function buildCorsHeaders(
  request: NextRequest,
  configuredOrigin: string | undefined
): Record<string, string> {
  const requestOrigin = request.headers.get("origin");

  // Preference order: explicit config → reflected request origin → wildcard
  const effectiveOrigin = configuredOrigin ?? requestOrigin ?? "*";

  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": effectiveOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    // Vary ensures proxies cache separate responses per Origin
    Vary: "Origin",
  };

  // Credentials flag is only legal with a non-wildcard origin
  if (effectiveOrigin !== "*") {
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  return headers;
}

export function middleware(request: NextRequest) {
  const configuredOrigin = process.env.ALLOWED_ORIGIN;
  const headers = buildCorsHeaders(request, configuredOrigin);

  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers });
  }

  const response = NextResponse.next();
  Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
