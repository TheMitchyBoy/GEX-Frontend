import { NextRequest, NextResponse } from "next/server";
import { getWallDriftForDate } from "@/db/queries";
import { cachedHistoricalJson } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const marketDate = request.nextUrl.searchParams.get("market_date");
    if (!marketDate) {
      return NextResponse.json({ error: "market_date required" }, { status: 400 });
    }
    const rows = await getWallDriftForDate(marketDate);
    return cachedHistoricalJson({ market_date: marketDate, drift: rows });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Query failed" },
      { status: 500 },
    );
  }
}
