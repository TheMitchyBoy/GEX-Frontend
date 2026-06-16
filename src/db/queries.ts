import type {
  DailyInsightRow,
  DailyQualityRow,
  DecisionRow,
  FreshnessInfo,
  HeatmapCell,
  LlmPredictionRow,
  PredictionAccuracyRow,
  ProcessorStateRow,
  Snapshot,
  SnapshotBrief,
  SnapshotDiagnostics,
  SnapshotEnriched,
  SnapshotFeatures,
  SnapshotTimelineRow,
  SpotStrikeRow,
  StrikeRow,
  SummaryJson,
  TradeRow,
  TrainingSnapshotRow,
  WallDriftRow,
  Walls,
} from "@/lib/types";
import type { DbDiagnostics } from "@/lib/db-diagnostics";
import { maskDatabaseHost } from "@/lib/db-diagnostics";
import { detectDatabaseSchema } from "@/lib/schema";
import { configuredTicker, getResolvedTicker, setResolvedTicker } from "@/lib/ticker";
import { checkDbConnection, query, queryOptional } from "@/db/pg";
import {
  deriveWalls,
  gammaFlipFrom,
  wallsFromFeatures,
} from "@/db/queries-shared";
import * as uw from "@/db/uw-queries";

export { checkDbConnection, deriveWalls, gammaFlipFrom, wallsFromFeatures };

async function isUwRaw(): Promise<boolean> {
  return (await detectDatabaseSchema()) === "uw_raw";
}

const SNAPSHOT_JOIN_COLUMNS = `s.ticker, s.ts, s.market_date, s.spot, s.total_gex, s.regime,
  s.summary_json, s.expiration_json, s.surface_json, s.greek_exposure_json,
  s.indexed_at, s.snapshot_at, s.prior_ts`;

const SNAPSHOT_COLUMNS = `ticker, ts, market_date, spot, total_gex, regime,
  summary_json, expiration_json, surface_json, greek_exposure_json,
  indexed_at, snapshot_at, prior_ts`;

const SNAPSHOT_COLUMNS_LEGACY = `ticker, ts, market_date, spot, total_gex, regime,
  summary_json, expiration_json, greek_exposure_json, indexed_at`;

const PROCESSOR_TABLES = [
  "snapshots",
  "snapshot_strikes",
  "snapshot_strikes_atm",
  "snapshot_features",
  "snapshot_diagnostics",
  "daily_quality_stats",
  "prediction_accuracy_daily",
  "processor_state",
  "latest_snapshot",
  "training_snapshots",
] as const;

let tickerCacheAt = 0;

async function resolveActiveTicker(): Promise<string> {
  if (tickerCacheAt > 0 && Date.now() - tickerCacheAt < 60_000) {
    return getResolvedTicker();
  }

  const configured = configuredTicker();

  try {
    const forConfigured = await queryOptional<{ cnt: string }>(
      `SELECT COUNT(*)::text AS cnt FROM snapshots WHERE ticker = $1`,
      [configured],
      "resolveActiveTicker.configured",
    );
    if (Number(forConfigured[0]?.cnt ?? 0) > 0) {
      setResolvedTicker(configured);
      tickerCacheAt = Date.now();
      return configured;
    }

    const any = await queryOptional<{ ticker: string }>(
      `SELECT ticker FROM snapshots GROUP BY ticker ORDER BY COUNT(*) DESC LIMIT 1`,
      [],
      "resolveActiveTicker.any",
    );
    const resolved = any[0]?.ticker ?? configured;
    setResolvedTicker(resolved);
    tickerCacheAt = Date.now();
    return resolved;
  } catch {
    return configured;
  }
}

