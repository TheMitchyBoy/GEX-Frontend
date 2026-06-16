import { NextRequest, NextResponse } from "next/server";
import { detectDatabaseSchema } from "@/lib/schema";
import { uwExploreData, uwGetSampleRawJson, uwListEndpoints } from "@/db/uw-queries";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const mode = await detectDatabaseSchema();
    if (mode !== "uw_raw") {
      return NextResponse.json({
        schema_mode: mode,
        rows: [],
        total: 0,
        endpoints: [],
        message: "UW explorer is for uw_periscope databases. This instance uses processor schema.",
      });
    }

    const limit = Number(request.nextUrl.searchParams.get("limit") ?? "50");
    const offset = Number(request.nextUrl.searchParams.get("offset") ?? "0");
    const endpoint = request.nextUrl.searchParams.get("endpoint") ?? undefined;
    const date = request.nextUrl.searchParams.get("date") ?? undefined;
    const sampleId = request.nextUrl.searchParams.get("sample_id");
    const sampleSource = request.nextUrl.searchParams.get("source") as
      | "uw_periscope"
      | "uw_history"
      | null;

    if (sampleId) {
      const sample = await uwGetSampleRawJson(
        Number(sampleId),
        sampleSource ?? "uw_periscope",
      );
      if (!sample) {
        return NextResponse.json({ error: "Row not found" }, { status: 404 });
      }
      return NextResponse.json({ sample });
    }

    const [explore, endpoints] = await Promise.all([
      uwExploreData({ limit, offset, endpoint, date }),
      uwListEndpoints(),
    ]);

    return NextResponse.json({
      schema_mode: "uw_raw",
      endpoints,
      ...explore,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "UW explore failed" },
      { status: 500 },
    );
  }
}
