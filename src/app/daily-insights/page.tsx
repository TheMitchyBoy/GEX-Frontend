"use client";

import { useCallback, useEffect, useState } from "react";
import { SnapshotToolbar, useSnapshotFromUrl } from "@/components/SnapshotToolbar";
import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";
import type { DailyInsightRow } from "@/lib/types";

function InsightsContent() {
  const { marketDate } = useSnapshotFromUrl();
  const [insights, setInsights] = useState<DailyInsightRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (date: string) => {
    if (!date) return;
    setError(null);
    const url = date
      ? `/api/daily-insights?market_date=${date}`
      : "/api/daily-insights?limit=30";
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setInsights(data.insights ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    }
  }, []);

  useEffect(() => {
    if (marketDate) load(marketDate);
  }, [marketDate, load]);

  return (
    <>
      <SnapshotToolbar showSnapshot={false} />
      {error ? <div className="error-banner">{error}</div> : null}
      <div className="card">
        <h2>Daily Insights — {marketDate}</h2>
        {insights.length ? (
          <div className="insights-list">
            {insights.map((row) => (
              <article key={`${row.market_date}-${row.kind}`} className="insight-item">
                <h3>{row.kind}</h3>
                <pre className="insight-payload">{row.payload_json}</pre>
                <p className="glossary">Updated {row.updated_at}</p>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="No insights" message="No daily insights for this date." />
        )}
      </div>
    </>
  );
}

export default function DailyInsightsPage() {
  return (
    <PageShell>
      <div className="page-header">
        <h1>Daily Insights</h1>
        <p>AI lessons and strategies from the <code>daily_insights</code> table.</p>
      </div>
      <InsightsContent />
    </PageShell>
  );
}
