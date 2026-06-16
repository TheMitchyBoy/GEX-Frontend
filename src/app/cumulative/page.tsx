"use client";

import { useCallback, useEffect, useState } from "react";
import { CumulativeGexChart } from "@/components/CumulativeGexChart";
import { SnapshotPicker } from "@/components/SnapshotPicker";
import { formatTsLabel } from "@/lib/time";
import type { StrikeRow } from "@/lib/types";

export default function CumulativePage() {
  const [ts, setTs] = useState("");
  const [strikes, setStrikes] = useState<StrikeRow[]>([]);
  const [gammaFlip, setGammaFlip] = useState<number | null>(null);
  const [spot, setSpot] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (snapshotTs: string) => {
    if (!snapshotTs) return;
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
      setGammaFlip(summaryData.gamma_flip ?? null);
      setSpot(summaryData.spot ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    }
  }, []);

  useEffect(() => {
    if (ts) load(ts);
  }, [ts, load]);

  return (
    <>
      <div className="page-header">
        <h1>Cumulative GEX</h1>
        <p>Cumulative gamma by strike with gamma flip marker.</p>
      </div>

      <SnapshotPicker value={ts} onChange={setTs} />
      {error ? <div className="error-banner">{error}</div> : null}

      {ts ? (
        <p className="glossary" style={{ marginBottom: "1rem" }}>
          {formatTsLabel(ts)} ET · Gamma flip {gammaFlip ?? "—"} · Spot {spot ?? "—"}
        </p>
      ) : null}

      <div className="card">
        <h2>Cumulative GEX Curve</h2>
        <CumulativeGexChart strikes={strikes} gammaFlip={gammaFlip} spot={spot} />
      </div>
    </>
  );
}
