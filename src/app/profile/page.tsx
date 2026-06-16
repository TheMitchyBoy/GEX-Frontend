"use client";

import { useCallback, useEffect, useState } from "react";
import { GexProfileChart } from "@/components/GexProfileChart";
import { SnapshotToolbar, useSnapshotFromUrl } from "@/components/SnapshotToolbar";
import { ChartSkeleton } from "@/components/LoadingSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { PageShell } from "@/components/PageShell";
import { formatTsLabel } from "@/lib/time";
import type { StrikeRow, Walls } from "@/lib/types";

function ProfileContent() {
  const { ts } = useSnapshotFromUrl();
  const [strikes, setStrikes] = useState<StrikeRow[]>([]);
  const [spot, setSpot] = useState<number | null>(null);
  const [walls, setWalls] = useState<Walls>({ call_wall: null, put_wall: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (snapshotTs: string) => {
    if (!snapshotTs) return;
    setLoading(true);
    setError(null);
    try {
      const [strikesRes, summaryRes] = await Promise.all([
        fetch(`/api/snapshots/${encodeURIComponent(snapshotTs)}/strikes`),
        fetch(`/api/snapshots/${encodeURIComponent(snapshotTs)}/summary`),
      ]);
      const strikesData = await strikesRes.json();
      const summaryData = await summaryRes.json();
      if (!strikesRes.ok) throw new Error(strikesData.error ?? "Failed to load");
      setStrikes(strikesData.strikes ?? []);
      setWalls(strikesData.walls ?? { call_wall: null, put_wall: null });
      setSpot(summaryData.spot ?? null);
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
      {ts ? (
        <p className="glossary" style={{ marginBottom: "1rem" }}>
          {formatTsLabel(ts)} ET · Call wall {walls.call_wall ?? "—"} · Put wall {walls.put_wall ?? "—"}
        </p>
      ) : null}
      <div className="card">
        <h2>Strike vs GEX (Bn$/1%)</h2>
        {loading ? <ChartSkeleton /> : strikes.length ? (
          <GexProfileChart strikes={strikes} spot={spot} callWall={walls.call_wall} putWall={walls.put_wall} />
        ) : (
          <EmptyState message="Select a snapshot to view the GEX profile." showHealthLink={false} />
        )}
      </div>
    </>
  );
}

export default function ProfilePage() {
  return (
    <PageShell>
      <PageHeader title="GEX Profile" description="Per-strike gamma exposure with call/put walls (±3% of spot)." />
      <ProfileContent />
    </PageShell>
  );
}
