import { Pool, type QueryResultRow } from "pg";
import { logDbError, logSlowQuery } from "@/lib/logger";
import type {
  DailyInsightRow,
  DailyQualityRow,
  DecisionRow,
  FreshnessInfo,
  HeatmapCell,
  LlmPredictionRow,
  PredictionAccuracyRow,
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
  WallDriftRow,
  Walls,
} from "@/lib/types";
import { TICKER } from "@/lib/types";

let pool: Pool | null = null;
let shutdownRegistered = false;

const SNAPSHOT_COLUMNS = `ticker, ts, market_date, spot, total_gex, regime,
  summary_json, expiration_json, surface_json, greek_exposure_json,
  indexed_at, snapshot_at, prior_ts`;

function resolveSsl(connectionString: string): false | { rejectUnauthorized: boolean } {
  if (connectionString.includes(".railway.internal")) return false;
  if (
    connectionString.includes("sslmode=require") ||
    connectionString.includes("ssl=true") ||
    connectionString.includes("proxy.rlwy.net")
  ) {
    return { rejectUnauthorized: false };
  }
  return false;
}

function registerShutdown() {
  if (shutdownRegistered || typeof process === "undefined") return;
  shutdownRegistered = true;
  const close = async () => {
    if (pool) {
      await pool.end().catch(() => undefined);
      pool = null;
    }
  };
  process.on("SIGTERM", close);
  process.on("SIGINT", close);
}

function getPool(): Pool | null {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) return null;
    pool = new Pool({
      connectionString,
      ssl: resolveSsl(connectionString),
      max: Number(process.env.PG_POOL_MAX ?? "5"),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
    registerShutdown();
  }
  return pool;
}

async function query<T extends QueryResultRow>(
  text: string,
  params?: unknown[],
  queryName = "query",
): Promise<T[]> {
  const db = getPool();
  if (!db) throw new Error("DATABASE_URL is not set");
  const started = Date.now();
  try {
    const result = await db.query<T>(text, params);
    logSlowQuery(queryName, Date.now() - started, { rows: result.rowCount });
    return result.rows;
  } catch (error) {
    logDbError(queryName, error);
    throw error;
  }
}

async function queryOptional<T extends QueryResultRow>(
  text: string,
  params?: unknown[],
  queryName = "query",
): Promise<T[]> {
  try {
    return await query<T>(text, params, queryName);
  } catch {
    return [];
  }
}

export function deriveWalls(strikes: StrikeRow[]): Walls {
  if (strikes.length === 0) return { call_wall: null, put_wall: null };
  let callWall: StrikeRow | null = null;
  let putWall: StrikeRow | null = null;
  for (const row of strikes) {
    const gex = row.gex_bn_per_pct ?? 0;
    if (gex > 0 && (!callWall || gex > (callWall.gex_bn_per_pct ?? 0))) callWall = row;
    if (gex < 0 && (!putWall || gex < (putWall.gex_bn_per_pct ?? 0))) putWall = row;
  }
  return { call_wall: callWall?.strike ?? null, put_wall: putWall?.strike ?? null };
}

export function wallsFromFeatures(
  features: SnapshotFeatures | null,
  strikes: StrikeRow[],
): Walls {
  if (features?.call_wall != null || features?.put_wall != null) {
    return {
      call_wall: features.call_wall ?? null,
      put_wall: features.put_wall ?? null,
    };
  }
  return deriveWalls(strikes);
}

export function gammaFlipFrom(
  features: SnapshotFeatures | null,
  summary: SummaryJson | null,
): number | null {
  if (features?.gamma_flip != null) return features.gamma_flip;
  const fromSummary = summary?.gamma_flip;
  if (fromSummary != null && !Number.isNaN(Number(fromSummary))) return Number(fromSummary);
  return null;
}

export async function getLatestSnapshot(): Promise<Snapshot | null> {
  const fromMv = await queryOptional<Snapshot>(
    `SELECT ${SNAPSHOT_COLUMNS}
     FROM latest_snapshot ls
     JOIN snapshots s ON s.ticker = ls.ticker AND s.ts = ls.ts
     WHERE ls.ticker = $1`,
    [TICKER],
    "getLatestSnapshot.mv",
  );
  if (fromMv[0]) return fromMv[0];

  const rows = await query<Snapshot>(
    `SELECT ${SNAPSHOT_COLUMNS}
     FROM snapshots
     WHERE ticker = $1
     ORDER BY ts DESC
     LIMIT 1`,
    [TICKER],
    "getLatestSnapshot",
  );
  return rows[0] ?? null;
}

