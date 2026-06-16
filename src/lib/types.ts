export const TICKER = "SPX";

export interface SummaryJson {
  export_schema_version?: number;
  ticker?: string;
  market_date?: string;
  spot?: number;
  spot_price?: number;
  total_gex_bn_per_pct?: number;
  net_gamma_regime?: string;
  gamma_flip?: number;
  granularity?: string;
  interval_minutes?: number;
  data_source?: string;
  generated_at_utc?: string;
  net_charm_bn?: number;
  net_vanna_bn?: number;
  net_delta_bn?: number;
  gamma_oi_bn?: number;
  gamma_vol_bn?: number;
  flow_event_count?: number;
  flow_net_delta_gex_bn?: number;
  flow_buy_ratio?: number;
  flow_aggressiveness?: number;
  is_fomc_week?: number;
  is_cpi_day?: number;
  is_nfp_day?: number;
  event_risk_score?: number;
  vix_level?: number;
  vix9d_level?: number;
  iv_rank?: number;
  expected_move_pct?: number;
  spy_return?: number;
  [key: string]: unknown;
}

export interface Snapshot {
  ticker: string;
  ts: string;
  market_date: string | null;
  spot: number | null;
  total_gex: number | null;
  regime: string | null;
  summary_json: SummaryJson | null;
  expiration_json: Record<string, number> | null;
  greek_exposure_json: GreekExposureRow[] | null;
  indexed_at: string | null;
}

export interface SnapshotTimelineRow {
  ts: string;
  spot: number | null;
  total_gex: number | null;
  regime: string | null;
  gamma_flip: string | null;
}

export interface SnapshotBrief {
  ts: string;
  market_date: string | null;
  spot: number | null;
  total_gex: number | null;
  regime: string | null;
}

export interface StrikeRow {
  strike: number;
  gex_bn_per_pct: number | null;
  cumulative_gex_bn_per_pct: number | null;
}

export interface SpotStrikeRow extends StrikeRow {
  ts: string;
  spot: number | null;
  regime: string | null;
}

export interface GreekExposureRow {
  strike?: number;
  expiration?: string;
  gamma?: number;
  delta?: number;
  vanna?: number;
  charm?: number;
  [key: string]: unknown;
}

export interface FreshnessInfo {
  ts: string;
  indexed_at: string | null;
  age_minutes: number | null;
}

export interface Walls {
  call_wall: number | null;
  put_wall: number | null;
}

export interface ProcessorHealth {
  mode?: string;
  postgres?: boolean;
  ticker?: string;
  latest_ts?: string;
  export_age_minutes?: number;
  status?: "ok" | "stale" | "warming" | "degraded";
}
