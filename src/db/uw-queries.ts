import { checkDbConnection, query, queryOptional } from "@/db/pg";
import type { DbDiagnostics } from "@/lib/db-diagnostics";
import { maskDatabaseHost } from "@/lib/db-diagnostics";
import { configuredTicker, getResolvedTicker, setResolvedTicker } from "@/lib/ticker";
import {
  exportTsFromIso,
  gammaFlipFromStrikes,
  inspectRawJson,
  isStrikeEndpoint,
  marketDateFromTs,
  normalizeEndpoint,
  parseExpirationJson,
  parseIntradayTimelinePoints,
  parseStrikeRows,
  snapshotFromPeriscopeRow,
  unwrapUwRows,
  type UwPeriscopeRow,
} from "@/lib/uw-parser";
import type {
  FreshnessInfo,
  HeatmapCell,
  Snapshot,
  SnapshotBrief,
  SnapshotEnriched,
  SnapshotTimelineRow,
  SpotStrikeRow,
  StrikeRow,
  WallDriftRow,
  Walls,
} from "@/lib/types";
import { deriveWalls, gammaFlipFrom } from "@/db/queries-shared";

const PERISCOPE_SELECT = `id, raw_json, date::text AS date, ticker, endpoint, content_hash, created_at::text AS created_at`;

let tickerCacheAt = 0;

async function resolveUwTicker(): Promise<string> {
  if (tickerCacheAt > 0 && Date.now() - tickerCacheAt < 60_000) {
    return getResolvedTicker();
  }
  const configured = configuredTicker();
  const forConfigured = await queryOptional<{ cnt: string }>(
    `SELECT COUNT(*)::text AS cnt FROM uw_periscope WHERE ticker = $1`,
    [configured],
    "resolveUwTicker.configured",
  );
  if (Number(forConfigured[0]?.cnt ?? 0) > 0) {
    setResolvedTicker(configured);
    tickerCacheAt = Date.now();
    return configured;
  }
  const any = await queryOptional<{ ticker: string }>(
    `SELECT ticker FROM uw_periscope GROUP BY ticker ORDER BY COUNT(*) DESC LIMIT 1`,
    [],
    "resolveUwTicker.any",
  );
  const resolved = any[0]?.ticker ?? configured;
  setResolvedTicker(resolved);
  tickerCacheAt = Date.now();
  return resolved;
}

async function fetchPeriscopeRowByTs(ticker: string, ts: string): Promise<UwPeriscopeRow | null> {
  const marketDate = marketDateFromTs(ts);
  const rows = await queryOptional<UwPeriscopeRow>(
    `SELECT ${PERISCOPE_SELECT}
     FROM uw_periscope
     WHERE ticker = $1
       AND (
         to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD_HH24MISS') = $2
         OR (date::text = $3 AND endpoint ILIKE '%strike%')
       )
     ORDER BY
       CASE WHEN to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD_HH24MISS') = $2 THEN 0 ELSE 1 END,
       created_at DESC
     LIMIT 1`,
    [ticker, ts, marketDate],
    "uw.fetchPeriscopeRowByTs",
  );
  return rows[0] ?? null;
}

