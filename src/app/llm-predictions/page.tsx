"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { ChartSkeleton } from "@/components/LoadingSkeleton";
import { ProcessorOnlyGate } from "@/components/ProcessorOnlyGate";
import type { LlmPredictionRow } from "@/lib/types";

export default function LlmPredictionsPage() {
  const [predictions, setPredictions] = useState<LlmPredictionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/llm-predictions?limit=100")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setPredictions(data.predictions ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="page-header">
        <h1>LLM Predictions</h1>
        <p>Forecast history from the <code>llm_predictions</code> table.</p>
      </div>
      <ProcessorOnlyGate feature="LLM Predictions">
      {error ? <div className="error-banner">{error}</div> : null}
      <div className="card">
        {loading ? <ChartSkeleton /> : predictions.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Created</th>
                  <th>Source</th>
                  <th>Market Date</th>
                  <th>Snapshot</th>
                  <th>Resolved</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {predictions.map((p) => (
                  <tr key={p.id}>
                    <td>{p.created_at}</td>
                    <td>{p.source}</td>
                    <td>{p.market_date ?? "—"}</td>
                    <td>{p.snapshot_ts ?? "—"}</td>
                    <td>{p.resolved_at ?? "open"}</td>
                    <td>{p.outcome_json ? "yes" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No predictions" message="The llm_predictions table is empty." />
        )}
      </div>
      </ProcessorOnlyGate>
    </>
  );
}
