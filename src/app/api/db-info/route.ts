import { NextResponse } from "next/server";
import { getDbDiagnostics } from "@/db/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const diagnostics = await getDbDiagnostics();
    return NextResponse.json(diagnostics);
  } catch (error) {
    return NextResponse.json(
      {
        postgres: false,
        query_error: error instanceof Error ? error.message : "Diagnostics failed",
      },
      { status: 500 },
    );
  }
}