export async function getSnapshotFeatures(ts: string): Promise<SnapshotFeatures | null> {
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
    [TICKER, ts],
    "getSnapshotFeatures",
  );
  return rows[0] ?? null;
}

export async function getSnapshotDiagnostics(ts: string): Promise<SnapshotDiagnostics | null> {
  const rows = await queryOptional<SnapshotDiagnostics>(
    `SELECT ticker, ts, status, validation_json, uw_fetch_ms, postgres_write_ms,
            indexed_at, quality_score, data_lag_sec
     FROM snapshot_diagnostics
     WHERE ticker = $1 AND ts = $2`,
    [TICKER, ts],
    "getSnapshotDiagnostics",
  );
  return rows[0] ?? null;
}

export async function getEnrichedSnapshot(ts: string): Promise<SnapshotEnriched | null> {
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
  const rows = await query<{ market_date: string }>(
    `SELECT DISTINCT market_date
     FROM snapshots
     WHERE ticker = $1 AND market_date IS NOT NULL
     ORDER BY market_date DESC
     LIMIT $2`,
    [TICKER, limit],
    "getMarketDates",
  );
  return rows.map((r) => r.market_date);
}

export async function getTimelineForDate(marketDate: string): Promise<SnapshotTimelineRow[]> {
  return queryOptional<SnapshotTimelineRow>(
    `SELECT s.ts, s.spot, s.total_gex, s.regime,
            COALESCE(f.gamma_flip::text, s.summary_json->>'gamma_flip') AS gamma_flip,
            f.quality_score,
            d.status AS diagnostic_status
     FROM snapshots s
     LEFT JOIN snapshot_features f ON f.ticker = s.ticker AND f.ts = s.ts
     LEFT JOIN snapshot_diagnostics d ON d.ticker = s.ticker AND d.ts = s.ts
     WHERE s.ticker = $1 AND s.market_date = $2
     ORDER BY s.ts ASC`,
    [TICKER, marketDate],
    "getTimelineForDate",
  ).then((rows) =>
    rows.length
      ? rows
      : query<SnapshotTimelineRow>(
          `SELECT ts, spot, total_gex, regime,
                  summary_json->>'gamma_flip' AS gamma_flip,
                  NULL::double precision AS quality_score,
                  NULL::text AS diagnostic_status
           FROM snapshots
           WHERE ticker = $1 AND market_date = $2
           ORDER BY ts ASC`,
          [TICKER, marketDate],
          "getTimelineForDate.legacy",
        ),
  );
}

export async function getSnapshotsInRange(
  startDate: string,
  endDate: string,
): Promise<SnapshotBrief[]> {
  return query<SnapshotBrief>(
    `SELECT ts, market_date, spot, total_gex, regime
     FROM snapshots
     WHERE ticker = $1 AND market_date BETWEEN $2 AND $3
     ORDER BY ts ASC`,
    [TICKER, startDate, endDate],
    "getSnapshotsInRange",
  );
}

