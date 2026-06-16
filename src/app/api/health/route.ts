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

export async function GET() {
  try {
    const [postgres, snapshot, freshness] = await Promise.all([
      checkDbConnection(),
      getLatestSnapshot(),
      getFreshness(),
    ]);

    let processorHealth = null;
    const processorUrl = process.env.PROCESSOR_HEALTH_URL;
    if (processorUrl) {
      try {
        const res = await fetch(processorUrl, { next: { revalidate: 0 } });
        if (res.ok) {
          processorHealth = await res.json();
        }
      } catch {
        // optional monitoring
      }
    }

    let walls: Walls = { call_wall: null, put_wall: null };
    if (snapshot?.ts) {
      const strikes = await getStrikesForSnapshot(snapshot.ts);
      walls = await deriveWalls(strikes);
    }

    const ageMinutes = freshness?.age_minutes ?? null;
    let status: "ok" | "stale" | "degraded" = "ok";
    if (!postgres) status = "degraded";
    else if (ageMinutes != null && ageMinutes > 20) status = "stale";

    return NextResponse.json({
      status,
      postgres,
      ticker: snapshot?.ticker ?? "SPX",
      latest_ts: snapshot?.ts ?? null,
      age_minutes: ageMinutes,
      indexed_at: freshness?.indexed_at ?? null,
      walls,
      processor: processorHealth,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "degraded",
        postgres: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 },
    );
  }
}
