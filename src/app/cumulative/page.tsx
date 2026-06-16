"use client";

import { useCallback, useEffect, useState } from "react";
import { CumulativeGexChart } from "@/components/CumulativeGexChart";
import { SnapshotToolbar, useSnapshotFromUrl } from "@/components/SnapshotToolbar";
import { ChartSkeleton } from "@/components/LoadingSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";
import { PageHeader } from "@/components/PageHeader";
import { formatTsLabel } from "@/lib/time";
import type { StrikeRow } from "@/lib/types";

function CumulativeContent() {
  const { ts } = useSnapshotFromUrl();
  const [strikes, setStrikes] = useState<StrikeRow[]>([]);
  const [gammaFlip, setGammaFlip] = useState<number | null>(null);
  const [flipConfidence, setFlipConfidence] = useState<string | null>(null);
  const [spot, setSpot] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (snapshotTs: string) => {
    if (!snapshotTs) return;
    setLoading(true);
    setError(null);
    try {
      const [strikesRes, summaryRes] = await Promise.all([
        fetch(`/api/snapshots/${encodeURIComponent(snapshotTs)}/strikes?source=full`),
        fetch(`/api/snapshots/${encodeURIComponent(snapshotTs)}/summary`),
      ]);
      const strikesData = await strikesRes.json();
      const summaryData = await summaryRes.json();
      if (!strikesRes.ok) throw new Error(strikesData.error ?? "Failed");
      setStrikes(strikesData.strikes ?? []);
      setGammaFlip(summaryData.gamma_flip ?? null);
      setFlipConfidence(summaryData.features?.flip_confidence ?? null);
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
          {formatTsLabel(ts)} ET · Flip {gammaFlip ?? "—"}
          {flipConfidence ? ` (${flipConfidence})` : ""} · Spot {spot ?? "—"} ·{" "}
          <code>snapshot_strikes</code> ±12%
        </p>
      ) : null}
      <div className="card">
        <h2>Cumulative GEX Curve</h2>
        {loading ? <ChartSkeleton /> : strikes.length ? (
          <CumulativeGexChart strikes={strikes} gammaFlip={gammaFlip} spot={spot} />
        ) : (
          <EmptyState message="Select a snapshot to view cumulative GEX." showHealthLink={false} />
        )}
      </div>
    </>
  );
}

export default function CumulativePage() {
  return (
    <PageShell>
      <PageHeader
        title="Cumulative GEX"
        description="Full strike range from snapshot_strikes (±12%) with flip from snapshot_features."
      />
      <CumulativeContent />
    </PageShell>
  );
}