async function selectLatestSnapshot(ticker: string): Promise<Snapshot | null> {
  const fromMv = await queryOptional<Snapshot>(
    `SELECT ${SNAPSHOT_JOIN_COLUMNS}
     FROM latest_snapshot ls
     JOIN snapshots s ON s.ticker = ls.ticker AND s.ts = ls.ts
     WHERE ls.ticker = $1`,
    [ticker],
    "getLatestSnapshot.mv",
  );
  if (fromMv[0]) return fromMv[0];

  const full = await queryOptional<Snapshot>(
    `SELECT ${SNAPSHOT_COLUMNS}
     FROM snapshots
     WHERE ticker = $1
     ORDER BY ts DESC
     LIMIT 1`,
    [ticker],
    "getLatestSnapshot.full",
  );
  if (full[0]) return full[0];

  const legacy = await queryOptional<Snapshot>(
    `SELECT ${SNAPSHOT_COLUMNS_LEGACY}
     FROM snapshots
     WHERE ticker = $1
     ORDER BY ts DESC
     LIMIT 1`,
    [ticker],
    "getLatestSnapshot.legacy",
  );
  if (legacy[0]) return legacy[0];

  const anyTicker = await queryOptional<Snapshot>(
    `SELECT ${SNAPSHOT_COLUMNS}
     FROM snapshots
     ORDER BY ts DESC
     LIMIT 1`,
    [],
    "getLatestSnapshot.anyTicker",
  );
  if (anyTicker[0]) return anyTicker[0];

  return (
    (
      await queryOptional<Snapshot>(
        `SELECT ${SNAPSHOT_COLUMNS_LEGACY}
         FROM snapshots
         ORDER BY ts DESC
         LIMIT 1`,
        [],
        "getLatestSnapshot.anyTickerLegacy",
      )
    )[0] ?? null
  );
}

export async function getLatestSnapshot(): Promise<Snapshot | null> {
  if (await isUwRaw()) return uw.uwGetLatestSnapshot();
  const ticker = await resolveActiveTicker();
  return selectLatestSnapshot(ticker);
}

export async function getSnapshotFeatures(ts: string): Promise<SnapshotFeatures | null> {
  const ticker = await resolveActiveTicker();
  const rows = await queryOptional<SnapshotFeatures>(
    `SELECT ticker, ts, prior_ts, snapshot_at::text, gamma_flip, call_wall, put_wall,
            pos_gamma_peak_strike, flip_distance_pct, wall_spread, gex_concentration,
            near_term_ratio, zero_dte_ratio, term_curvature, expiration_count,
            front_term_ratio, back_term_ratio, delta_gex, delta_spot, spot_return,
            regime_changed, strike_count, quality_score, flip_confidence,
            regime_consistent, spot_source, spot_disagreement_pct,
            strike_profile_confidence, data_lag_sec
     FROM snapshot_features
     WHERE ticker = $1 AND ts = $2`,
    [ticker, ts],
    "getSnapshotFeatures",
  );
  return rows[0] ?? null;
}

export async function getSnapshotDiagnostics(ts: string): Promise<SnapshotDiagnostics | null> {
  const ticker = await resolveActiveTicker();
  const rows = await queryOptional<SnapshotDiagnostics>(
    `SELECT ticker, ts, status, validation_json, uw_fetch_ms, postgres_write_ms,
            indexed_at, quality_score, data_lag_sec
     FROM snapshot_diagnostics
     WHERE ticker = $1 AND ts = $2`,
    [ticker, ts],
    "getSnapshotDiagnostics",
  );
  return rows[0] ?? null;
}

export async function getEnrichedSnapshot(ts: string): Promise<SnapshotEnriched | null> {
  if (await isUwRaw()) return uw.uwGetEnrichedSnapshot(ts);
  const snapshot = await getSnapshotSummary(ts);
  if (!snapshot) return null;

  const [features, diagnostics, strikes] = await Promise.all([
    getSnapshotFeatures(ts),
    getSnapshotDiagnostics(ts),
    getStrikesForSnapshot(ts, "auto"),
  ]);

  return {
    ...snapshot,
    features,
    diagnostics,
    walls: wallsFromFeatures(features, strikes),
    gamma_flip: gammaFlipFrom(features, snapshot.summary_json),
  };
}

