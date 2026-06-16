"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { DbDiagnostics } from "@/lib/db-diagnostics";

export function DbEmptyState() {
  const [info, setInfo] = useState<DbDiagnostics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/db-info", { cache: "no-store" })
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => setInfo(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="empty-state">
      <div className="empty-icon" aria-hidden>
        ◌
      </div>
      <p className="empty-title">No snapshots yet</p>
      <p className="empty-message">
        The dashboard could not load SPX snapshot data from Postgres.
      </p>

      {loading ? (
        <p className="glossary">Checking database…</p>
      ) : info ? (
        <div className="card" style={{ marginTop: "1.25rem", textAlign: "left", maxWidth: "42rem" }}>
          <h2 style={{ marginTop: 0 }}>Database status</h2>
          <dl className="diag-list">
            <div>
              <dt>Connected</dt>
              <dd>{info.postgres ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt>Host</dt>
              <dd><code>{info.database_host ?? "—"}</code></dd>
            </div>
            <div>
              <dt>Ticker</dt>
              <dd>
                configured <code>{info.configured_ticker}</code>
                {info.active_ticker !== info.configured_ticker ? (
                  <> · active <code>{info.active_ticker}</code></>
                ) : null}
              </dd>
            </div>
            <div>
              <dt>Snapshots</dt>
              <dd>{info.snapshot_count}</dd>
            </div>
            <div>
              <dt>Strikes</dt>
              <dd>{info.strike_count}</dd>
            </div>
            <div>
              <dt>Latest ts</dt>
              <dd>{info.latest_ts ?? "—"}</dd>
            </div>
          </dl>

          {info.tickers.length ? (
            <p className="glossary">
              Tickers in DB:{" "}
              {info.tickers.map((t) => `${t.ticker} (${t.count})`).join(", ")}
            </p>
          ) : null}

          {info.schema_issues.length ? (
            <ul className="diag-issues">
              {info.schema_issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          ) : null}

          {info.query_error ? (
            <p className="error-banner" style={{ marginTop: "0.75rem" }}>
              {info.query_error}
            </p>
          ) : null}

          <p className="glossary" style={{ marginTop: "1rem" }}>
            On Railway, set <code>DATABASE_URL=${"{Postgres.DATABASE_URL}"}</code> on this
            dashboard service to the <strong>same</strong> Postgres as the GEX processor.
            Then run the processor with <code>GEX_STARTUP_BACKFILL=1</code> or wait for live
            writes.
          </p>
        </div>
      ) : null}

      <p className="empty-action" style={{ marginTop: "1rem" }}>
        <Link href="/api/db-info" className="text-link">
          /api/db-info
        </Link>
        <span> · </span>
        <Link href="/api/health" className="text-link">
          /api/health
        </Link>
      </p>
    </div>
  );
}
