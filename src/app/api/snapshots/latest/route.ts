import { NextResponse } from "next/server";
import { deriveWalls, getLatestSnapshot, getStrikesForSnapshot } from "@/db/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await getLatestSnapshot();
    if (!snapshot) {
      return NextResponse.json({ error: "No snapshots found" }, { status: 404 });
    }

    const strikes = await getStrikesForSnapshot(snapshot.ts);
    const walls = await deriveWalls(strikes);
    const summary = snapshot.summary_json ?? {};

    return NextResponse.json({
      ...snapshot,
      gamma_flip: summary.gamma_flip ?? null,
      walls,
      vix_level: summary.vix_level ?? null,
      vix9d_level: summary.vix9d_level ?? null,
      iv_rank: summary.iv_rank ?? null,
      expected_move_pct: summary.expected_move_pct ?? null,
      net_delta_bn: summary.net_delta_bn ?? null,
      net_charm_bn: summary.net_charm_bn ?? null,
      net_vanna_bn: summary.net_vanna_bn ?? null,
      flow_buy_ratio: summary.flow_buy_ratio ?? null,
      flow_aggressiveness: summary.flow_aggressiveness ?? null,
      event_risk_score: summary.event_risk_score ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Query failed" },
      { status: 500 },
    );
  }
}
