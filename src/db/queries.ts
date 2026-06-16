import { Pool, type QueryResultRow } from "pg";
import { logDbError, logSlowQuery } from "@/lib/logger";
import type {
  DailyInsightRow,
  DecisionRow,
  FreshnessInfo,
  HeatmapCell,
  LlmPredictionRow,
  Snapshot,
  SnapshotBrief,
  SnapshotTimelineRow,
  SpotStrikeRow,
  StrikeRow,
  TradeRow,
  WallDriftRow,
  Walls,
} from "@/lib/types";
import { TICKER } from "@/lib/types";

let pool: Pool | null = null;
let shutdownRegistered = false;

function resolveSsl(connectionString: string): false | { rejectUnauthorized: boolean } {
  if (connectionString.includes(".railway.internal")) {
    return false;
  }
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
    if (!connectionString) {
      return null;
    }

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
  if (!db) {
    throw new Error("DATABASE_URL is not set");
  }
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

export async function getLatestSnapshot(): Promise<Snapshot | null> {
  const rows = await query<Snapshot>(
    `SELECT ticker, ts, market_date, spot, total_gex, regime,
            summary_json, expiration_json, greek_exposure_json, indexed_at
     FROM snapshots
     WHERE ticker = $1
     ORDER BY ts DESC
     LIMIT 1`,
    [TICKER],
    "getLatestSnapshot",
  );
  return rows[0] ?? null;
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

export async function getTimelineForDate(
  marketDate: string,
): Promise<SnapshotTimelineRow[]> {
  return query<SnapshotTimelineRow>(
    `SELECT ts, spot, total_gex, regime,
            summary_json->>'gamma_flip' AS gamma_flip
     FROM snapshots
     WHERE ticker = $1 AND market_date = $2
     ORDER BY ts ASC`,
    [TICKER, marketDate],
    "getTimelineForDate",
  );
}

export async function getSnapshotsInRange(
  startDate: string,
  endDate: string,
): Promise<SnapshotBrief[]> {
  return query<SnapshotBrief>(
    `SELECT ts, market_date, spot, total_gex, regime
     FROM snapshots
     WHERE ticker = $1
       AND market_date BETWEEN $2 AND $3
     ORDER BY ts ASC`,
    [TICKER, startDate, endDate],
    "getSnapshotsInRange",
  );
}

export async function getStrikesForSnapshot(ts: string): Promise<StrikeRow[]> {
  return query<StrikeRow>(
    `SELECT strike, gex_bn_per_pct, cumulative_gex_bn_per_pct
     FROM snapshot_strikes
     WHERE ticker = $1 AND ts = $2
     ORDER BY strike ASC`,
    [TICKER, ts],
    "getStrikesForSnapshot",
  );
}

export async function getSpotStrikesForSnapshot(
  ts: string,
): Promise<SpotStrikeRow[]> {
  return query<SpotStrikeRow>(
    `SELECT s.ts, s.spot, s.regime, st.strike,
            st.gex_bn_per_pct, st.cumulative_gex_bn_per_pct
     FROM snapshots s
     JOIN snapshot_strikes st ON st.ticker = s.ticker AND st.ts = s.ts
     WHERE s.ticker = $1 AND s.ts = $2
     ORDER BY st.strike`,
    [TICKER, ts],
    "getSpotStrikesForSnapshot",
  );
}

export async function getMultiDaySeries(limit = 500): Promise<SnapshotBrief[]> {
  return query<SnapshotBrief>(
    `SELECT ts, market_date, spot, total_gex, regime
     FROM snapshots
     WHERE ticker = $1
       AND ts >= (
         SELECT ts FROM snapshots
         WHERE ticker = $1
         ORDER BY ts DESC
         LIMIT 1 OFFSET $2
       )
     ORDER BY ts ASC`,
    [TICKER, limit],
    "getMultiDaySeries",
  );
}

export async function getFreshness(): Promise<FreshnessInfo | null> {
  const rows = await query<FreshnessInfo>(
    `SELECT ts, indexed_at,
            CASE
              WHEN indexed_at IS NOT NULL
                AND indexed_at ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
              THEN EXTRACT(EPOCH FROM (NOW() - indexed_at::timestamptz)) / 60
              ELSE NULL
            END AS age_minutes
     FROM snapshots
     WHERE ticker = $1
     ORDER BY ts DESC
     LIMIT 1`,
    [TICKER],
    "getFreshness",
  );
  return rows[0] ?? null;
}

export async function getSnapshotSummary(ts: string): Promise<Snapshot | null> {
  const rows = await query<Snapshot>(
    `SELECT ticker, ts, market_date, spot, total_gex, regime,
            summary_json, expiration_json, greek_exposure_json, indexed_at
     FROM snapshots
     WHERE ticker = $1 AND ts = $2`,
    [TICKER, ts],
    "getSnapshotSummary",
  );
  return rows[0] ?? null;
}

export async function getWallDriftForDate(marketDate: string): Promise<WallDriftRow[]> {
  const flipRows = await query<{
    ts: string;
    spot: number | null;
    gamma_flip: string | null;
  }>(
    `SELECT ts, spot, summary_json->>'gamma_flip' AS gamma_flip
     FROM snapshots
     WHERE ticker = $1 AND market_date = $2
     ORDER BY ts ASC`,
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
  }));
}

