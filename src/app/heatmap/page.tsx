"use client";

import { useCallback, useEffect, useState } from "react";
import { GexHeatmap } from "@/components/GexHeatmap";
import { SnapshotToolbar, useSnapshotFromUrl } from "@/components/SnapshotToolbar";
import { ChartSkeleton } from "@/components/LoadingSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";
import type { HeatmapCell } from "@/lib/types";

function HeatmapContent() {
  const { marketDate } = useSnapshotFromUrl();
  const [cells, setCells] = useState<HeatmapCell[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (date: string) => {
    if (!date) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/heatmap?market_date=${date}&pct_band=0.03`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setCells(data.cells ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
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
        <h2>GEX Heatmap — {marketDate}</h2>
        <p className="glossary" style={{ marginBottom: "0.75rem" }}>
          Strike × time ladder (±3% of spot). Green = positive GEX, red = negative.
        </p>
        {loading ? <ChartSkeleton /> : cells.length ? (
          <GexHeatmap cells={cells} />
        ) : (
          <EmptyState />
        )}
      </div>
    </>
  );
}

export default function HeatmapPage() {
  return (
    <PageShell>
      <div className="page-header">
        <h1>GEX Heatmap</h1>
        <p>Intraday strike ladder colored by gamma exposure.</p>
      </div>
      <HeatmapContent />
    </PageShell>
  );
}