export async function getMarketDates(limit = 90): Promise<string[]> {
  if (await isUwRaw()) return uw.uwGetMarketDates(limit);
  const ticker = await resolveActiveTicker();
  const rows = await query<{ market_date: string }>(
    `SELECT DISTINCT market_date
     FROM snapshots
     WHERE ticker = $1 AND market_date IS NOT NULL
     ORDER BY market_date DESC
     LIMIT $2`,
    [ticker, limit],
    "getMarketDates",
  );
  return rows.map((r) => r.market_date);
}

export async function getTimelineForDate(marketDate: string): Promise<SnapshotTimelineRow[]> {
  if (await isUwRaw()) return uw.uwGetTimelineForDate(marketDate);
  const ticker = await resolveActiveTicker();
  const rows = await queryOptional<SnapshotTimelineRow>(
    `SELECT s.ts, s.spot, s.total_gex, s.regime,
            COALESCE(f.gamma_flip::text, s.summary_json->>'gamma_flip') AS gamma_flip,
            f.quality_score,
            d.status AS diagnostic_status
     FROM snapshots s
     LEFT JOIN snapshot_features f ON f.ticker = s.ticker AND f.ts = s.ts
     LEFT JOIN snapshot_diagnostics d ON d.ticker = s.ticker AND d.ts = s.ts
     WHERE s.ticker = $1 AND s.market_date = $2
     ORDER BY s.ts ASC`,
    [ticker, marketDate],
    "getTimelineForDate",
  );
  if (rows.length) return rows;
  return query<SnapshotTimelineRow>(
    `SELECT ts, spot, total_gex, regime,
            summary_json->>'gamma_flip' AS gamma_flip,
            NULL::double precision AS quality_score,
            NULL::text AS diagnostic_status
     FROM snapshots
     WHERE ticker = $1 AND market_date = $2
     ORDER BY ts ASC`,
    [ticker, marketDate],
    "getTimelineForDate.legacy",
  );
}

export async function getSnapshotsInRange(
  startDate: string,
  endDate: string,
): Promise<SnapshotBrief[]> {
  const ticker = await resolveActiveTicker();
  return query<SnapshotBrief>(
    `SELECT ts, market_date, spot, total_gex, regime
     FROM snapshots
     WHERE ticker = $1 AND market_date BETWEEN $2 AND $3
     ORDER BY ts ASC`,
    [ticker, startDate, endDate],
    "getSnapshotsInRange",
  );
}

export async function getStrikesForSnapshot(
  ts: string,
  source: "auto" | "atm" | "full" = "auto",
): Promise<StrikeRow[]> {
  if (await isUwRaw()) return uw.uwGetStrikesForSnapshot(ts, source);
  const ticker = await resolveActiveTicker();
  const fetchAtm = async () =>
    queryOptional<StrikeRow>(
      `SELECT strike, gex_bn_per_pct, cumulative_gex_bn_per_pct
       FROM snapshot_strikes_atm
       WHERE ticker = $1 AND ts = $2
       ORDER BY strike ASC`,
      [ticker, ts],
      "getStrikesForSnapshot.atm",
    );

  const fetchFull = async () =>
    query<StrikeRow>(
      `SELECT strike, gex_bn_per_pct, cumulative_gex_bn_per_pct
       FROM snapshot_strikes
       WHERE ticker = $1 AND ts = $2
       ORDER BY strike ASC`,
      [ticker, ts],
      "getStrikesForSnapshot.full",
    );

  if (source === "atm") {
    const atm = await fetchAtm();
    return atm.length ? atm : fetchFull();
  }
  if (source === "full") return fetchFull();

  const atm = await fetchAtm();
  if (atm.length) return atm;
  return fetchFull();
}

