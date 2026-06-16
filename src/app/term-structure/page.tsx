"use client";

import { useCallback, useEffect, useState } from "react";
import { SnapshotToolbar, useSnapshotFromUrl } from "@/components/SnapshotToolbar";
import { TermStructureChart } from "@/components/TermStructureChart";
import { ChartSkeleton } from "@/components/LoadingSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";
import { formatTsLabel } from "@/lib/time";

function TermStructureContent() {
  const { ts } = useSnapshotFromUrl();
  const [expiration, setExpiration] = useState<Record<string, number>>({});
  const [spot, setSpot] = useState<number | null>(null);
  const [expectedMove, setExpectedMove] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (snapshotTs: string) => {
    if (!snapshotTs) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/snapshots/${encodeURIComponent(snapshotTs)}/summary`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setExpiration(data.expiration ?? {});
      setSpot(data.spot ?? null);
      const summary = data.summary_json ?? {};
      setExpectedMove(summary.expected_move_pct ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ts) load(ts);
  }, [ts, load]);

  return (
    <>
      <SnapshotToolbar />
      {error ? <div className="error-banner">{error}</div> : null}
      {ts ? <p className="glossary" style={{ marginBottom: "1rem" }}>{formatTsLabel(ts)} ET</p> : null}
      <div className="card">
        <h2>Expiration GEX</h2>
        {loading ? <ChartSkeleton /> : Object.keys(expiration).length ? (
          <TermStructureChart expiration={expiration} spot={spot} expectedMovePct={expectedMove} />
        ) : (
          <EmptyState message="No expiration data for this snapshot." showHealthLink={false} />
        )}
      </div>
    </>
  );
}

export default function TermStructurePage() {
  return (
    <PageShell>
      <div className="page-header">
        <h1>Term Structure</h1>
        <p>GEX by expiration with expected-move band.</p>
      </div>
      <TermStructureContent />
    </PageShell>
  );
}
