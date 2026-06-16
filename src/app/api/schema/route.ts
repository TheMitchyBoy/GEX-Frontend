import { NextResponse } from "next/server";
import { detectDatabaseSchema } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const mode = await detectDatabaseSchema();
    return NextResponse.json({
      mode,
      processor_features: mode === "processor",
      uw_raw: mode === "uw_raw",
    });
  } catch (error) {
    return NextResponse.json(
      {
        mode: "processor",
        processor_features: true,
        error: error instanceof Error ? error.message : "Schema detection failed",
      },
      { status: 200 },
    );
  }
}
