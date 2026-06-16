import { NextRequest, NextResponse } from "next/server";
import { getTrainingSnapshots } from "@/db/queries";
import { cachedHistoricalJson } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? "50");
    const snapshots = await getTrainingSnapshots(Math.min(Math.max(limit, 1), 200));
    return cachedHistoricalJson({ snapshots, count: snapshots.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Query failed" },
      { status: 500 },
    );
  }
}
