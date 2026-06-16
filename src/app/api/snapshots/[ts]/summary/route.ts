import { NextRequest, NextResponse } from "next/server";
import { deriveWalls, getSnapshotSummary, getStrikesForSnapshot } from "@/db/queries";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ ts: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
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

    return NextResponse.json({
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
