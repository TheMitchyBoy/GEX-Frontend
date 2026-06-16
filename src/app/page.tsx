import {
  deriveWalls,
  getFreshness,
  getLatestSnapshot,
  getMultiDaySeries,
  getStrikesForSnapshot,
} from "@/db/queries";
import { OverviewClient } from "@/components/OverviewClient";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  let snapshot = null;
  let freshness = null;
  let walls = { call_wall: null as number | null, put_wall: null as number | null };
  let history: Awaited<ReturnType<typeof getMultiDaySeries>> = [];

  try {
    [snapshot, freshness, history] = await Promise.all([
      getLatestSnapshot(),
      getFreshness(),
      getMultiDaySeries(500),
    ]);

    if (snapshot?.ts) {
      const strikes = await getStrikesForSnapshot(snapshot.ts);
      walls = deriveWalls(strikes);
    }
  } catch {
    // client will poll /api/snapshots/latest
  }

  const summary = snapshot?.summary_json ?? {};
  const initial = snapshot
    ? {
        ...snapshot,
        gamma_flip: summary.gamma_flip as number | null | undefined,
        walls,
        vix_level: summary.vix_level as number | null | undefined,
        vix9d_level: summary.vix9d_level as number | null | undefined,
        iv_rank: summary.iv_rank as number | null | undefined,
        expected_move_pct: summary.expected_move_pct as number | null | undefined,
        flow_buy_ratio: summary.flow_buy_ratio as number | null | undefined,
        flow_aggressiveness: summary.flow_aggressiveness as number | null | undefined,
        flow_event_count: summary.flow_event_count as number | null | undefined,
        flow_net_delta_gex_bn: summary.flow_net_delta_gex_bn as number | null | undefined,
        event_risk_score: summary.event_risk_score as number | null | undefined,
        net_delta_bn: summary.net_delta_bn as number | null | undefined,
        is_fomc_week: summary.is_fomc_week as number | undefined,
        is_cpi_day: summary.is_cpi_day as number | undefined,
        is_nfp_day: summary.is_nfp_day as number | undefined,
      }
    : null;

  return (
    <>
      <PageHeader
        title="Live Overview"
        description="Latest SPX gamma exposure — auto-refreshes every 90 seconds."
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
