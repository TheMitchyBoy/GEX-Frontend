"use client";

import { useCallback, useEffect, useState } from "react";
import { WallDriftChart } from "@/components/WallDriftChart";
import { SnapshotToolbar, useSnapshotFromUrl } from "@/components/SnapshotToolbar";
import { ChartSkeleton } from "@/components/LoadingSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";
import type { WallDriftRow } from "@/lib/types";

function WallDriftContent() {
  const { marketDate } = useSnapshotFromUrl();
  const [rows, setRows] = useState<WallDriftRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (date: string) => {
    if (!date) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/wall-drift?market_date=${date}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setRows(data.drift ?? []);
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
        <h2>Flip &amp; Walls — {marketDate}</h2>
        {loading ? <ChartSkeleton /> : rows.length ? (
          <WallDriftChart rows={rows} />
        ) : (
          <EmptyState />
        )}
      </div>
    </>
  );
}

export default function WallDriftPage() {
  return (
    <PageShell>
      <div className="page-header">
        <h1>Wall Drift</h1>
        <p>Gamma flip, call wall, and put wall migration through the session.</p>
      </div>
      <WallDriftContent />
    </PageShell>
  );
}
