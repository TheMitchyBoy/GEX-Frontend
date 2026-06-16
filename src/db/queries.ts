import { Pool, type QueryResultRow } from "pg";
import type {
  FreshnessInfo,
  Snapshot,
  SnapshotBrief,
  SnapshotTimelineRow,
  SpotStrikeRow,
  StrikeRow,
  Walls,
} from "@/lib/types";
import { TICKER } from "@/lib/types";

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }

    const useSsl =
      connectionString.includes("railway") ||
      connectionString.includes("sslmode=require") ||
      process.env.NODE_ENV === "production";

    pool = new Pool({
      connectionString,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return pool;
}

async function query<T extends QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const result = await getPool().query<T>(text, params);
  return result.rows;
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
  );
}

export async function getStrikesForSnapshot(ts: string): Promise<StrikeRow[]> {
  return query<StrikeRow>(
    `SELECT strike, gex_bn_per_pct, cumulative_gex_bn_per_pct
     FROM snapshot_strikes
     WHERE ticker = $1 AND ts = $2
     ORDER BY strike ASC`,
    [TICKER, ts],
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
  );
}

export async function getFreshness(): Promise<FreshnessInfo | null> {
  const rows = await query<FreshnessInfo>(
    `SELECT ts, indexed_at,
            EXTRACT(EPOCH FROM (NOW() - indexed_at::timestamptz)) / 60 AS age_minutes
     FROM snapshots
     WHERE ticker = $1
     ORDER BY ts DESC
     LIMIT 1`,
    [TICKER],
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
  );
  return rows[0] ?? null;
}

export async function deriveWalls(strikes: StrikeRow[]): Promise<Walls> {
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
    await getPool().query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}
