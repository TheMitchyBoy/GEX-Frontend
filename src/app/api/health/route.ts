import { NextResponse } from "next/server";
import {
  checkDbConnection,
  deriveWalls,
  getFreshness,
  getLatestSnapshot,
  getStrikesForSnapshot,
} from "@/db/queries";
import type { Walls } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Liveness probe — always HTTP 200 so Railway marks the replica healthy. */
export async function GET() {
  const started = Date.now();
  let postgres = false;
  let dbError: string | null = null;
  let snapshot = null;
  let freshness = null;
  let walls: Walls = { call_wall: null, put_wall: null };

  try {
    postgres = await checkDbConnection();
    if (postgres) {
      [snapshot, freshness] = await Promise.all([
        getLatestSnapshot(),
        getFreshness(),
      ]);

      if (snapshot?.ts) {
        const strikes = await getStrikesForSnapshot(snapshot.ts);
        walls = await deriveWalls(strikes);
      }
    }
  } catch (error) {
    dbError = error instanceof Error ? error.message : "Database query failed";
  }

  if (!postgres && !dbError && !process.env.DATABASE_URL) {
    dbError = "DATABASE_URL is not set";
  }

  const ageMinutes = freshness?.age_minutes ?? null;
  let status: "ok" | "stale" | "degraded" = "ok";
  if (!postgres) status = "degraded";
  else if (ageMinutes != null && ageMinutes > 20) status = "stale";

  let processorHealth = null;
  const processorUrl = process.env.PROCESSOR_HEALTH_URL;
  if (processorUrl) {
    try {
      const res = await fetch(processorUrl, {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        processorHealth = await res.json();
      }
    } catch {
      // optional monitoring
    }
  }

  return NextResponse.json({
    status,
    postgres,
    db_error: dbError,
    ticker: snapshot?.ticker ?? "SPX",
    latest_ts: snapshot?.ts ?? null,
    age_minutes: ageMinutes,
    indexed_at: freshness?.indexed_at ?? null,
    walls,
    processor: processorHealth,
    uptime_seconds: Math.round(process.uptime()),
    response_ms: Date.now() - started,
  });
}
