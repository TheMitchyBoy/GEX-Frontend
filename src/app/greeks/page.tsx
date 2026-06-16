"use client";

import { useCallback, useEffect, useState } from "react";
import { GreeksTable } from "@/components/GreeksTable";
import { SnapshotPicker } from "@/components/SnapshotPicker";
import { formatTsLabel } from "@/lib/time";
import type { GreekExposureRow } from "@/lib/types";

export default function GreeksPage() {
  const [ts, setTs] = useState("");
  const [rows, setRows] = useState<GreekExposureRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (snapshotTs: string) => {
    if (!snapshotTs) return;
    setError(null);
    try {
      const res = await fetch(`/api/snapshots/${encodeURIComponent(snapshotTs)}/summary`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setRows(data.greeks ?? []);
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
        <h1>Greeks</h1>
        <p>Per-strike greek exposure from <code>greek_exposure_json</code>.</p>
      </div>

      <SnapshotPicker value={ts} onChange={setTs} />
      {error ? <div className="error-banner">{error}</div> : null}

      {ts ? (
        <p className="glossary" style={{ marginBottom: "1rem" }}>
          {formatTsLabel(ts)} ET
        </p>
      ) : null}

      <div className="card">
        <h2>Greek Exposure</h2>
        <GreeksTable rows={rows} />
      </div>
    </>
  );
}