export async function getStrikesForSnapshot(
  ts: string,
  source: "auto" | "atm" | "full" = "auto",
): Promise<StrikeRow[]> {
  const fetchAtm = async () =>
    queryOptional<StrikeRow>(
      `SELECT strike, gex_bn_per_pct, cumulative_gex_bn_per_pct
       FROM snapshot_strikes_atm
       WHERE ticker = $1 AND ts = $2
       ORDER BY strike ASC`,
      [TICKER, ts],
      "getStrikesForSnapshot.atm",
    );

  const fetchFull = async () =>
    query<StrikeRow>(
      `SELECT strike, gex_bn_per_pct, cumulative_gex_bn_per_pct
       FROM snapshot_strikes
       WHERE ticker = $1 AND ts = $2
       ORDER BY strike ASC`,
      [TICKER, ts],
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
  return queryOptional<SpotStrikeRow>(
    `SELECT s.ts, s.spot, s.regime, st.strike, st.gex_bn_per_pct, st.cumulative_gex_bn_per_pct
     FROM snapshots s
     JOIN snapshot_strikes_atm st ON st.ticker = s.ticker AND st.ts = s.ts
     WHERE s.ticker = $1 AND s.ts = $2
     ORDER BY st.strike`,
    [TICKER, ts],
    "getSpotStrikesForSnapshot.atm",
  ).then(async (rows) => {
    if (rows.length) return rows;
    return query<SpotStrikeRow>(
      `SELECT s.ts, s.spot, s.regime, st.strike, st.gex_bn_per_pct, st.cumulative_gex_bn_per_pct
       FROM snapshots s
       JOIN snapshot_strikes st ON st.ticker = s.ticker AND st.ts = s.ts
       WHERE s.ticker = $1 AND s.ts = $2
       ORDER BY st.strike`,
      [TICKER, ts],
      "getSpotStrikesForSnapshot",
    );
  });
}

export async function getMultiDaySeries(limit = 500): Promise<SnapshotBrief[]> {
  return query<SnapshotBrief>(
    `SELECT ts, market_date, spot, total_gex, regime
     FROM snapshots
     WHERE ticker = $1
       AND ts >= (
         SELECT ts FROM snapshots WHERE ticker = $1 ORDER BY ts DESC LIMIT 1 OFFSET $2
       )
     ORDER BY ts ASC`,
    [TICKER, limit],
    "getMultiDaySeries",
  );
}

export async function getFreshness(): Promise<FreshnessInfo | null> {
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
    [TICKER],
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
    [TICKER],
    "getFreshness.legacy",
  );
  return legacy[0] ?? null;
}

export async function getSnapshotSummary(ts: string): Promise<Snapshot | null> {
  const rows = await query<Snapshot>(
    `SELECT ${SNAPSHOT_COLUMNS}
     FROM snapshots
     WHERE ticker = $1 AND ts = $2`,
    [TICKER, ts],
    "getSnapshotSummary",
  );
  return rows[0] ?? null;
}