export async function getSpotStrikesForSnapshot(ts: string): Promise<SpotStrikeRow[]> {
  if (await isUwRaw()) return uw.uwGetSpotStrikesForSnapshot(ts);
  const ticker = await resolveActiveTicker();
  return queryOptional<SpotStrikeRow>(
    `SELECT s.ts, s.spot, s.regime, st.strike, st.gex_bn_per_pct, st.cumulative_gex_bn_per_pct
     FROM snapshots s
     JOIN snapshot_strikes_atm st ON st.ticker = s.ticker AND st.ts = s.ts
     WHERE s.ticker = $1 AND s.ts = $2
     ORDER BY st.strike`,
    [ticker, ts],
    "getSpotStrikesForSnapshot.atm",
  ).then(async (rows) => {
    if (rows.length) return rows;
    return query<SpotStrikeRow>(
      `SELECT s.ts, s.spot, s.regime, st.strike, st.gex_bn_per_pct, st.cumulative_gex_bn_per_pct
       FROM snapshots s
       JOIN snapshot_strikes st ON st.ticker = s.ticker AND st.ts = s.ts
       WHERE s.ticker = $1 AND s.ts = $2
       ORDER BY st.strike`,
      [ticker, ts],
      "getSpotStrikesForSnapshot",
    );
  });
}

export async function getMultiDaySeries(limit = 500): Promise<SnapshotBrief[]> {
  if (await isUwRaw()) return uw.uwGetMultiDaySeries(limit);
  const ticker = await resolveActiveTicker();
  return query<SnapshotBrief>(
    `SELECT ts, market_date, spot, total_gex, regime
     FROM snapshots
     WHERE ticker = $1
       AND ts >= (
         SELECT ts FROM snapshots WHERE ticker = $1 ORDER BY ts DESC LIMIT 1 OFFSET $2
       )
     ORDER BY ts ASC`,
    [ticker, limit],
    "getMultiDaySeries",
  );
}

export async function getFreshness(): Promise<FreshnessInfo | null> {
  if (await isUwRaw()) return uw.uwGetFreshness();
  const ticker = await resolveActiveTicker();
  const rows = await queryOptional<FreshnessInfo>(
    `SELECT s.ts, s.indexed_at, s.snapshot_at::text AS snapshot_at,
            CASE
              WHEN s.snapshot_at IS NOT NULL
              THEN EXTRACT(EPOCH FROM (NOW() - s.snapshot_at)) / 60
              WHEN s.indexed_at IS NOT NULL AND s.indexed_at ~ '^[0-9]{4}-'
              THEN EXTRACT(EPOCH FROM (NOW() - s.indexed_at::timestamptz)) / 60
              ELSE NULL
            END AS age_minutes,
            COALESCE(f.data_lag_sec, d.data_lag_sec) AS data_lag_sec,
            d.status AS diagnostic_status,
            COALESCE(f.quality_score, d.quality_score) AS quality_score
     FROM snapshots s
     LEFT JOIN snapshot_features f ON f.ticker = s.ticker AND f.ts = s.ts
     LEFT JOIN snapshot_diagnostics d ON d.ticker = s.ticker AND d.ts = s.ts
     WHERE s.ticker = $1
     ORDER BY s.ts DESC
     LIMIT 1`,
    [ticker],
    "getFreshness",
  );

  if (rows[0]) return rows[0];

  const legacy = await query<FreshnessInfo>(
    `SELECT ts, indexed_at, NULL::text AS snapshot_at,
            CASE
              WHEN indexed_at IS NOT NULL AND indexed_at ~ '^[0-9]{4}-'
              THEN EXTRACT(EPOCH FROM (NOW() - indexed_at::timestamptz)) / 60
              ELSE NULL
            END AS age_minutes,
            NULL::double precision AS data_lag_sec,
            NULL::text AS diagnostic_status,
            NULL::double precision AS quality_score
     FROM snapshots
     WHERE ticker = $1
     ORDER BY ts DESC
     LIMIT 1`,
    [ticker],
    "getFreshness.legacy",
  );
  return legacy[0] ?? null;
}

