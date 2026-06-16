import type { Snapshot, StrikeRow, SummaryJson } from "@/lib/types";

export interface UwPeriscopeRow {
  id: number;
  raw_json: unknown;
  date: string;
  ticker: string;
  endpoint: string;
  content_hash?: string | null;
  created_at: string;
}

export function exportTsFromDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}_${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
}

export function exportTsFromIso(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return exportTsFromDate(d);
}

export function marketDateFromTs(ts: string): string {
  return ts.split("_")[0] ?? ts.slice(0, 10);
}

export function unwrapUwRows(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) {
    return raw.filter((row): row is Record<string, unknown> => !!row && typeof row === "object");
  }
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    for (const key of ["data", "rows", "results"]) {
      const val = obj[key];
      if (Array.isArray(val)) {
        return val.filter((row): row is Record<string, unknown> => !!row && typeof row === "object");
      }
    }
  }
  return [];
}

export function isStrikeEndpoint(endpoint: string): boolean {
  const ep = endpoint.toLowerCase();
  return ep.includes("spot-exposures/strike") || ep.includes("greek-exposure/strike");
}

export function isIntradayEndpoint(endpoint: string): boolean {
  const ep = endpoint.toLowerCase();
  return ep.includes("spot-exposures") && !ep.includes("/strike");
}

function num(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function netSpotGammaBn(row: Record<string, unknown>): number | null {
  const explicit = num(row.net_gamma_oi_bn) ?? num(row.gex_bn_per_pct);
  if (explicit != null) return explicit;

  const net = num(row.net_gamma_oi) ?? num(row.net_gex);
  if (net != null) {
    const ep = String(row._endpoint ?? "");
    if (ep.includes("greek-exposure")) return net / 1e3;
    return Math.abs(net) > 1e6 ? net / 1e9 : net;
  }

  const call = num(row.call_gamma_oi) ?? num(row.call_gex);
  const put = num(row.put_gamma_oi) ?? num(row.put_gex);
  if (call == null && put == null) return null;

  const c = call ?? 0;
  const p = put ?? 0;
  const sum = c + p;
  const diff = c - p;
  const raw = Math.abs(p) > 0 && p < 0 ? sum : diff;
  return Math.abs(raw) > 1e6 ? raw / 1e9 : raw / 1e3;
}

export function parseStrikeRows(raw: unknown, endpoint: string): StrikeRow[] {
  const rows = unwrapUwRows(raw);
  const strikes: StrikeRow[] = [];

  for (const row of rows) {
    const strike = num(row.strike);
    if (strike == null) continue;
    const gex = netSpotGammaBn({ ...row, _endpoint: endpoint });
    strikes.push({
      strike,
      gex_bn_per_pct: gex,
      cumulative_gex_bn_per_pct: null,
    });
  }

  strikes.sort((a, b) => a.strike - b.strike);
  let cumulative = 0;
  for (const row of strikes) {
    cumulative += row.gex_bn_per_pct ?? 0;
    row.cumulative_gex_bn_per_pct = cumulative;
  }
  return strikes;
}

export function extractSpot(raw: unknown, strikes: StrikeRow[]): number | null {
  const rows = unwrapUwRows(raw);
  for (const row of rows) {
    const spot = num(row.price) ?? num(row.spot) ?? num(row.spot_price);
    if (spot != null && spot > 0) return spot;
  }
  if (strikes.length) {
    const mid = strikes[Math.floor(strikes.length / 2)]?.strike;
    if (mid != null) return mid;
  }
  return null;
}

export function gammaFlipFromStrikes(strikes: StrikeRow[], spot: number | null): number | null {
  if (strikes.length < 2) return null;
  let best: number | null = null;
  let bestDist = Infinity;
  for (let i = 1; i < strikes.length; i++) {
    const prev = strikes[i - 1].cumulative_gex_bn_per_pct ?? 0;
    const curr = strikes[i].cumulative_gex_bn_per_pct ?? 0;
    if (prev === 0) {
      best = strikes[i - 1].strike;
      break;
    }
    if (curr === 0) {
      best = strikes[i].strike;
      break;
    }
    if ((prev < 0 && curr > 0) || (prev > 0 && curr < 0)) {
      const strike =
        strikes[i - 1].strike +
        ((0 - prev) / (curr - prev)) * (strikes[i].strike - strikes[i - 1].strike);
      const dist = spot != null ? Math.abs(strike - spot) : 0;
      if (dist < bestDist) {
        bestDist = dist;
        best = strike;
      }
    }
  }
  return best;
}

export function snapshotFromPeriscopeRow(row: UwPeriscopeRow): Snapshot {
  const strikes = parseStrikeRows(row.raw_json, row.endpoint);
  const spot = extractSpot(row.raw_json, strikes);
  const totalGex = strikes.reduce((sum, s) => sum + (s.gex_bn_per_pct ?? 0), 0);
  const ts = exportTsFromIso(row.created_at);
  const marketDate = row.date?.slice(0, 10) ?? marketDateFromTs(ts);
  const gammaFlip = gammaFlipFromStrikes(strikes, spot);

  const summary: SummaryJson = {
    ticker: row.ticker,
    market_date: marketDate,
    spot: spot ?? undefined,
    total_gex_bn_per_pct: totalGex,
    net_gamma_regime: totalGex >= 0 ? "LONG gamma" : "SHORT gamma",
    gamma_flip: gammaFlip ?? undefined,
    data_source: "uw_periscope",
    endpoint: row.endpoint,
    uw_row_id: row.id,
  };

  return {
    ticker: row.ticker,
    ts,
    market_date: marketDate,
    spot,
    total_gex: totalGex,
    regime: totalGex >= 0 ? "LONG gamma" : "SHORT gamma",
    summary_json: summary,
    expiration_json: null,
    surface_json: unwrapUwRows(row.raw_json),
    greek_exposure_json: isStrikeEndpoint(row.endpoint) ? unwrapUwRows(row.raw_json) : null,
    indexed_at: row.created_at,
    snapshot_at: row.created_at,
    prior_ts: null,
  };
}

export function parseIntradayTimelinePoints(
  raw: unknown,
  endpoint: string,
  fallbackDate: string,
  createdAt: string,
): Array<{
  ts: string;
  spot: number | null;
  total_gex: number | null;
  regime: string | null;
  gamma_flip: string | null;
}> {
  const rows = unwrapUwRows(raw);
  const out: Array<{
    ts: string;
    spot: number | null;
    total_gex: number | null;
    regime: string | null;
    gamma_flip: string | null;
  }> = [];

  for (const row of rows) {
    const time = row.time ?? row.timestamp ?? row.date;
    const spot = num(row.price) ?? num(row.spot);
    const total =
      num(row.gamma_per_one_percent) ??
      num(row.net_gamma) ??
      num(row.total_gamma) ??
      num(row.gamma);

    let ts = createdAt;
    if (typeof time === "string" && time.includes("T")) {
      ts = exportTsFromIso(time);
    } else if (typeof time === "string") {
      ts = `${fallbackDate}_${time.replace(/:/g, "").slice(0, 6)}`;
    }

    if (spot == null && total == null) continue;
    const gex = total != null ? (Math.abs(total) > 1e6 ? total / 1e9 : total) : null;
    out.push({
      ts,
      spot,
      total_gex: gex,
      regime: gex != null ? (gex >= 0 ? "LONG gamma" : "SHORT gamma") : null,
      gamma_flip: null,
    });
  }

  return out.sort((a, b) => a.ts.localeCompare(b.ts));
}
