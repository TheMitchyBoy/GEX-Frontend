import { NextRequest, NextResponse } from "next/server";
import { getHeatmapForDate } from "@/db/queries";
import { cachedHistoricalJson } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const marketDate = request.nextUrl.searchParams.get("market_date");
    if (!marketDate) {
      return NextResponse.json({ error: "market_date required" }, { status: 400 });
    }
    const pctBand = Number(request.nextUrl.searchParams.get("pct_band") ?? "0.03");
    const cells = await getHeatmapForDate(marketDate, pctBand);
    return cachedHistoricalJson({ market_date: marketDate, cells, count: cells.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Query failed" },
      { status: 500 },
    );
  }
}
