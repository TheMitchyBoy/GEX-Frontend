"use client";

import { useCallback, useEffect, useState } from "react";
import { DatePicker } from "@/components/SnapshotPicker";
import { SpotTimeline } from "@/components/SpotTimeline";
import type { SnapshotTimelineRow } from "@/lib/types";

export default function TimelinePage() {
  const [marketDate, setMarketDate] = useState("");
  const [snapshots, setSnapshots] = useState<SnapshotTimelineRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (date: string) => {
    if (!date) return;
    setError(null);
    try {
      const res = await fetch(`/api/snapshots?market_date=${date}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load timeline");
      setSnapshots(data.snapshots ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    }
  }, []);

  useEffect(() => {
    if (marketDate) load(marketDate);
  }, [marketDate, load]);

  return (
    <>
      <div className="page-header">
        <h1>Intraday Timeline</h1>
        <p>Spot and total GEX across snapshots for one trading day (America/New_York).</p>
      </div>

      <DatePicker value={marketDate} onChange={setMarketDate} />
      {error ? <div className="error-banner">{error}</div> : null}

      <div className="card">
        <h2>{marketDate || "Select date"} — Spot &amp; GEX</h2>
        <SpotTimeline snapshots={snapshots} />
      </div>
    </>
  );
}