export async function getHeatmapForDate(
  marketDate: string,
  pctBand = 0.03,
): Promise<HeatmapCell[]> {
  return query<HeatmapCell>(
    `SELECT s.ts, s.spot, st.strike, st.gex_bn_per_pct
     FROM snapshots s
     JOIN snapshot_strikes st ON st.ticker = s.ticker AND st.ts = s.ts
     WHERE s.ticker = $1 AND s.market_date = $2
       AND s.spot IS NOT NULL
       AND st.strike BETWEEN s.spot * (1 - $3) AND s.spot * (1 + $3)
     ORDER BY s.ts ASC, st.strike ASC`,
    [TICKER, marketDate, pctBand],
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
     FROM snapshots
     WHERE ticker = $1 AND ts = $2`,
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

export async function getTrades(limit = 100): Promise<TradeRow[]> {
  return query<TradeRow>(
    `SELECT id, ticker, status, option_type, strike, qty, entry_ts, exit_ts,
            entry_spot, exit_spot, entry_premium, exit_premium,
            pnl_pct, pnl_usd, exit_reason, signal_type
     FROM trades
     WHERE ticker = $1
     ORDER BY entry_ts DESC
     LIMIT $2`,
    [TICKER, limit],
    "getTrades",
  );
}

export async function getDecisions(limit = 100): Promise<DecisionRow[]> {
  return query<DecisionRow>(
    `SELECT id, ts, ticker, action, payload_json, ai_verdict, ai_notes
     FROM decisions
     WHERE ticker = $1
     ORDER BY ts DESC
     LIMIT $2`,
    [TICKER, limit],
    "getDecisions",
  );
}

export async function getLlmPredictions(limit = 100): Promise<LlmPredictionRow[]> {
  return query<LlmPredictionRow>(
    `SELECT id, ticker, source, snapshot_ts, market_date, created_at,
            resolved_at, payload_json, actual_json, outcome_json
     FROM llm_predictions
     WHERE ticker = $1
     ORDER BY created_at DESC
     LIMIT $2`,
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
       FROM daily_insights
       WHERE ticker = $1 AND market_date = $2
       ORDER BY kind ASC`,
      [TICKER, marketDate],
      "getDailyInsights",
    );
  }
  return query<DailyInsightRow>(
    `SELECT ticker, market_date, kind, payload_json, created_at, updated_at
     FROM daily_insights
     WHERE ticker = $1
     ORDER BY market_date DESC, kind ASC
     LIMIT $2`,
    [TICKER, limit],
    "getDailyInsights",
  );
}

export function deriveWalls(strikes: StrikeRow[]): Walls {
  if (strikes.length === 0) {
    return { call_wall: null, put_wall: null };
  }

  let callWall: StrikeRow | null = null;
  let putWall: StrikeRow | null = null;

  for (const row of strikes) {
    const gex = row.gex_bn_per_pct ?? 0;
    if (gex > 0 && (!callWall || gex > (callWall.gex_bn_per_pct ?? 0))) {
      callWall = row;
    }
    if (gex < 0 && (!putWall || gex < (putWall.gex_bn_per_pct ?? 0))) {
      putWall = row;
    }
  }

  return {
    call_wall: callWall?.strike ?? null,
    put_wall: putWall?.strike ?? null,
  };
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
