"use client";

import { useEffect, useState } from "react";
import { formatGexValue, formatSpot, StatCard } from "@/components/StatCard";
import { FlowPanel } from "@/components/FlowPanel";
import { MacroBadges } from "@/components/MacroBadges";
import { MultiDayChart } from "@/components/SpotTimeline";
import { ChartSkeleton, LoadingSkeleton } from "@/components/LoadingSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { TOOLTIPS } from "@/lib/glossary";
import { formatNumber, formatTsLabel } from "@/lib/time";
import type { SummaryJson, Walls } from "@/lib/types";

interface LatestPayload {
  ts?: string;
  market_date?: string | null;
  spot?: number | null;
  total_gex?: number | null;
  regime?: string | null;
  indexed_at?: string | null;
  gamma_flip?: number | null;
  walls?: Walls;
  summary_json?: SummaryJson | null;
  vix_level?: number | null;
  vix9d_level?: number | null;
  iv_rank?: number | null;
  expected_move_pct?: number | null;
  flow_buy_ratio?: number | null;
  flow_aggressiveness?: number | null;
  flow_event_count?: number | null;
  flow_net_delta_gex_bn?: number | null;
  event_risk_score?: number | null;
  net_delta_bn?: number | null;
  is_fomc_week?: number;
  is_cpi_day?: number;
  is_nfp_day?: number;
}

interface OverviewClientProps {
  initial: LatestPayload | null;
  initialHistory: Array<{ ts: string; spot: number | null; total_gex: number | null }>;
  initialFreshnessMinutes: number | null;
}

export function OverviewClient({
  initial,
  initialHistory,
  initialFreshnessMinutes,
}: OverviewClientProps) {
  const [data, setData] = useState<LatestPayload | null>(initial);
  const [history, setHistory] = useState(initialHistory);
  const [freshnessMin, setFreshnessMin] = useState(initialFreshnessMinutes);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(new Date());
  const [loading, setLoading] = useState(!initial);

  useEffect(() => {
    const refresh = async () => {
      try {
        const [latestRes, healthRes, seriesRes] = await Promise.all([
          fetch("/api/snapshots/latest", { cache: "no-store" }),
          fetch("/api/health", { cache: "no-store" }),
          fetch("/api/snapshots?series=multi&limit=500", { cache: "no-store" }),
        ]);
        if (latestRes.ok) {
          const latest = await latestRes.json();
          setData(latest);
        }
        if (healthRes.ok) {
          const health = await healthRes.json();
          setFreshnessMin(health.age_minutes ?? null);
        }
        if (seriesRes.ok) {
          const series = await seriesRes.json();
          setHistory(series.snapshots ?? []);
        }
        setLastRefresh(new Date());
      } finally {
        setLoading(false);
      }
    };

    refresh();
    const id = setInterval(refresh, 90_000);
    return () => clearInterval(id);
  }, []);

  if (loading && !data) {
    return (
      <>
        <LoadingSkeleton rows={4} />
        <ChartSkeleton />
      </>
    );
  }

  if (!data?.ts) {
    return (
      <EmptyState
        title="No snapshots yet"
        message="The database has no SPX snapshots. Ensure the GEX processor is running and writing to Postgres."
      />
    );
  }

  const summary = data.summary_json ?? {};
  const walls = data.walls ?? { call_wall: null, put_wall: null };
  const status =
    freshnessMin != null && freshnessMin > 20 ? "stale" : "ok";

  return (
    <>
      <div className="select-row" style={{ marginBottom: "1rem" }}>
        <span className={`badge ${status}`}>{status.toUpperCase()}</span>
        <span className="glossary">
          Snapshot {formatTsLabel(data.ts)} ET · indexed {data.indexed_at ?? "—"}
          {freshnessMin != null ? ` · ${formatNumber(freshnessMin, 1)} min ago` : ""}
          {lastRefresh ? ` · refreshed ${lastRefresh.toLocaleTimeString()}` : ""}
        </span>
      </div>

      <MacroBadges summary={summary} />

      <div className="grid grid-4" style={{ marginBottom: "1rem" }}>
        <StatCard label="Spot" value={formatSpot(data.spot)} sub={data.market_date ?? undefined} tooltip={TOOLTIPS.spot} />
        <StatCard label="Total GEX" value={formatGexValue(data.total_gex)} regime={data.regime} tooltip={TOOLTIPS.totalGex} />
        <StatCard label="Regime" value={data.regime ?? "—"} regime={data.regime} tooltip={TOOLTIPS.regime} />
        <StatCard label="Gamma Flip" value={formatSpot(data.gamma_flip)} tooltip={TOOLTIPS.gammaFlip} />
      </div>

      <div className="grid grid-4" style={{ marginBottom: "1rem" }}>
        <StatCard label="Call Wall" value={formatSpot(walls.call_wall)} tooltip={TOOLTIPS.callWall} />
        <StatCard label="Put Wall" value={formatSpot(walls.put_wall)} tooltip={TOOLTIPS.putWall} />
        <StatCard
          label="VIX"
          value={formatNumber((data.vix_level ?? summary.vix_level) as number | undefined, 2)}
          sub={
            (data.vix9d_level ?? summary.vix9d_level) != null
              ? `VIX9D ${formatNumber((data.vix9d_level ?? summary.vix9d_level) as number, 2)}`
              : undefined
          }
          tooltip={TOOLTIPS.vix}
        />
        <StatCard
          label="IV Rank"
          value={
            (data.iv_rank ?? summary.iv_rank) != null
              ? `${formatNumber(((data.iv_rank ?? summary.iv_rank) as number) * 100, 1)}%`
              : "—"
          }
          sub={
            (data.expected_move_pct ?? summary.expected_move_pct) != null
              ? `Exp move ${formatNumber(((data.expected_move_pct ?? summary.expected_move_pct) as number) * 100, 2)}%`
              : undefined
          }
          tooltip={TOOLTIPS.ivRank}
        />
      </div>

      <div className="grid grid-2" style={{ marginBottom: "1rem" }}>
        <FlowPanel summary={summary} data={data} />
        <div className="card">
          <h3>Glossary</h3>
          <dl className="glossary">
            <dt>GEX</dt>
            <dd>Dealer hedging flow per 1% spot move</dd>
            <dt>LONG gamma</dt>
            <dd>Positive total GEX — mean-reversion bias</dd>
            <dt>SHORT gamma</dt>
            <dd>Negative total GEX — momentum bias</dd>
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
