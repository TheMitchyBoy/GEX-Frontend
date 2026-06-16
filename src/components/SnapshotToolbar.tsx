"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { formatTsLabel } from "@/lib/time";
import { readSnapshotParams } from "@/lib/snapshot-url";

interface SnapshotToolbarProps {
  showDate?: boolean;
  showSnapshot?: boolean;
}

export function SnapshotToolbar({
  showDate = true,
  showSnapshot = true,
}: SnapshotToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { marketDate, ts } = readSnapshotParams(searchParams);

  const [dates, setDates] = useState<string[]>([]);
  const [snapshots, setSnapshots] = useState<Array<{ ts: string }>>([]);

  const updateParams = useCallback(
    (next: { marketDate?: string; ts?: string }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.marketDate !== undefined) {
        if (next.marketDate) params.set("market_date", next.marketDate);
        else params.delete("market_date");
      }
      if (next.ts !== undefined) {
        if (next.ts) params.set("ts", next.ts);
        else params.delete("ts");
      }
      const q = params.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    fetch("/api/snapshots/dates?limit=90")
      .then((r) => r.json())
      .then((data) => {
        const list: string[] = data.dates ?? [];
        setDates(list);
        if (!marketDate && list[0]) {
          updateParams({ marketDate: list[0] });
        }
      })
      .catch(() => setDates([]));
  }, [marketDate, updateParams]);

  useEffect(() => {
    if (!marketDate) {
      setSnapshots([]);
      return;
    }
    fetch(`/api/snapshots?market_date=${marketDate}`)
      .then((r) => r.json())
      .then((data) => {
        const list = data.snapshots ?? [];
        setSnapshots(list);
        if (!ts && list.length) {
          updateParams({ ts: list[list.length - 1].ts });
        }
      })
      .catch(() => setSnapshots([]));
  }, [marketDate, ts, updateParams]);

  return (
    <div className="snapshot-toolbar">
      {showDate ? (
        <div className="select-row">
          <label htmlFor="toolbar-date">Trading day</label>
          <select
            id="toolbar-date"
            value={marketDate}
            onChange={(e) => updateParams({ marketDate: e.target.value, ts: "" })}
          >
            {dates.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {showSnapshot ? (
        <div className="select-row">
          <label htmlFor="toolbar-ts">Snapshot (ET)</label>
          <select
            id="toolbar-ts"
            value={ts}
            onChange={(e) => updateParams({ ts: e.target.value })}
            disabled={!snapshots.length}
          >
            {snapshots.map((s) => (
              <option key={s.ts} value={s.ts}>
                {formatTsLabel(s.ts)} ET
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}

export function useSnapshotFromUrl() {
  const searchParams = useSearchParams();
  return readSnapshotParams(searchParams);
}