export async function uwGetLatestSnapshot(): Promise<Snapshot | null> {
  const ticker = await resolveUwTicker();
  const strikeRows = await queryOptional<UwPeriscopeRow>(
    `SELECT ${PERISCOPE_SELECT}
     FROM uw_periscope
     WHERE ticker = $1 AND endpoint ILIKE '%strike%'
     ORDER BY created_at DESC
     LIMIT 1`,
    [ticker],
    "uw.getLatestSnapshot.strike",
  );
  if (strikeRows[0]) return snapshotFromPeriscopeRow(strikeRows[0]);

  const anyRows = await queryOptional<UwPeriscopeRow>(
    `SELECT ${PERISCOPE_SELECT}
     FROM uw_periscope
     WHERE ticker = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [ticker],
    "uw.getLatestSnapshot.any",
  );
  return anyRows[0] ? snapshotFromPeriscopeRow(anyRows[0]) : null;
}

export async function uwGetSnapshotSummary(ts: string): Promise<Snapshot | null> {
  const ticker = await resolveUwTicker();
  const row = await fetchPeriscopeRowByTs(ticker, ts);
  return row ? snapshotFromPeriscopeRow(row) : null;
}

export async function uwGetEnrichedSnapshot(ts: string): Promise<SnapshotEnriched | null> {
  const snapshot = await uwGetSnapshotSummary(ts);
  if (!snapshot) return null;
  const [strikes, expiration] = await Promise.all([
    uwGetStrikesForSnapshot(ts, "auto"),
    uwGetExpirationForSnapshot(ts),
  ]);
  const walls = deriveWalls(strikes);
  const gammaFlip = gammaFlipFrom(null, snapshot.summary_json);
  return {
    ...snapshot,
    expiration_json: Object.keys(expiration).length ? expiration : snapshot.expiration_json,
    features: null,
    diagnostics: null,
    walls,
    gamma_flip: gammaFlip,
  };
}

async function uwGetExpirationForSnapshot(ts: string): Promise<Record<string, number>> {
  const ticker = await resolveUwTicker();
  const marketDate = marketDateFromTs(ts);
  const rows = await queryOptional<UwPeriscopeRow>(
    `SELECT ${PERISCOPE_SELECT}
     FROM uw_periscope
     WHERE ticker = $1 AND date = $2::date
       AND (endpoint ILIKE '%expir%' OR endpoint ILIKE '%expiry%')
     ORDER BY created_at DESC
     LIMIT 5`,
    [ticker, marketDate],
    "uw.getExpiration",
  );
  const merged: Record<string, number> = {};
  for (const row of rows) {
    Object.assign(merged, parseExpirationJson(row.raw_json, row.endpoint));
  }
  return merged;
}

export async function uwGetGreeksPaginated(
  ts: string,
  limit = 100,
  offset = 0,
): Promise<{ rows: Record<string, unknown>[]; total: number }> {
  const ticker = await resolveUwTicker();
  const row = await fetchPeriscopeRowByTs(ticker, ts);
  if (!row) return { rows: [], total: 0 };

  let greeks = unwrapUwRows(row.raw_json);
  if (!greeks.length && isStrikeEndpoint(row.endpoint) === false) {
    const alt = await queryOptional<UwPeriscopeRow>(
      `SELECT ${PERISCOPE_SELECT}
       FROM uw_periscope
       WHERE ticker = $1 AND date = $2::date
         AND (endpoint ILIKE '%greek-exposure%strike%' OR endpoint ILIKE '%spot-exposures%strike%')
       ORDER BY created_at DESC LIMIT 1`,
      [ticker, marketDateFromTs(ts)],
      "uw.getGreeks.alt",
    );
    if (alt[0]) greeks = unwrapUwRows(alt[0].raw_json);
  }

  const total = greeks.length;
  return { rows: greeks.slice(offset, offset + limit), total };
}

export interface UwExploreRow {
  id: number;
  source: "uw_periscope" | "uw_history";
  date: string;
  ticker: string | null;
  endpoint: string | null;
  created_at: string;
  content_hash: string | null;
  row_count: number;
  keys: string[];
  kind: string;
  parseable: boolean;
  normalized_endpoint: string | null;
}

export async function uwExploreData(options: {
  limit?: number;
  offset?: number;
  endpoint?: string;
  date?: string;
}): Promise<{ rows: UwExploreRow[]; total: number }> {
  const ticker = await resolveUwTicker();
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const offset = Math.max(options.offset ?? 0, 0);

  const params: unknown[] = [ticker];
  let where = `WHERE ticker = $1`;
  if (options.date) {
    params.push(options.date);
    where += ` AND date = $${params.length}::date`;
  }
  if (options.endpoint) {
    params.push(`%${options.endpoint}%`);
    where += ` AND endpoint ILIKE $${params.length}`;
  }

  const countRows = await queryOptional<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM uw_periscope ${where}`,
    params,
    "uw.explore.count",
  );
  const total = Number(countRows[0]?.total ?? 0);

  params.push(limit, offset);
  const periscope = await queryOptional<UwPeriscopeRow>(
    `SELECT ${PERISCOPE_SELECT}
     FROM uw_periscope
     ${where}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
    "uw.explore.rows",
  );

  const rows: UwExploreRow[] = periscope.map((row) => {
    const inspection = inspectRawJson(row.raw_json, row.endpoint);
    return {
      id: row.id,
      source: "uw_periscope",
      date: row.date,
      ticker: row.ticker,
      endpoint: row.endpoint,
      created_at: row.created_at,
      content_hash: row.content_hash ?? null,
      row_count: inspection.row_count,
      keys: inspection.keys,
      kind: inspection.kind,
      parseable: inspection.parseable,
      normalized_endpoint: normalizeEndpoint(row.endpoint),
    };
  });

  return { rows, total };
}

export async function uwGetSampleRawJson(id: number, source: "uw_periscope" | "uw_history") {
  if (source === "uw_history") {
    const rows = await queryOptional<{ raw_json: unknown; date: string; created_at: string }>(
      `SELECT raw_json, date::text AS date, created_at::text AS created_at FROM uw_history WHERE id = $1`,
      [id],
      "uw.sample.history",
    );
    return rows[0] ?? null;
  }
  const rows = await queryOptional<UwPeriscopeRow>(
    `SELECT ${PERISCOPE_SELECT} FROM uw_periscope WHERE id = $1`,
    [id],
    "uw.sample.periscope",
  );
  if (!rows[0]) return null;
  const row = rows[0];
  return {
    raw_json: row.raw_json,
    date: row.date,
    created_at: row.created_at,
    endpoint: row.endpoint,
    inspection: inspectRawJson(row.raw_json, row.endpoint),
  };
}

export async function uwGetMarketDates(limit = 90): Promise<string[]> {
  const ticker = await resolveUwTicker();
  const rows = await query<{ market_date: string }>(
    `SELECT day AS market_date
     FROM (
       SELECT DISTINCT date::text AS day FROM uw_periscope WHERE ticker = $1
       UNION
       SELECT DISTINCT date::text AS day FROM uw_history
     ) days
     ORDER BY day DESC
     LIMIT $2`,
    [ticker, limit],
    "uw.getMarketDates",
  );
  return rows.map((r) => r.market_date);
}

export async function uwGetTimelineForDate(marketDate: string): Promise<SnapshotTimelineRow[]> {
  const ticker = await resolveUwTicker();
  const intradayRows = await queryOptional<UwPeriscopeRow>(
    `SELECT ${PERISCOPE_SELECT}
     FROM uw_periscope
     WHERE ticker = $1 AND date = $2::date
       AND endpoint ILIKE '%spot-exposures%'
       AND endpoint NOT ILIKE '%/strike%'
     ORDER BY created_at ASC`,
    [ticker, marketDate],
    "uw.getTimeline.intraday",
  );

  const points: SnapshotTimelineRow[] = [];
  for (const row of intradayRows) {
    const parsed = parseIntradayTimelinePoints(row.raw_json, row.endpoint, marketDate, row.created_at);
    for (const p of parsed) {
      points.push({
        ts: p.ts,
        spot: p.spot,
        total_gex: p.total_gex,
        regime: p.regime,
        gamma_flip: p.gamma_flip,
        quality_score: null,
        diagnostic_status: null,
      });
    }
  }
  if (points.length) return points;

  const strikeRows = await queryOptional<UwPeriscopeRow>(
    `SELECT ${PERISCOPE_SELECT}
     FROM uw_periscope
     WHERE ticker = $1 AND date = $2::date AND endpoint ILIKE '%strike%'
     ORDER BY created_at ASC`,
    [ticker, marketDate],
    "uw.getTimeline.strike",
  );

  return strikeRows.map((row) => {
    const snap = snapshotFromPeriscopeRow(row);
    return {
      ts: snap.ts,
      spot: snap.spot,
      total_gex: snap.total_gex,
      regime: snap.regime,
      gamma_flip: snap.summary_json?.gamma_flip != null ? String(snap.summary_json.gamma_flip) : null,
      quality_score: null,
      diagnostic_status: row.endpoint,
    };
  });
}

export async function uwGetStrikesForSnapshot(
  ts: string,
  source: "auto" | "atm" | "full" = "auto",
): Promise<StrikeRow[]> {
  const ticker = await resolveUwTicker();
  const row = await fetchPeriscopeRowByTs(ticker, ts);
  if (!row) return [];

  let strikes = parseStrikeRows(row.raw_json, row.endpoint);
  if (!strikes.length && !isStrikeEndpoint(row.endpoint)) {
    const alt = await queryOptional<UwPeriscopeRow>(
      `SELECT ${PERISCOPE_SELECT}
       FROM uw_periscope
       WHERE ticker = $1 AND date = $2::date AND endpoint ILIKE '%strike%'
       ORDER BY created_at DESC
       LIMIT 1`,
      [ticker, marketDateFromTs(ts)],
      "uw.getStrikes.altStrike",
    );
    if (alt[0]) strikes = parseStrikeRows(alt[0].raw_json, alt[0].endpoint);
  }

  if (source === "atm" || source === "auto") {
    const snap = await uwGetSnapshotSummary(ts);
    const spot = snap?.spot;
    if (spot != null) {
      const filtered = strikes.filter((s) => s.strike >= spot * 0.97 && s.strike <= spot * 1.03);
      if (filtered.length) return filtered;
    }
  }
  return strikes;
}

export async function uwGetSpotStrikesForSnapshot(ts: string): Promise<SpotStrikeRow[]> {
  const snapshot = await uwGetSnapshotSummary(ts);
  const strikes = await uwGetStrikesForSnapshot(ts, "atm");
  return strikes.map((st) => ({
    ts,
    spot: snapshot?.spot ?? null,
    regime: snapshot?.regime ?? null,
    ...st,
  }));
}

export async function uwGetMultiDaySeries(limit = 500): Promise<SnapshotBrief[]> {
  const ticker = await resolveUwTicker();
  const rows = await queryOptional<UwPeriscopeRow>(
    `SELECT ${PERISCOPE_SELECT}
     FROM uw_periscope
     WHERE ticker = $1 AND endpoint ILIKE '%strike%'
     ORDER BY created_at DESC
     LIMIT $2`,
    [ticker, limit],
    "uw.getMultiDaySeries",
  );
  return rows
    .map((row) => {
      const snap = snapshotFromPeriscopeRow(row);
      return {
        ts: snap.ts,
        market_date: snap.market_date,
        spot: snap.spot,
        total_gex: snap.total_gex,
        regime: snap.regime,
      };
    })
    .reverse();
}

export async function uwGetFreshness(): Promise<FreshnessInfo | null> {
  const snapshot = await uwGetLatestSnapshot();
  if (!snapshot) return null;
  const created = snapshot.snapshot_at ?? snapshot.indexed_at;
  const ageMinutes =
    created != null
      ? (Date.now() - new Date(created).getTime()) / 60_000
      : null;
  return {
    ts: snapshot.ts,
    indexed_at: snapshot.indexed_at,
    snapshot_at: snapshot.snapshot_at ?? null,
    age_minutes: ageMinutes,
    data_lag_sec: null,
    diagnostic_status: snapshot.summary_json?.endpoint as string | null,
    quality_score: null,
  };
}

export async function uwGetHeatmapForDate(marketDate: string): Promise<HeatmapCell[]> {
  const ticker = await resolveUwTicker();
  const rows = await queryOptional<UwPeriscopeRow>(
    `SELECT ${PERISCOPE_SELECT}
     FROM uw_periscope
     WHERE ticker = $1 AND date = $2::date AND endpoint ILIKE '%strike%'
     ORDER BY created_at ASC`,
    [ticker, marketDate],
    "uw.getHeatmap",
  );

  const cells: HeatmapCell[] = [];
  for (const row of rows) {
    const snap = snapshotFromPeriscopeRow(row);
    const strikes = parseStrikeRows(row.raw_json, row.endpoint);
    const spot = snap.spot;
    for (const st of strikes) {
      if (spot != null && (st.strike < spot * 0.97 || st.strike > spot * 1.03)) continue;
      cells.push({
        ts: snap.ts,
        strike: st.strike,
        gex_bn_per_pct: st.gex_bn_per_pct,
        spot,
      });
    }
  }
  return cells;
}

export async function uwGetWallDriftForDate(marketDate: string): Promise<WallDriftRow[]> {
  const timeline = await uwGetTimelineForDate(marketDate);
  const out: WallDriftRow[] = [];
  for (const row of timeline) {
    const strikes = await uwGetStrikesForSnapshot(row.ts, "auto");
    const walls = deriveWalls(strikes);
    const flip = gammaFlipFromStrikes(strikes, row.spot);
    out.push({
      ts: row.ts,
      spot: row.spot,
      gamma_flip: flip,
      call_wall: walls.call_wall,
      put_wall: walls.put_wall,
      quality_score: null,
      flip_confidence: null,
      regime_consistent: null,
      diagnostic_status: row.diagnostic_status,
    });
  }
  return out;
}

export async function uwGetSurfaceForSnapshot(ts: string): Promise<Record<string, unknown>[]> {
  const snapshot = await uwGetSnapshotSummary(ts);
  if (Array.isArray(snapshot?.surface_json)) {
    return snapshot.surface_json as Record<string, unknown>[];
  }
  return [];
}

export async function uwGetDbDiagnostics(): Promise<DbDiagnostics> {
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
    schema_mode: "uw_raw",
  };

  if (!process.env.DATABASE_URL) {
    base.schema_issues = ["DATABASE_URL is not set on this service"];
    return base;
  }

  try {
    base.postgres = await checkDbConnection();
    if (!base.postgres) {
      base.schema_issues = ["Database connection failed"];
      return base;
    }
    const tableRows = await queryOptional<{ name: string }>(
      `SELECT tablename AS name FROM pg_tables WHERE schemaname = 'public' ORDER BY name`,
      [],
      "uw.diagnostics.tables",
    );
    base.tables_present = tableRows.map((r) => r.name);

    base.tickers = (
      await queryOptional<{ ticker: string; count: string }>(
        `SELECT ticker, COUNT(*)::text AS count FROM uw_periscope GROUP BY ticker ORDER BY count DESC`,
        [],
        "uw.diagnostics.tickers",
      )
    ).map((r) => ({ ticker: r.ticker, count: Number(r.count) }));

    base.active_ticker = await resolveUwTicker();
    base.snapshot_count = Number(
      (
        await queryOptional<{ cnt: string }>(
          `SELECT COUNT(*)::text AS cnt FROM uw_periscope WHERE ticker = $1`,
          [base.active_ticker],
          "uw.diagnostics.periscopeCount",
        )
      )[0]?.cnt ?? 0,
    );
    base.strike_count = Number(
      (
        await queryOptional<{ cnt: string }>(
          `SELECT COUNT(*)::text AS cnt FROM uw_periscope
           WHERE ticker = $1 AND endpoint ILIKE '%strike%'`,
          [base.active_ticker],
          "uw.diagnostics.strikeCount",
        )
      )[0]?.cnt ?? 0,
    );
    base.feature_count = Number(
      (
        await queryOptional<{ cnt: string }>(
          `SELECT COUNT(*)::text AS cnt FROM uw_history`,
          [],
          "uw.diagnostics.historyCount",
        )
      )[0]?.cnt ?? 0,
    );

    const latest = await uwGetLatestSnapshot();
    base.latest_ts = latest?.ts ?? null;
    base.latest_market_date = latest?.market_date ?? null;

    const endpoints = await queryOptional<{ endpoint: string; count: string }>(
      `SELECT endpoint, COUNT(*)::text AS count
       FROM uw_periscope
       WHERE ticker = $1
       GROUP BY endpoint
       ORDER BY count DESC`,
      [base.active_ticker],
      "uw.diagnostics.endpoints",
    );

    if (base.snapshot_count === 0) {
      base.schema_issues.push(
        "uw_periscope is empty — ensure the UW fetcher is writing to this database",
      );
    } else if (base.strike_count === 0) {
      base.schema_issues.push(
        `Found ${base.snapshot_count} uw_periscope rows but none with a strike endpoint. Endpoints: ${
          endpoints.map((e) => e.endpoint).join(", ") || "none"
        }`,
      );
    }
  } catch (error) {
    base.query_error = error instanceof Error ? error.message : "Diagnostic query failed";
  }

  return base;
}

export async function uwListEndpoints(ticker?: string): Promise<Array<{ endpoint: string; count: number }>> {
  const t = ticker ?? (await resolveUwTicker());
  const rows = await queryOptional<{ endpoint: string; count: string }>(
    `SELECT endpoint, COUNT(*)::text AS count
     FROM uw_periscope
     WHERE ticker = $1
     GROUP BY endpoint
     ORDER BY count DESC`,
    [t],
    "uw.listEndpoints",
  );
  return rows.map((r) => ({ endpoint: r.endpoint, count: Number(r.count) }));
}
