"use client";

import { useCallback, useEffect, useState } from "react";
import { GreeksTable } from "@/components/GreeksTable";
import { SnapshotToolbar, useSnapshotFromUrl } from "@/components/SnapshotToolbar";
import { ChartSkeleton } from "@/components/LoadingSkeleton";
import { PageShell } from "@/components/PageShell";
import { formatTsLabel } from "@/lib/time";

const PAGE_SIZE = 100;

function GreeksContent() {
  const { ts } = useSnapshotFromUrl();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (snapshotTs: string, pageOffset: number) => {
    if (!snapshotTs) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/snapshots/${encodeURIComponent(snapshotTs)}/summary?greeks_only=1&limit=${PAGE_SIZE}&offset=${pageOffset}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setRows(data.rows ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ts) {
      setOffset(0);
      load(ts, 0);
    }
  }, [ts, load]);

  const onPageChange = (nextOffset: number) => {
    setOffset(nextOffset);
    if (ts) load(ts, nextOffset);
  };

  return (
    <>
      <SnapshotToolbar />
      {error ? <div className="error-banner">{error}</div> : null}
      {ts ? <p className="glossary" style={{ marginBottom: "1rem" }}>{formatTsLabel(ts)} ET</p> : null}
      <div className="card">
        <h2>Greek Exposure</h2>
        {loading ? <ChartSkeleton /> : (
          <GreeksTable
            rows={rows}
            total={total}
            limit={PAGE_SIZE}
            offset={offset}
            onPageChange={onPageChange}
          />
        )}
      </div>
    </>
  );
}

export default function GreeksPage() {
  return (
    <PageShell>
      <div className="page-header">
        <h1>Greeks</h1>
        <p>Paginated greek exposure from <code>greek_exposure_json</code>.</p>
      </div>
      <GreeksContent />
    </PageShell>
  );
}
