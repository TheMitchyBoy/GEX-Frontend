import { NextRequest, NextResponse } from "next/server";
import { getDailyQualityStats } from "@/db/queries";
import { cachedHistoricalJson } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const marketDate = request.nextUrl.searchParams.get("market_date") ?? undefined;
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? "30");
    const stats = await getDailyQualityStats(marketDate, limit);
    return cachedHistoricalJson({ stats });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Query failed" },
      { status: 500 },
    );
  }
}