export async function getSnapshotSummary(ts: string): Promise<Snapshot | null> {
  if (await isUwRaw()) return uw.uwGetSnapshotSummary(ts);
  const ticker = await resolveActiveTicker();
  const full = await queryOptional<Snapshot>(
    `SELECT ${SNAPSHOT_COLUMNS}
     FROM snapshots
     WHERE ticker = $1 AND ts = $2`,
    [ticker, ts],
    "getSnapshotSummary",
  );
  if (full[0]) return full[0];

  const legacy = await queryOptional<Snapshot>(
    `SELECT ${SNAPSHOT_COLUMNS_LEGACY}
     FROM snapshots
     WHERE ticker = $1 AND ts = $2`,
    [ticker, ts],
    "getSnapshotSummary.legacy",
  );
  return legacy[0] ?? null;
}

export async function getWallDriftForDate(marketDate: string): Promise<WallDriftRow[]> {
  if (await isUwRaw()) return uw.uwGetWallDriftForDate(marketDate);
  const ticker = await resolveActiveTicker();
  const fromFeatures = await queryOptional<WallDriftRow>(
    `SELECT s.ts, s.spot, f.gamma_flip, f.call_wall, f.put_wall,
            f.quality_score, f.flip_confidence, f.regime_consistent,
            d.status AS diagnostic_status
     FROM snapshots s
     LEFT JOIN snapshot_features f ON f.ticker = s.ticker AND f.ts = s.ts
     LEFT JOIN snapshot_diagnostics d ON d.ticker = s.ticker AND d.ts = s.ts
     WHERE s.ticker = $1 AND s.market_date = $2
     ORDER BY s.ts ASC`,
    [ticker, marketDate],
    "getWallDriftForDate.features",
  );
  if (fromFeatures.length && fromFeatures.some((r) => r.call_wall != null || r.gamma_flip != null)) {
    return fromFeatures;
  }

  const flipRows = await query<{ ts: string; spot: number | null; gamma_flip: string | null }>(
    `SELECT ts, spot, summary_json->>'gamma_flip' AS gamma_flip
     FROM snapshots WHERE ticker = $1 AND market_date = $2 ORDER BY ts ASC`,
    [ticker, marketDate],
    "getWallDriftForDate.flip",
  );
  const callRows = await query<{ ts: string; call_wall: number }>(
    `SELECT DISTINCT ON (st.ts) st.ts, st.strike AS call_wall
     FROM snapshot_strikes st
     INNER JOIN snapshots s ON s.ticker = st.ticker AND s.ts = st.ts
     WHERE st.ticker = $1 AND s.market_date = $2 AND st.gex_bn_per_pct > 0
     ORDER BY st.ts, st.gex_bn_per_pct DESC`,
    [ticker, marketDate],
    "getWallDriftForDate.call",
  );
  const putRows = await query<{ ts: string; put_wall: number }>(
    `SELECT DISTINCT ON (st.ts) st.ts, st.strike AS put_wall
     FROM snapshot_strikes st
     INNER JOIN snapshots s ON s.ticker = st.ticker AND s.ts = st.ts
     WHERE st.ticker = $1 AND s.market_date = $2 AND st.gex_bn_per_pct < 0
     ORDER BY st.ts, st.gex_bn_per_pct ASC`,
    [ticker, marketDate],
    "getWallDriftForDate.put",
  );
  const callMap = new Map(callRows.map((r) => [r.ts, r.call_wall]));
  const putMap = new Map(putRows.map((r) => [r.ts, r.put_wall]));
  return flipRows.map((r) => ({
    ts: r.ts,
    spot: r.spot,
    gamma_flip: r.gamma_flip != null ? Number(r.gamma_flip) : null,
    call_wall: callMap.get(r.ts) ?? null,
    put_wall: putMap.get(r.ts) ?? null,
    quality_score: null,
    flip_confidence: null,
    regime_consistent: null,
    diagnostic_status: null,
  }));
}