export async function getWallDriftForDate(marketDate: string): Promise<WallDriftRow[]> {
  const fromFeatures = await queryOptional<WallDriftRow>(
    `SELECT s.ts, s.spot, f.gamma_flip, f.call_wall, f.put_wall,
            f.quality_score, f.flip_confidence, f.regime_consistent,
            d.status AS diagnostic_status
     FROM snapshots s
     LEFT JOIN snapshot_features f ON f.ticker = s.ticker AND f.ts = s.ts
     LEFT JOIN snapshot_diagnostics d ON d.ticker = s.ticker AND d.ts = s.ts
     WHERE s.ticker = $1 AND s.market_date = $2
     ORDER BY s.ts ASC`,
    [TICKER, marketDate],
    "getWallDriftForDate.features",
  );
  if (fromFeatures.length && fromFeatures.some((r) => r.call_wall != null || r.gamma_flip != null)) {
    return fromFeatures;
  }

  const flipRows = await query<{ ts: string; spot: number | null; gamma_flip: string | null }>(
    `SELECT ts, spot, summary_json->>'gamma_flip' AS gamma_flip
     FROM snapshots WHERE ticker = $1 AND market_date = $2 ORDER BY ts ASC`,
    [TICKER, marketDate],
    "getWallDriftForDate.flip",
  );
  const callRows = await query<{ ts: string; call_wall: number }>(
    `SELECT DISTINCT ON (st.ts) st.ts, st.strike AS call_wall
     FROM snapshot_strikes st
     INNER JOIN snapshots s ON s.ticker = st.ticker AND s.ts = st.ts
     WHERE st.ticker = $1 AND s.market_date = $2 AND st.gex_bn_per_pct > 0
     ORDER BY st.ts, st.gex_bn_per_pct DESC`,
    [TICKER, marketDate],
    "getWallDriftForDate.call",
  );
  const putRows = await query<{ ts: string; put_wall: number }>(
    `SELECT DISTINCT ON (st.ts) st.ts, st.strike AS put_wall
     FROM snapshot_strikes st
     INNER JOIN snapshots s ON s.ticker = st.ticker AND s.ts = st.ts
     WHERE st.ticker = $1 AND s.market_date = $2 AND st.gex_bn_per_pct < 0
     ORDER BY st.ts, st.gex_bn_per_pct ASC`,
    [TICKER, marketDate],
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
  const fromAtm = await queryOptional<HeatmapCell>(
    `SELECT s.ts, s.spot, st.strike, st.gex_bn_per_pct
     FROM snapshots s
     JOIN snapshot_strikes_atm st ON st.ticker = s.ticker AND st.ts = s.ts
     WHERE s.ticker = $1 AND s.market_date = $2
     ORDER BY s.ts ASC, st.strike ASC`,
    [TICKER, marketDate],
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
    [TICKER, marketDate],
    "getHeatmapForDate",
  );
}

export async function getGreeksPaginated(
  ts: string,
  limit = 100,
  offset = 0,
): Promise<{ rows: Record<string, unknown>[]; total: number }> {
  const countRows = await query<{ total: string }>(
    `SELECT COALESCE(jsonb_array_length(greek_exposure_json), 0) AS total
     FROM snapshots WHERE ticker = $1 AND ts = $2`,
    [TICKER, ts],
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
    [TICKER, ts, limit, offset],
    "getGreeksPaginated",
  );
  return { rows: rows.map((r) => r.row), total };
}

export async function getDailyQualityStats(
  marketDate?: string,
  limit = 30,
): Promise<DailyQualityRow[]> {
  if (marketDate) {
    return queryOptional<DailyQualityRow>(
      `SELECT ticker, market_date, payload_json, updated_at
       FROM daily_quality_stats
       WHERE ticker = $1 AND market_date = $2`,
      [TICKER, marketDate],
      "getDailyQualityStats",
    );
  }
  return queryOptional<DailyQualityRow>(
    `SELECT ticker, market_date, payload_json, updated_at
     FROM daily_quality_stats
     WHERE ticker = $1
     ORDER BY market_date DESC
     LIMIT $2`,
    [TICKER, limit],
    "getDailyQualityStats",
  );
}

export async function getPredictionAccuracy(
  marketDate?: string,
  limit = 30,
): Promise<PredictionAccuracyRow[]> {
  if (marketDate) {
    return queryOptional<PredictionAccuracyRow>(
      `SELECT ticker, market_date, payload_json, updated_at
       FROM prediction_accuracy_daily
       WHERE ticker = $1 AND market_date = $2`,
      [TICKER, marketDate],
      "getPredictionAccuracy",
    );
  }
  return queryOptional<PredictionAccuracyRow>(
    `SELECT ticker, market_date, payload_json, updated_at
     FROM prediction_accuracy_daily
     WHERE ticker = $1
     ORDER BY market_date DESC
     LIMIT $2`,
    [TICKER, limit],
    "getPredictionAccuracy",
  );
}

export async function getTrades(limit = 100): Promise<TradeRow[]> {
  return query<TradeRow>(
    `SELECT id, ticker, status, option_type, strike, qty, entry_ts, exit_ts,
            entry_spot, exit_spot, entry_premium, exit_premium,
            pnl_pct, pnl_usd, exit_reason, signal_type
     FROM trades WHERE ticker = $1 ORDER BY entry_ts DESC LIMIT $2`,
    [TICKER, limit],
    "getTrades",
  );
}

export async function getDecisions(limit = 100): Promise<DecisionRow[]> {
  return query<DecisionRow>(
    `SELECT id, ts, ticker, action, payload_json, ai_verdict, ai_notes
     FROM decisions WHERE ticker = $1 ORDER BY ts DESC LIMIT $2`,
    [TICKER, limit],
    "getDecisions",
  );
}

export async function getLlmPredictions(limit = 100): Promise<LlmPredictionRow[]> {
  return query<LlmPredictionRow>(
    `SELECT id, ticker, source, snapshot_ts, market_date, created_at,
            resolved_at, payload_json, actual_json, outcome_json
     FROM llm_predictions WHERE ticker = $1 ORDER BY created_at DESC LIMIT $2`,
    [TICKER, limit],
    "getLlmPredictions",
  );
}

export async function getDailyInsights(
  marketDate?: string,
  limit = 30,
): Promise<DailyInsightRow[]> {
  if (marketDate) {
    return query<DailyInsightRow>(
      `SELECT ticker, market_date, kind, payload_json, created_at, updated_at
       FROM daily_insights WHERE ticker = $1 AND market_date = $2 ORDER BY kind ASC`,
      [TICKER, marketDate],
      "getDailyInsights",
    );
  }
  return query<DailyInsightRow>(
    `SELECT ticker, market_date, kind, payload_json, created_at, updated_at
     FROM daily_insights WHERE ticker = $1
     ORDER BY market_date DESC, kind ASC LIMIT $2`,
    [TICKER, limit],
    "getDailyInsights",
  );
}

export async function checkDbConnection(): Promise<boolean> {
  try {
    const db = getPool();
    if (!db) return false;
    await db.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}
