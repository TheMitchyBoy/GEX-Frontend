import { NextResponse } from "next/server";
import {
  gammaFlipFrom,
  getLatestSnapshot,
  getSnapshotFeatures,
  getStrikesForSnapshot,
  wallsFromFeatures,
} from "@/db/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await getLatestSnapshot();
    if (!snapshot) {
      return NextResponse.json({ error: "No snapshots found" }, { status: 404 });
    }

    const [features, strikes] = await Promise.all([
      getSnapshotFeatures(snapshot.ts),
      getStrikesForSnapshot(snapshot.ts, "auto"),
    ]);
    const walls = wallsFromFeatures(features, strikes);
    const summary = snapshot.summary_json ?? {};

    return NextResponse.json({
      ...snapshot,
      features,
      gamma_flip: gammaFlipFrom(features, summary),
      walls,
      quality_score: features?.quality_score ?? null,
      flip_confidence: features?.flip_confidence ?? null,
      regime_consistent: features?.regime_consistent ?? null,
      data_lag_sec: features?.data_lag_sec ?? null,
      strike_profile_confidence: features?.strike_profile_confidence ?? null,
      spot_source: features?.spot_source ?? null,
      spot_disagreement_pct: features?.spot_disagreement_pct ?? null,
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
