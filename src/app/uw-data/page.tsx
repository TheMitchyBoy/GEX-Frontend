"use client";

import { useCallback, useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { PageHeader } from "@/components/PageHeader";
import { useSchema } from "@/components/SchemaProvider";
import Link from "next/link";

interface ExploreRow {
  id: number;
  source: string;
  date: string;
  ticker: string | null;
  endpoint: string | null;
  created_at: string;
  row_count: number;
  keys: string[];
  kind: string;
  parseable: boolean;
  normalized_endpoint: string | null;
}

function UwDataContent() {
  const { mode } = useSchema();
  const [rows, setRows] = useState<ExploreRow[]>([]);
  const [endpoints, setEndpoints] = useState<Array<{ endpoint: string; count: number }>>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [endpointFilter, setEndpointFilter] = useState("");
  const [sample, setSample] = useState<unknown>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (endpointFilter) params.set("endpoint", endpointFilter);
      const res = await fetch(`/api/uw-data?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setRows(data.rows ?? []);
      setTotal(data.total ?? 0);
      setEndpoints(data.endpoints ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [endpointFilter]);

  useEffect(() => {
    if (mode === "uw_raw") load();
  }, [mode, load]);

  const loadSample = async (id: number) => {
    const res = await fetch(`/api/uw-data?sample_id=${id}&source=uw_periscope`);
    const data = await res.json();
    setSample(data.sample ?? null);
  };

  if (mode === "processor") {
    return (
      <div className="card">
        <p>This page is for <code>uw_periscope</code> / <code>uw_history</code> databases.</p>
        <p className="glossary">
          Your database uses the GEX processor schema. Use{" "}
          <Link href="/quality" className="text-link">Quality</Link> or{" "}
          <Link href="/api/db-info" className="text-link">/api/db-info</Link> instead.
        </p>
      </div>
    );
  }

  return (
    <>
      {error ? <div className="error-banner">{error}</div> : null}
      <div className="card" style={{ marginBottom: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>Endpoint summary</h2>
        {endpoints.length ? (
          <div className="chip-row">
            {endpoints.map((e) => (
              <button
                key={e.endpoint}
                type="button"
                className={`chip ${endpointFilter === e.endpoint ? "active" : ""}`}
                onClick={() =>
                  setEndpointFilter((cur) => (cur === e.endpoint ? "" : e.endpoint))
                }
              >
                {e.endpoint} ({e.count})
              </button>
            ))}
          </div>
        ) : (
          <p className="glossary">No uw_periscope rows yet.</p>
        )}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Cached rows ({total})</h2>
        {loading ? (
          <p className="glossary">Loading…</p>
        ) : rows.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Date</th>
                  <th>Endpoint</th>
                  <th>Kind</th>
                  <th>Rows</th>
                  <th>Keys</th>
                  <th>OK</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{r.date}</td>
                    <td><code>{r.normalized_endpoint ?? r.endpoint}</code></td>
                    <td>{r.kind}</td>
                    <td>{r.row_count}</td>
                    <td>{r.keys.slice(0, 6).join(", ")}{r.keys.length > 6 ? "…" : ""}</td>
                    <td>{r.parseable ? "✓" : "—"}</td>
                    <td>
                      <button type="button" className="text-link" onClick={() => loadSample(r.id)}>
                        JSON
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="glossary">No rows match this filter.</p>
        )}
      </div>

      {sample ? (
        <div className="card" style={{ marginTop: "1rem" }}>
          <h2 style={{ marginTop: 0 }}>Sample payload</h2>
          <pre className="json-preview">{JSON.stringify(sample, null, 2)}</pre>
        </div>
      ) : null}
    </>
  );
}

export default function UwDataPage() {
  return (
    <PageShell>
      <PageHeader
        title="UW Data Explorer"
        description="Inspect uw_periscope cache: endpoints, row counts, JSON keys, and sample payloads."
      />
      <UwDataContent />
    </PageShell>
  );
}
