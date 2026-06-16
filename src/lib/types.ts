export { DEFAULT_TICKER as TICKER } from "./ticker";

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
  surface_json?: Record<string, unknown>[] | null;
  greek_exposure_json: GreekExposureRow[] | null;
  indexed_at: string | null;
  snapshot_at?: string | null;
  prior_ts?: string | null;
}

export interface SnapshotFeatures {
  ticker: string;
  ts: string;
  prior_ts: string | null;
  snapshot_at: string | null;
  gamma_flip: number | null;
  call_wall: number | null;
  put_wall: number | null;
  pos_gamma_peak_strike: number | null;
  flip_distance_pct: number | null;
  wall_spread: number | null;
  gex_concentration: number | null;
  near_term_ratio: number | null;
  zero_dte_ratio: number | null;
  term_curvature: number | null;
  expiration_count: number | null;
  front_term_ratio: number | null;
  back_term_ratio: number | null;
  delta_gex: number | null;
  delta_spot: number | null;
  spot_return: number | null;
  regime_changed: boolean | null;
  strike_count: number | null;
  quality_score: number | null;
  flip_confidence: string | null;
  regime_consistent: boolean | null;
  spot_source: string | null;
  spot_disagreement_pct: number | null;
  strike_profile_confidence: string | null;
  data_lag_sec: number | null;
}

export interface SnapshotDiagnostics {
  ticker: string;
  ts: string;
  status: string;
  validation_json: Record<string, unknown> | null;
  uw_fetch_ms: number | null;
  postgres_write_ms: number | null;
  indexed_at: string | null;
  quality_score: number | null;
  data_lag_sec: number | null;
}

export interface DailyQualityRow {
  ticker: string;
  market_date: string;
  payload_json: Record<string, unknown>;
  updated_at: string;
}

export interface PredictionAccuracyRow {
  ticker: string;
  market_date: string;
  payload_json: Record<string, unknown>;
  updated_at: string;
}

export interface SnapshotEnriched extends Snapshot {
  features: SnapshotFeatures | null;
  diagnostics: SnapshotDiagnostics | null;
  walls: Walls;
  gamma_flip: number | null;
}

export interface SnapshotTimelineRow {
  ts: string;
  spot: number | null;
  total_gex: number | null;
  regime: string | null;
  gamma_flip: string | null;
  quality_score: number | null;
  diagnostic_status: string | null;
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
  snapshot_at: string | null;
  age_minutes: number | null;
  data_lag_sec: number | null;
  diagnostic_status: string | null;
  quality_score: number | null;
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

export interface WallDriftRow {
  ts: string;
  spot: number | null;
  gamma_flip: number | null;
  call_wall: number | null;
  put_wall: number | null;
  quality_score: number | null;
  flip_confidence: string | null;
  regime_consistent: boolean | null;
  diagnostic_status: string | null;
}

export interface HeatmapCell {
  ts: string;
  strike: number;
  gex_bn_per_pct: number | null;
  spot: number | null;
}

export interface TradeRow {
  id: number;
  ticker: string;
  status: string;
  option_type: string;
  strike: number;
  qty: number;
  entry_ts: string;
  exit_ts: string | null;
  entry_spot: number;
  exit_spot: number | null;
  entry_premium: number;
  exit_premium: number | null;
  pnl_pct: number | null;
  pnl_usd: number | null;
  exit_reason: string | null;
  signal_type: string | null;
}

export interface DecisionRow {
  id: number;
  ts: string;
  ticker: string;
  action: string;
  payload_json: string | null;
  ai_verdict: string | null;
  ai_notes: string | null;
}

export interface LlmPredictionRow {
  id: number;
  ticker: string;
  source: string;
  snapshot_ts: string | null;
  market_date: string | null;
  created_at: string;
  resolved_at: string | null;
  payload_json: string;
  actual_json: string | null;
  outcome_json: string | null;
}

export interface DailyInsightRow {
  ticker: string;
  market_date: string;
  kind: string;
  payload_json: string;
  created_at: string;
  updated_at: string;
}

export interface TrainingSnapshotRow {
  ticker: string;
  ts: string;
  market_date: string | null;
  spot: number | null;
  total_gex: number | null;
  regime: string | null;
  snapshot_at: string | null;
  quality_score: number | null;
  flip_confidence: string | null;
  regime_consistent: boolean | null;
  strike_count: number | null;
  delta_gex: number | null;
  spot_return: number | null;
  diagnostic_status: string | null;
}

export interface ProcessorStateRow {
  key: string;
  value: string;
  updated_at: string;
}
