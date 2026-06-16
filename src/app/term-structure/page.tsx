"use client";

import { useCallback, useEffect, useState } from "react";
import { SnapshotPicker } from "@/components/SnapshotPicker";
import { TermStructureChart } from "@/components/TermStructureChart";
import { formatTsLabel } from "@/lib/time";

export default function TermStructurePage() {
  const [ts, setTs] = useState("");
  const [expiration, setExpiration] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (snapshotTs: string) => {
    if (!snapshotTs) return;
    setError(null);
    try {
      const res = await fetch(`/api/snapshots/${encodeURIComponent(snapshotTs)}/summary`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setExpiration(data.expiration ?? {});
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
        <h1>Term Structure</h1>
        <p>GEX by expiration from <code>expiration_json</code>.</p>
      </div>

      <SnapshotPicker value={ts} onChange={setTs} />
      {error ? <div className="error-banner">{error}</div> : null}

      {ts ? (
        <p className="glossary" style={{ marginBottom: "1rem" }}>
          {formatTsLabel(ts)} ET
        </p>
      ) : null}

      <div className="card">
        <h2>Expiration GEX</h2>
        <TermStructureChart expiration={expiration} />
      </div>
    </>
  );
}
