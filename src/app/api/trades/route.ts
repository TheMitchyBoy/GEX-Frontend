import { NextRequest, NextResponse } from "next/server";
import { getTrades } from "@/db/queries";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? "100");
    const trades = await getTrades(Math.min(Math.max(limit, 1), 500));
    return NextResponse.json({ trades });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Query failed" },
      { status: 500 },
    );
  }
}
