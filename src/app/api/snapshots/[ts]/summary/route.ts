import { NextRequest, NextResponse } from "next/server";
import {
  deriveWalls,
  getGreeksPaginated,
  getSnapshotSummary,
  getStrikesForSnapshot,
} from "@/db/queries";
import { cachedHistoricalJson } from "@/lib/cache";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ ts: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { ts } = await context.params;
    const decodedTs = decodeURIComponent(ts);
    const snapshot = await getSnapshotSummary(decodedTs);

    if (!snapshot) {
      return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
    }

    const strikes = await getStrikesForSnapshot(decodedTs);
    const walls = await deriveWalls(strikes);
    const summary = snapshot.summary_json ?? {};

    const greeksOnly = request.nextUrl.searchParams.get("greeks_only") === "1";
    if (greeksOnly) {
      const limit = Number(request.nextUrl.searchParams.get("limit") ?? "100");
      const offset = Number(request.nextUrl.searchParams.get("offset") ?? "0");
      const greeks = await getGreeksPaginated(decodedTs, limit, offset);
      return cachedHistoricalJson({ ts: decodedTs, ...greeks });
    }

    return cachedHistoricalJson({
      ...snapshot,
      gamma_flip: summary.gamma_flip ?? null,
      walls,
      expiration: snapshot.expiration_json ?? {},
      greeks: snapshot.greek_exposure_json ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Query failed" },
      { status: 500 },
    );
  }
}
