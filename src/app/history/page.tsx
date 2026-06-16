"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { SnapshotToolbar, useSnapshotFromUrl } from "@/components/SnapshotToolbar";
import { PageShell } from "@/components/PageShell";
import { EmptyState } from "@/components/EmptyState";
import { buildSnapshotHref } from "@/lib/snapshot-url";
import { formatGex, formatNumber, formatTsLabel } from "@/lib/time";
import type { SnapshotTimelineRow } from "@/lib/types";

function HistoryContent() {
  const { marketDate } = useSnapshotFromUrl();
  const [snapshots, setSnapshots] = useState<SnapshotTimelineRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (date: string) => {
    if (!date) return;
    setError(null);
    try {
      const res = await fetch(`/api/snapshots?market_date=${date}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
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
      <SnapshotToolbar showSnapshot={false} />
      {error ? <div className="error-banner">{error}</div> : null}
      <div className="card">
        <h2>Snapshots — {marketDate || "select date"}</h2>
        <p className="glossary" style={{ marginBottom: "0.75rem" }}>
          Click a row to open GEX profile for that slice.
        </p>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Time (ET)</th>
                <th>Spot</th>
                <th>Total GEX</th>
                <th>Regime</th>
                <th>Gamma Flip</th>
                <th>Quality</th>
                <th>Status</th>
                <th>Links</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map((s) => (
                <tr key={s.ts} className="clickable">
                  <td>{formatTsLabel(s.ts)}</td>
                  <td>{formatNumber(s.spot, 2)}</td>
                  <td>{formatGex(s.total_gex)}</td>
                  <td>{s.regime ?? "—"}</td>
                  <td>{s.gamma_flip ?? "—"}</td>
                  <td>{s.quality_score != null ? formatNumber(s.quality_score * 100, 0) + "%" : "—"}</td>
                  <td>{s.diagnostic_status ?? "—"}</td>
                  <td>
                    <Link href={buildSnapshotHref("/profile", { marketDate, ts: s.ts })} className="text-link">
                      Profile
                    </Link>
                    {" · "}
                    <Link href={buildSnapshotHref("/cumulative", { marketDate, ts: s.ts })} className="text-link">
                      Cumulative
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!snapshots.length ? <EmptyState /> : null}
        </div>
      </div>
    </>
  );
}

export default function HistoryPage() {
  return (
    <PageShell>
      <div className="page-header">
        <h1>History Browser</h1>
        <p>Browse intraday slices with deep links to charts.</p>
      </div>
      <HistoryContent />
    </PageShell>
  );
}