export async function getHeatmapForDate(marketDate: string): Promise<HeatmapCell[]> {
  if (await isUwRaw()) return uw.uwGetHeatmapForDate(marketDate);
  const ticker = await resolveActiveTicker();
  const fromAtm = await queryOptional<HeatmapCell>(
    `SELECT s.ts, s.spot, st.strike, st.gex_bn_per_pct
     FROM snapshots s
     JOIN snapshot_strikes_atm st ON st.ticker = s.ticker AND st.ts = s.ts
     WHERE s.ticker = $1 AND s.market_date = $2
     ORDER BY s.ts ASC, st.strike ASC`,
    [ticker, marketDate],
    "getHeatmapForDate.atm",
  );
  if (fromAtm.length) return fromAtm;

  return query<HeatmapCell>(
    `SELECT s.ts, s.spot, st.strike, st.gex_bn_per_pct
     FROM snapshots s
     JOIN snapshot_strikes st ON st.ticker = s.ticker AND st.ts = s.ts
     WHERE s.ticker = $1 AND s.market_date = $2
       AND s.spot IS NOT NULL
       AND st.strike BETWEEN s.spot * 0.97 AND s.spot * 1.03
     ORDER BY s.ts ASC, st.strike ASC`,
    [ticker, marketDate],
    "getHeatmapForDate",
  );
}

export async function getGreeksPaginated(
  ts: string,
  limit = 100,
  offset = 0,
): Promise<{ rows: Record<string, unknown>[]; total: number }> {
  if (await isUwRaw()) return uw.uwGetGreeksPaginated(ts, limit, offset);
  const ticker = await resolveActiveTicker();
  const countRows = await query<{ total: string }>(
    `SELECT COALESCE(jsonb_array_length(greek_exposure_json), 0) AS total
     FROM snapshots WHERE ticker = $1 AND ts = $2`,
    [ticker, ts],
    "getGreeksPaginated.count",
  );
  const total = Number(countRows[0]?.total ?? 0);
  const rows = await query<{ row: Record<string, unknown> }>(
    `SELECT elem AS row
     FROM snapshots,
          LATERAL jsonb_array_elements(COALESCE(greek_exposure_json, '[]'::jsonb)) AS elem
     WHERE ticker = $1 AND ts = $2
     ORDER BY elem
     LIMIT $3 OFFSET $4`,
    [ticker, ts, limit, offset],
    "getGreeksPaginated",
  );
  return { rows: rows.map((r) => r.row), total };
}

export async function getDailyQualityStats(
  marketDate?: string,
  limit = 30,
): Promise<DailyQualityRow[]> {
  const ticker = await resolveActiveTicker();
  if (marketDate) {
    return queryOptional<DailyQualityRow>(
      `SELECT ticker, market_date, payload_json, updated_at
       FROM daily_quality_stats
       WHERE ticker = $1 AND market_date = $2`,
      [ticker, marketDate],
      "getDailyQualityStats",
    );
  }
  return queryOptional<DailyQualityRow>(
    `SELECT ticker, market_date, payload_json, updated_at
     FROM daily_quality_stats
     WHERE ticker = $1
     ORDER BY market_date DESC
     LIMIT $2`,
    [ticker, limit],
    "getDailyQualityStats",
  );
}

export async function getPredictionAccuracy(
  marketDate?: string,
  limit = 30,
): Promise<PredictionAccuracyRow[]> {
  const ticker = await resolveActiveTicker();
  if (marketDate) {
    return queryOptional<PredictionAccuracyRow>(
      `SELECT ticker, market_date, payload_json, updated_at
       FROM prediction_accuracy_daily
       WHERE ticker = $1 AND market_date = $2`,
      [ticker, marketDate],
      "getPredictionAccuracy",
    );
  }
  return queryOptional<PredictionAccuracyRow>(
    `SELECT ticker, market_date, payload_json, updated_at
     FROM prediction_accuracy_daily
     WHERE ticker = $1
     ORDER BY market_date DESC
     LIMIT $2`,
    [ticker, limit],
    "getPredictionAccuracy",
  );
}

