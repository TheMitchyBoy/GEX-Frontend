"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { ChartSkeleton } from "@/components/LoadingSkeleton";
import type { DecisionRow } from "@/lib/types";

export default function DecisionsPage() {
  const [decisions, setDecisions] = useState<DecisionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/decisions?limit=100")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setDecisions(data.decisions ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="page-header">
        <h1>Decision Log</h1>
        <p>Trader decisions and AI verdicts from the <code>decisions</code> table.</p>
      </div>
      {error ? <div className="error-banner">{error}</div> : null}
      <div className="card">
        {loading ? <ChartSkeleton /> : decisions.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>AI Verdict</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {decisions.map((d) => (
                  <tr key={d.id}>
                    <td>{d.ts}</td>
                    <td>{d.action}</td>
                    <td>{d.ai_verdict ?? "—"}</td>
                    <td>{d.ai_notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No decisions" message="The decisions table is empty." />
        )}
      </div>
    </>
  );
}
