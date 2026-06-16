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
  const [strikeSource, setStrikeSource] = useState<"auto" | "atm" | "full">("atm");
  const [strikes, setStrikes] = useState<StrikeRow[]>([]);
  const [spot, setSpot] = useState<number | null>(null);
  const [walls, setWalls] = useState<Walls>({ call_wall: null, put_wall: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (snapshotTs: string, source: "auto" | "atm" | "full") => {
    if (!snapshotTs) return;
    setLoading(true);
    setError(null);
    try {
      const [strikesRes, summaryRes] = await Promise.all([
        fetch(`/api/snapshots/${encodeURIComponent(snapshotTs)}/strikes?source=${source}`),
        fetch(`/api/snapshots/${encodeURIComponent(snapshotTs)}/summary`),
      ]);
      const strikesData = await strikesRes.json();
      const summaryData = await summaryRes.json();
      if (!strikesRes.ok) throw new Error(strikesData.error ?? "Failed to load strikes");
      setStrikes(strikesData.strikes ?? []);
      setWalls(summaryData.walls ?? strikesData.walls ?? { call_wall: null, put_wall: null });
      setSpot(summaryData.spot ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ts) load(ts, strikeSource);
  }, [ts, strikeSource, load]);

  return (
    <>
      <SnapshotToolbar />
      <div className="filter-panel" style={{ marginTop: "0.5rem" }}>
        <div className="select-row">
          <label htmlFor="strike-source">Strike table</label>
          <select
            id="strike-source"
            value={strikeSource}
            onChange={(e) => setStrikeSource(e.target.value as "auto" | "atm" | "full")}
          >
            <option value="atm">snapshot_strikes_atm (±3%)</option>
            <option value="full">snapshot_strikes (±12%)</option>
            <option value="auto">auto</option>
          </select>
        </div>
      </div>
      {error ? <div className="error-banner">{error}</div> : null}
      {ts ? (
        <p className="glossary" style={{ marginBottom: "1rem" }}>
          {formatTsLabel(ts)} ET · Walls from <code>snapshot_features</code>: call{" "}
          {walls.call_wall ?? "—"} · put {walls.put_wall ?? "—"}
        </p>
      ) : null}
      <div className="card">
        <h2>Strike vs GEX (Bn$/1%)</h2>
        {loading ? <ChartSkeleton /> : strikes.length ? (
          <GexProfileChart
            strikes={strikes}
            spot={spot}
            callWall={walls.call_wall}
            putWall={walls.put_wall}
            pctBand={strikeSource === "full" ? 0.12 : 0.03}
          />
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
      <PageHeader
        title="GEX Profile"
        description="ATM or full strike profile; walls from snapshot_features."
      />
      <ProfileContent />
    </PageShell>
  );
}