export async function getTrades(limit = 100): Promise<TradeRow[]> {
  const ticker = await resolveActiveTicker();
  return query<TradeRow>(
    `SELECT id, ticker, status, option_type, strike, qty, entry_ts, exit_ts,
            entry_spot, exit_spot, entry_premium, exit_premium,
            pnl_pct, pnl_usd, exit_reason, signal_type
     FROM trades WHERE ticker = $1 ORDER BY entry_ts DESC LIMIT $2`,
    [ticker, limit],
    "getTrades",
  );
}

export async function getDecisions(limit = 100): Promise<DecisionRow[]> {
  const ticker = await resolveActiveTicker();
  return query<DecisionRow>(
    `SELECT id, ts, ticker, action, payload_json, ai_verdict, ai_notes
     FROM decisions WHERE ticker = $1 ORDER BY ts DESC LIMIT $2`,
    [ticker, limit],
    "getDecisions",
  );
}

export async function getLlmPredictions(limit = 100): Promise<LlmPredictionRow[]> {
  const ticker = await resolveActiveTicker();
  return query<LlmPredictionRow>(
    `SELECT id, ticker, source, snapshot_ts, market_date, created_at,
            resolved_at, payload_json, actual_json, outcome_json
     FROM llm_predictions WHERE ticker = $1 ORDER BY created_at DESC LIMIT $2`,
    [ticker, limit],
    "getLlmPredictions",
  );
}

export async function getDailyInsights(
  marketDate?: string,
  limit = 30,
): Promise<DailyInsightRow[]> {
  const ticker = await resolveActiveTicker();
  if (marketDate) {
    return query<DailyInsightRow>(
      `SELECT ticker, market_date, kind, payload_json, created_at, updated_at
       FROM daily_insights WHERE ticker = $1 AND market_date = $2 ORDER BY kind ASC`,
      [ticker, marketDate],
      "getDailyInsights",
    );
  }
  return query<DailyInsightRow>(
    `SELECT ticker, market_date, kind, payload_json, created_at, updated_at
     FROM daily_insights WHERE ticker = $1
     ORDER BY market_date DESC, kind ASC LIMIT $2`,
    [ticker, limit],
    "getDailyInsights",
  );
}

export async function getTrainingSnapshots(limit = 50): Promise<TrainingSnapshotRow[]> {
  const ticker = await resolveActiveTicker();
  return queryOptional<TrainingSnapshotRow>(
    `SELECT ticker, ts, market_date, spot, total_gex, regime,
            snapshot_at::text AS snapshot_at, quality_score, flip_confidence,
            regime_consistent, strike_count, delta_gex, spot_return,
            diagnostic_status
     FROM training_snapshots
     WHERE ticker = $1
     ORDER BY ts DESC
     LIMIT $2`,
    [ticker, limit],
    "getTrainingSnapshots",
  );
}

export async function getProcessorState(): Promise<ProcessorStateRow[]> {
  return queryOptional<ProcessorStateRow>(
    `SELECT key, value, updated_at
     FROM processor_state
     ORDER BY key ASC`,
    [],
    "getProcessorState",
  );
}

export async function getSurfaceForSnapshot(
  ts: string,
): Promise<Record<string, unknown>[]> {
  if (await isUwRaw()) return uw.uwGetSurfaceForSnapshot(ts);
  const ticker = await resolveActiveTicker();
  const rows = await queryOptional<{ surface_json: Record<string, unknown>[] | null }>(
    `SELECT surface_json FROM snapshots WHERE ticker = $1 AND ts = $2`,
    [ticker, ts],
    "getSurfaceForSnapshot",
  );
  const surface = rows[0]?.surface_json;
  return Array.isArray(surface) ? surface : [];
}

