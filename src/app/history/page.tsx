"use client";

import { useCallback, useEffect, useState } from "react";
import { DatePicker } from "@/components/SnapshotPicker";
import { formatGex, formatNumber, formatTsLabel } from "@/lib/time";
import type { SnapshotTimelineRow } from "@/lib/types";

export default function HistoryPage() {
  const [marketDate, setMarketDate] = useState("");
  const [snapshots, setSnapshots] = useState<SnapshotTimelineRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (date: string) => {
    if (!date) return;
    setError(null);
    try {
      const res = await fetch(`/api/snapshots?market_date=${date}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
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
        <h1>History Browser</h1>
        <p>Browse intraday snapshot slices by trading day.</p>
      </div>

      <DatePicker value={marketDate} onChange={setMarketDate} />
      {error ? <div className="error-banner">{error}</div> : null}

      <div className="card">
        <h2>Snapshots — {marketDate || "select date"}</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Time (ET)</th>
                <th>Spot</th>
                <th>Total GEX</th>
                <th>Regime</th>
                <th>Gamma Flip</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map((s) => (
                <tr key={s.ts}>
                  <td>{formatTsLabel(s.ts)}</td>
                  <td>{formatNumber(s.spot, 2)}</td>
                  <td>{formatGex(s.total_gex)}</td>
                  <td>{s.regime ?? "—"}</td>
                  <td>{s.gamma_flip ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!snapshots.length ? (
            <div className="empty-state">No snapshots for this date.</div>
          ) : null}
        </div>
      </div>
    </>
  );
}
