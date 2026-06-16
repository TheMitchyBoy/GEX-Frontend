import { NextRequest, NextResponse } from "next/server";
import { getMarketDates } from "@/db/queries";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? "90");
    const dates = await getMarketDates(Math.min(Math.max(limit, 1), 365));
    return NextResponse.json({ dates });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Query failed" },
      { status: 500 },
    );
  }
}
