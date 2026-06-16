import { NextResponse } from "next/server";

/** Immutable snapshot data — safe to cache at the edge/CDN. */
export function cachedJson(data: unknown, maxAgeSeconds = 300): NextResponse {
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": `public, max-age=${maxAgeSeconds}, stale-while-revalidate=60`,
    },
  });
}

/** Historical dates never change once written. */
export function cachedHistoricalJson(data: unknown): NextResponse {
  return cachedJson(data, 3600);
}
