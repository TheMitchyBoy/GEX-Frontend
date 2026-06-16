"use client";

import { useCallback, useEffect, useState } from "react";
import { GexProfileChart } from "@/components/GexProfileChart";
import { SnapshotPicker } from "@/components/SnapshotPicker";
import { formatTsLabel } from "@/lib/time";
import type { StrikeRow, Walls } from "@/lib/types";

export default function ProfilePage() {
  const [ts, setTs] = useState("");
  const [strikes, setStrikes] = useState<StrikeRow[]>([]);
  const [spot, setSpot] = useState<number | null>(null);
  const [walls, setWalls] = useState<Walls>({ call_wall: null, put_wall: null });
  const [error, setError] = useState<string | null>(null);

  const loadStrikes = useCallback(async (snapshotTs: string) => {
    if (!snapshotTs) return;
    setError(null);
    try {
      const [strikesRes, summaryRes] = await Promise.all([
        fetch(`/api/snapshots/${encodeURIComponent(snapshotTs)}/strikes`),
        fetch(`/api/snapshots/${encodeURIComponent(snapshotTs)}/summary`),
      ]);
      const strikesData = await strikesRes.json();
      const summaryData = await summaryRes.json();
      if (!strikesRes.ok) throw new Error(strikesData.error ?? "Failed to load strikes");
      setStrikes(strikesData.strikes ?? []);
      setWalls(strikesData.walls ?? { call_wall: null, put_wall: null });
      setSpot(summaryData.spot ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    }
  }, []);

  useEffect(() => {
    if (ts) loadStrikes(ts);
  }, [ts, loadStrikes]);

  return (
    <>
      <div className="page-header">
        <h1>GEX Profile</h1>
        <p>Per-strike gamma exposure bar chart with call/put walls.</p>
      </div>

      <SnapshotPicker value={ts} onChange={setTs} />

      {error ? <div className="error-banner">{error}</div> : null}

      {ts ? (
        <p className="glossary" style={{ marginBottom: "1rem" }}>
          {formatTsLabel(ts)} ET · Call wall {walls.call_wall ?? "—"} · Put wall{" "}
          {walls.put_wall ?? "—"}
        </p>
      ) : null}

      <div className="card">
        <h2>Strike vs GEX (Bn$/1%)</h2>
        <GexProfileChart
          strikes={strikes}
          spot={spot}
          callWall={walls.call_wall}
          putWall={walls.put_wall}
        />
      </div>
    </>
  );
}
