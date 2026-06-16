"use client";

import { useCallback, useEffect, useState } from "react";
import { SnapshotToolbar, useSnapshotFromUrl } from "@/components/SnapshotToolbar";
import { PageShell } from "@/components/PageShell";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { formatNumber } from "@/lib/time";
import type { DailyQualityRow, PredictionAccuracyRow, ProcessorStateRow } from "@/lib/types";

function QualityContent() {
  const { marketDate } = useSnapshotFromUrl();
  const [quality, setQuality] = useState<DailyQualityRow[]>([]);
  const [accuracy, setAccuracy] = useState<PredictionAccuracyRow[]>([]);
  const [processorState, setProcessorState] = useState<ProcessorStateRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/processor-state")
      .then((r) => r.json())
      .then((data) => setProcessorState(data.state ?? []))
      .catch(() => setProcessorState([]));
  }, []);

  const load = useCallback(async (date: string) => {
    if (!date) return;
    setError(null);
    try {
      const [qRes, aRes] = await Promise.all([
        fetch(`/api/quality?market_date=${date}`),
        fetch(`/api/prediction-accuracy?market_date=${date}`),
      ]);
      const qData = await qRes.json();
      const aData = await aRes.json();
      setQuality(qData.stats ?? []);
      setAccuracy(aData.accuracy ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    }
  }, []);

  useEffect(() => {
    if (marketDate) load(marketDate);
  }, [marketDate, load]);

  const q = quality[0];
  const a = accuracy[0];

  return (
    <>
      <SnapshotToolbar showSnapshot={false} />
      {error ? <div className="error-banner">{error}</div> : null}

      <div className="grid grid-2">
        <div className="card">
          <h2>Daily Quality — {marketDate}</h2>
          {q ? (
            <pre className="insight-payload">{JSON.stringify(q.payload_json, null, 2)}</pre>
          ) : (
            <EmptyState title="No quality stats" message="daily_quality_stats may be empty for this date." showHealthLink={false} />
          )}
        </div>
        <div className="card">
          <h2>Prediction Accuracy</h2>
          {a ? (
            <dl className="metric-list">
              {Object.entries(a.payload_json).map(([k, v]) => (
                <div key={k} style={{ display: "contents" }}>
                  <dt>{k.replace(/_/g, " ")}</dt>
                  <dd>
                    {typeof v === "number" ? formatNumber(v, 4) : String(v)}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <EmptyState title="No accuracy data" message="prediction_accuracy_daily may be empty." showHealthLink={false} />
          )}
        </div>
      </div>

      {processorState.length ? (
        <div className="card" style={{ marginTop: "1rem" }}>
          <h2>Processor State</h2>
          <dl className="metric-list">
            {processorState.map((row) => (
              <div key={row.key} style={{ display: "contents" }}>
                <dt>{row.key}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </>
  );
}

export default function QualityPage() {
  return (
    <PageShell>
      <PageHeader
        title="Data Quality"
        description="Daily quality rollups and LLM prediction accuracy from the processor schema."
      />
      <QualityContent />
    </PageShell>
  );
}
