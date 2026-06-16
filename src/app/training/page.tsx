"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { formatGex, formatNumber } from "@/lib/time";
import type { TrainingSnapshotRow } from "@/lib/types";

export default function TrainingPage() {
  const [rows, setRows] = useState<TrainingSnapshotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/training?limit=100")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setRows(data.snapshots ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader
        title="Training Snapshots"
        description="High-quality slices from the training_snapshots view (quality ≥ 0.8, ok diagnostics)."
      />
      {error ? <div className="error-banner">{error}</div> : null}
      <div className="card">
        {loading ? (
          <p className="glossary">Loading…</p>
        ) : rows.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>TS</th>
                  <th>Spot</th>
                  <th>GEX</th>
                  <th>Quality</th>
                  <th>Flip conf.</th>
                  <th>Regime OK</th>
                  <th>Strikes</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.ts}>
                    <td>{r.ts}</td>
                    <td>{formatNumber(r.spot, 2)}</td>
                    <td>{formatGex(r.total_gex)}</td>
                    <td>{r.quality_score != null ? `${formatNumber(r.quality_score * 100, 0)}%` : "—"}</td>
                    <td>{r.flip_confidence ?? "—"}</td>
                    <td>{r.regime_consistent == null ? "—" : r.regime_consistent ? "Yes" : "No"}</td>
                    <td>{r.strike_count ?? "—"}</td>
                    <td>{r.diagnostic_status ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No training snapshots"
            message="The training_snapshots view is empty — processor may still be backfilling."
          />
        )}
      </div>
    </>
  );
}
