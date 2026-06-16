import { NextRequest, NextResponse } from "next/server";
import { getSnapshotDiagnostics } from "@/db/queries";
import { cachedHistoricalJson } from "@/lib/cache";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ ts: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { ts } = await context.params;
    const decodedTs = decodeURIComponent(ts);
    const diagnostics = await getSnapshotDiagnostics(decodedTs);
    if (!diagnostics) {
      return NextResponse.json({ error: "Diagnostics not found for snapshot" }, { status: 404 });
    }
    return cachedHistoricalJson({ ts: decodedTs, diagnostics });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Query failed" },
      { status: 500 },
    );
  }
}
