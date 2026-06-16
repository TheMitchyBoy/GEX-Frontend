"use client";

import { useCallback, useEffect, useState } from "react";
import { SnapshotToolbar, useSnapshotFromUrl } from "@/components/SnapshotToolbar";
import { PageShell } from "@/components/PageShell";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { formatTsLabel } from "@/lib/time";

function SurfaceContent() {
  const { ts } = useSnapshotFromUrl();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (snapshotTs: string) => {
    if (!snapshotTs) return;
    setError(null);
    try {
      const res = await fetch(`/api/snapshots/${encodeURIComponent(snapshotTs)}/surface`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setRows(data.surface ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    }
  }, []);

  useEffect(() => {
    if (ts) load(ts);
  }, [ts, load]);

  const columns = rows.length
    ? Array.from(
        rows.reduce((set, row) => {
          Object.keys(row).forEach((k) => set.add(k));
          return set;
        }, new Set<string>()),
      )
    : [];

  return (
    <>
      <SnapshotToolbar />
      {error ? <div className="error-banner">{error}</div> : null}
      {ts ? <p className="glossary" style={{ marginBottom: "1rem" }}>{formatTsLabel(ts)} ET</p> : null}
      <div className="card">
        <h2>Surface rows — snapshots.surface_json</h2>
        {rows.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 300).map((row, i) => (
                  <tr key={i}>
                    {columns.map((col) => (
                      <td key={col}>{String(row[col] ?? "—")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 300 ? (
              <p className="glossary" style={{ marginTop: "0.75rem" }}>
                Showing 300 of {rows.length} rows.
              </p>
            ) : null}
          </div>
        ) : (
          <EmptyState message="No surface_json rows for this snapshot." showHealthLink={false} />
        )}
      </div>
    </>
  );
}

export default function SurfacePage() {
  return (
    <PageShell>
      <PageHeader title="GEX Surface" description="Expiration/strike surface from snapshots.surface_json." />
      <SurfaceContent />
    </PageShell>
  );
}
