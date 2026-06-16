import { NextResponse } from "next/server";
import { getProcessorState } from "@/db/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = await getProcessorState();
    return NextResponse.json({ state });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Query failed" },
      { status: 500 },
    );
  }
}
