export interface DbDiagnostics {
  postgres: boolean;
  database_host: string | null;
  configured_ticker: string;
  active_ticker: string;
  snapshot_count: number;
  strike_count: number;
  feature_count: number;
  tickers: Array<{ ticker: string; count: number }>;
  latest_ts: string | null;
  latest_market_date: string | null;
  tables_present: string[];
  schema_issues: string[];
  query_error: string | null;
  schema_mode?: "processor" | "uw_raw";
  endpoints?: Array<{ endpoint: string; count: number }>;
}

export function maskDatabaseHost(connectionString?: string): string | null {
  if (!connectionString) return null;
  try {
    const url = new URL(connectionString);
    const db = url.pathname.replace(/^\//, "") || "postgres";
    return `${url.hostname}${url.port ? `:${url.port}` : ""}/${db}`;
  } catch {
    return "(invalid DATABASE_URL)";
  }
}