export async function getDbDiagnostics(): Promise<DbDiagnostics> {
  if (await isUwRaw()) {
    const diag = await uw.uwGetDbDiagnostics();
    diag.endpoints = await uw.uwListEndpoints(diag.active_ticker);
    return diag;
  }

  const configured = configuredTicker();
  const base: DbDiagnostics = {
    postgres: false,
    database_host: maskDatabaseHost(process.env.DATABASE_URL),
    configured_ticker: configured,
    active_ticker: configured,
    snapshot_count: 0,
    strike_count: 0,
    feature_count: 0,
    tickers: [],
    latest_ts: null,
    latest_market_date: null,
    tables_present: [],
    schema_issues: [],
    query_error: null,
    schema_mode: "processor",
  };

  if (!process.env.DATABASE_URL) {
    base.schema_issues = ["DATABASE_URL is not set on this service"];
    return base;
  }

  try {
    base.postgres = await checkDbConnection();
    if (!base.postgres) {
      base.schema_issues = ["Database connection failed — verify DATABASE_URL points to the new Postgres"];
      return base;
    }

    const tableRows = await queryOptional<{ name: string }>(
      `SELECT tablename AS name FROM pg_tables WHERE schemaname = 'public'
       UNION ALL
       SELECT viewname AS name FROM pg_views WHERE schemaname = 'public'
       UNION ALL
       SELECT matviewname AS name FROM pg_matviews WHERE schemaname = 'public'`,
      [],
      "getDbDiagnostics.tables",
    );
    base.tables_present = tableRows.map((r) => r.name);

    const missing = PROCESSOR_TABLES.filter((t) => !base.tables_present.includes(t));
    if (!base.tables_present.includes("snapshots")) {
      base.schema_issues.push(
        "snapshots table missing — run GEX processor schema init on this database",
      );
    } else if (missing.length) {
      base.schema_issues.push(`Optional schema not yet created: ${missing.join(", ")}`);
    }

    base.tickers = (
      await queryOptional<{ ticker: string; count: string }>(
        `SELECT ticker, COUNT(*)::text AS count
         FROM snapshots
         GROUP BY ticker
         ORDER BY count DESC`,
        [],
        "getDbDiagnostics.tickers",
      )
    ).map((r) => ({ ticker: r.ticker, count: Number(r.count) }));

    base.active_ticker = await resolveActiveTicker();
    base.snapshot_count = Number(
      (
        await queryOptional<{ cnt: string }>(
          `SELECT COUNT(*)::text AS cnt FROM snapshots WHERE ticker = $1`,
          [base.active_ticker],
          "getDbDiagnostics.snapshotCount",
        )
      )[0]?.cnt ?? 0,
    );
    base.strike_count = Number(
      (
        await queryOptional<{ cnt: string }>(
          `SELECT COUNT(*)::text AS cnt FROM snapshot_strikes WHERE ticker = $1`,
          [base.active_ticker],
          "getDbDiagnostics.strikeCount",
        )
      )[0]?.cnt ?? 0,
    );
    base.feature_count = Number(
      (
        await queryOptional<{ cnt: string }>(
          `SELECT COUNT(*)::text AS cnt FROM snapshot_features WHERE ticker = $1`,
          [base.active_ticker],
          "getDbDiagnostics.featureCount",
        )
      )[0]?.cnt ?? 0,
    );

    const latest = await selectLatestSnapshot(base.active_ticker);
    base.latest_ts = latest?.ts ?? null;
    base.latest_market_date = latest?.market_date ?? null;

    if (base.snapshot_count === 0 && base.tickers.length === 0) {
      base.schema_issues.push(
        "Postgres is connected but empty — set the processor DATABASE_URL to this database and run backfill (GEX_STARTUP_BACKFILL=1)",
      );
    } else if (base.snapshot_count === 0 && base.tickers.length > 0) {
      base.schema_issues.push(
        `No snapshots for ticker "${configured}". Found: ${base.tickers.map((t) => `${t.ticker} (${t.count})`).join(", ")}. Set GEX_TICKER if needed.`,
      );
    }
  } catch (error) {
    base.query_error = error instanceof Error ? error.message : "Diagnostic query failed";
  }

  return base;
}

