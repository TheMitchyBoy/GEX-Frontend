import { NextRequest, NextResponse } from "next/server";
import { getSurfaceForSnapshot } from "@/db/queries";
import { cachedHistoricalJson } from "@/lib/cache";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ ts: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { ts } = await context.params;
    const decodedTs = decodeURIComponent(ts);
    const surface = await getSurfaceForSnapshot(decodedTs);
    return cachedHistoricalJson({ ts: decodedTs, surface, count: surface.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Query failed" },
      { status: 500 },
    );
  }
}
