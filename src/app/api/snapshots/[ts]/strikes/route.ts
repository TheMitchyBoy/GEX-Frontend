import { NextRequest, NextResponse } from "next/server";
import {
  getSnapshotFeatures,
  getStrikesForSnapshot,
  wallsFromFeatures,
} from "@/db/queries";
import { cachedHistoricalJson } from "@/lib/cache";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ ts: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { ts } = await context.params;
    const decodedTs = decodeURIComponent(ts);
    const source = request.nextUrl.searchParams.get("source") as "auto" | "atm" | "full" | null;

    const [strikes, features] = await Promise.all([
      getStrikesForSnapshot(decodedTs, source ?? "auto"),
      getSnapshotFeatures(decodedTs),
    ]);
    const walls = wallsFromFeatures(features, strikes);

    return cachedHistoricalJson({
      ts: decodedTs,
      strikes,
      walls,
      features,
      strike_source: source ?? "auto",
      count: strikes.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Query failed" },
      { status: 500 },
    );
  }
}
