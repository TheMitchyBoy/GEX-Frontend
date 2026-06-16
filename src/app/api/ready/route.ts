import { NextResponse } from "next/server";
import { checkDbConnection, getFreshness, getLatestSnapshot } from "@/db/queries";

export const dynamic = "force-dynamic";

/** Readiness probe — 503 when DB unavailable (for monitoring, not Railway liveness). */
export async function GET() {
  const postgres = await checkDbConnection();
  if (!postgres) {
    return NextResponse.json(
      {
        ready: false,
        postgres: false,
        error: process.env.DATABASE_URL ? "Database connection failed" : "DATABASE_URL is not set",
      },
      { status: 503 },
    );
  }

  const [snapshot, freshness] = await Promise.all([
    getLatestSnapshot(),
    getFreshness(),
  ]);

  return NextResponse.json({
    ready: true,
    postgres: true,
    latest_ts: snapshot?.ts ?? null,
    age_minutes: freshness?.age_minutes ?? null,
  });
}
