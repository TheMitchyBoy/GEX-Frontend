import { NextRequest, NextResponse } from "next/server";
import { getEnrichedSnapshot, getGreeksPaginated } from "@/db/queries";
import { cachedHistoricalJson } from "@/lib/cache";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ ts: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { ts } = await context.params;
    const decodedTs = decodeURIComponent(ts);

    const greeksOnly = request.nextUrl.searchParams.get("greeks_only") === "1";
    if (greeksOnly) {
      const limit = Number(request.nextUrl.searchParams.get("limit") ?? "100");
      const offset = Number(request.nextUrl.searchParams.get("offset") ?? "0");
      const greeks = await getGreeksPaginated(decodedTs, limit, offset);
      return cachedHistoricalJson({ ts: decodedTs, ...greeks });
    }

    const enriched = await getEnrichedSnapshot(decodedTs);
    if (!enriched) {
      return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
    }

    const summary = enriched.summary_json ?? {};
    return cachedHistoricalJson({
      ...enriched,
      expiration: enriched.expiration_json ?? {},
      greeks: enriched.greek_exposure_json ?? [],
      gamma_flip: enriched.gamma_flip,
      summary_gamma_flip: summary.gamma_flip ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Query failed" },
      { status: 500 },
    );
  }
}
