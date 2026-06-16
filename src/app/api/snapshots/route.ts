import { NextRequest, NextResponse } from "next/server";
import {
  getMultiDaySeries,
  getSnapshotsInRange,
  getTimelineForDate,
} from "@/db/queries";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const marketDate = searchParams.get("market_date");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const series = searchParams.get("series");

    if (series === "multi") {
      const limit = Number(searchParams.get("limit") ?? "500");
      const rows = await getMultiDaySeries(limit);
      return NextResponse.json({ snapshots: rows });
    }

    if (marketDate) {
      const rows = await getTimelineForDate(marketDate);
      return NextResponse.json({ market_date: marketDate, snapshots: rows });
    }

    if (startDate && endDate) {
      const rows = await getSnapshotsInRange(startDate, endDate);
      return NextResponse.json({ start_date: startDate, end_date: endDate, snapshots: rows });
    }

    return NextResponse.json(
      { error: "Provide market_date, start_date+end_date, or series=multi" },
      { status: 400 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Query failed" },
      { status: 500 },
    );
  }
}
