import {
  deriveWalls,
  getFreshness,
  getLatestSnapshot,
  getStrikesForSnapshot,
} from "@/db/queries";
import { formatGexValue, formatSpot, StatCard } from "@/components/StatCard";
import { formatNumber, formatTsLabel } from "@/lib/time";
import { MultiDayChart } from "@/components/SpotTimeline";
import { getMultiDaySeries } from "@/db/queries";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  let error: string | null = null;
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
      walls = await deriveWalls(strikes);
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load data";
  }

  const summary = snapshot?.summary_json ?? {};
  const status =
    freshness?.age_minutes != null && freshness.age_minutes > 20 ? "stale" : "ok";

  return (
    <>
      <div className="page-header">
        <h1>Live Overview</h1>
        <p>Latest SPX gamma exposure snapshot from Postgres (read-only).</p>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="select-row" style={{ marginBottom: "1rem" }}>
        <span className={`badge ${status}`}>{status.toUpperCase()}</span>
        {snapshot?.ts ? (
          <span className="glossary">
            Snapshot {formatTsLabel(snapshot.ts)} ET · indexed {snapshot.indexed_at ?? "—"}
            {freshness?.age_minutes != null
              ? ` · ${formatNumber(freshness.age_minutes, 1)} min ago`
              : ""}
          </span>
        ) : null}
      </div>

      <div className="grid grid-4" style={{ marginBottom: "1rem" }}>
        <StatCard
          label="Spot"
          value={formatSpot(snapshot?.spot)}
          sub={snapshot?.market_date ?? undefined}
          tooltip="Index spot at snapshot time"
        />
        <StatCard
          label="Total GEX"
          value={formatGexValue(snapshot?.total_gex)}
          regime={snapshot?.regime}
          tooltip="Net dealer gamma exposure per 1% move (Bn$)"
        />
        <StatCard
          label="Regime"
          value={snapshot?.regime ?? "—"}
          regime={snapshot?.regime}
          tooltip="LONG gamma dampens moves; SHORT gamma can amplify"
        />
        <StatCard
          label="Gamma Flip"
          value={formatSpot(summary.gamma_flip as number | undefined)}
          tooltip="Strike where cumulative GEX crosses zero"
        />
      </div>

      <div className="grid grid-4" style={{ marginBottom: "1rem" }}>
        <StatCard
          label="Call Wall"
          value={formatSpot(walls.call_wall)}
          tooltip="Strike with largest positive GEX — resistance magnet"
        />
        <StatCard
          label="Put Wall"
          value={formatSpot(walls.put_wall)}
          tooltip="Strike with largest negative GEX — support magnet"
        />
        <StatCard
          label="VIX"
          value={formatNumber(summary.vix_level as number | undefined, 2)}
          sub={
            summary.vix9d_level != null
              ? `VIX9D ${formatNumber(summary.vix9d_level as number, 2)}`
              : undefined
          }
        />
        <StatCard
          label="IV Rank"
          value={
            summary.iv_rank != null
              ? `${formatNumber((summary.iv_rank as number) * 100, 1)}%`
              : "—"
          }
          sub={
            summary.expected_move_pct != null
              ? `Exp move ${formatNumber((summary.expected_move_pct as number) * 100, 2)}%`
              : undefined
          }
        />
      </div>

      <div className="grid grid-2" style={{ marginBottom: "1rem" }}>
        <div className="card">
          <h3>Flow &amp; Macro</h3>
          <dl className="glossary">
            <dt>Flow buy ratio</dt>
            <dd>{formatNumber(summary.flow_buy_ratio as number | undefined, 2)}</dd>
            <dt>Flow aggressiveness</dt>
            <dd>{formatNumber(summary.flow_aggressiveness as number | undefined, 1)}</dd>
            <dt>Event risk score</dt>
            <dd>{formatNumber(summary.event_risk_score as number | undefined, 2)}</dd>
            <dt>Net delta (Bn)</dt>
            <dd>{formatNumber(summary.net_delta_bn as number | undefined, 2)}</dd>
          </dl>
        </div>
        <div className="card">
          <h3>Glossary</h3>
          <dl className="glossary">
            <dt>GEX</dt>
            <dd>Dealer hedging flow per 1% spot move</dd>
            <dt>LONG gamma</dt>
            <dd>Positive total GEX — mean-reversion bias</dd>
            <dt>SHORT gamma</dt>
            <dd>Negative total GEX — momentum bias</dd>
            <dt>Bn$/1%</dt>
            <dd>Billions of dollars per 1% index move</dd>
          </dl>
        </div>
      </div>

      <div className="card">
        <h2>Multi-day Spot &amp; GEX</h2>
        <MultiDayChart snapshots={history} />
      </div>
    </>
  );
}
