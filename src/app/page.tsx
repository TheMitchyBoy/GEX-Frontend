import {
  getEnrichedSnapshot,
  getFreshness,
  getLatestSnapshot,
  getMultiDaySeries,
} from "@/db/queries";
import { OverviewClient } from "@/components/OverviewClient";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  let enriched = null;
  let freshness = null;
  let history: Awaited<ReturnType<typeof getMultiDaySeries>> = [];

  try {
    const snapshot = await getLatestSnapshot();
    [freshness, history] = await Promise.all([
      getFreshness(),
      getMultiDaySeries(500),
    ]);
    if (snapshot?.ts) {
      enriched = await getEnrichedSnapshot(snapshot.ts);
    }
  } catch {
    // client will poll /api/snapshots/latest
  }

  const summary = enriched?.summary_json ?? {};
  const initial = enriched
    ? {
        ...enriched,
        gamma_flip: enriched.gamma_flip,
        walls: enriched.walls,
        features: enriched.features,
        diagnostics: enriched.diagnostics,
        quality_score: enriched.features?.quality_score ?? enriched.diagnostics?.quality_score ?? null,
        flip_confidence: enriched.features?.flip_confidence ?? null,
        regime_consistent: enriched.features?.regime_consistent ?? null,
        data_lag_sec: enriched.features?.data_lag_sec ?? enriched.diagnostics?.data_lag_sec ?? null,
        diagnostic_status: enriched.diagnostics?.status ?? freshness?.diagnostic_status ?? null,
        vix_level: summary.vix_level as number | null | undefined,
        vix9d_level: summary.vix9d_level as number | null | undefined,
        iv_rank: summary.iv_rank as number | null | undefined,
        expected_move_pct: summary.expected_move_pct as number | null | undefined,
        flow_buy_ratio: summary.flow_buy_ratio as number | null | undefined,
        flow_aggressiveness: summary.flow_aggressiveness as number | undefined,
        flow_event_count: summary.flow_event_count as number | undefined,
        flow_net_delta_gex_bn: summary.flow_net_delta_gex_bn as number | undefined,
        event_risk_score: summary.event_risk_score as number | undefined,
        net_delta_bn: summary.net_delta_bn as number | undefined,
        is_fomc_week: summary.is_fomc_week as number | undefined,
        is_cpi_day: summary.is_cpi_day as number | undefined,
        is_nfp_day: summary.is_nfp_day as number | undefined,
      }
    : null;

  return (
    <>
      <PageHeader
        title="Live Overview"
        description="Latest SPX gamma exposure — uses snapshot_features for walls, flip, and quality."
        badge="SPX"
      />
      <OverviewClient
        initial={initial}
        initialHistory={history}
        initialFreshnessMinutes={freshness?.age_minutes ?? null}
      />
    </>
  );
}
