"use client";

import { useEffect, useState } from "react";

interface SnapshotPickerProps {
  value: string;
  onChange: (ts: string) => void;
  marketDate?: string;
}

interface TimelineSnapshot {
  ts: string;
}

export function SnapshotPicker({ value, onChange, marketDate }: SnapshotPickerProps) {
  const [options, setOptions] = useState<TimelineSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        if (marketDate) {
          const res = await fetch(`/api/snapshots?market_date=${marketDate}`);
          const data = await res.json();
          if (!cancelled) {
            setOptions(data.snapshots ?? []);
            if (!value && data.snapshots?.length) {
              onChange(data.snapshots[data.snapshots.length - 1].ts);
            }
          }
        } else {
          const datesRes = await fetch("/api/snapshots/dates?limit=1");
          const datesData = await datesRes.json();
          const latestDate = datesData.dates?.[0];
          if (!latestDate) {
            if (!cancelled) setOptions([]);
            return;
          }
          const res = await fetch(`/api/snapshots?market_date=${latestDate}`);
          const data = await res.json();
          if (!cancelled) {
            setOptions(data.snapshots ?? []);
            if (!value && data.snapshots?.length) {
              onChange(data.snapshots[data.snapshots.length - 1].ts);
            }
          }
        }
      } catch {
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [marketDate, onChange, value]);

  return (
    <div className="select-row">
      <label htmlFor="snapshot-ts">Snapshot</label>
      <select
        id="snapshot-ts"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading || options.length === 0}
      >
        {options.map((opt) => (
          <option key={opt.ts} value={opt.ts}>
            {opt.ts}
          </option>
        ))}
      </select>
    </div>
  );
}

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
}

export function DatePicker({ value, onChange }: DatePickerProps) {
  const [dates, setDates] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/snapshots/dates?limit=90")
      .then((r) => r.json())
      .then((data) => {
        const list = data.dates ?? [];
        setDates(list);
        if (!value && list.length) onChange(list[0]);
      })
      .catch(() => setDates([]));
  }, [onChange, value]);

  return (
    <div className="select-row">
      <label htmlFor="market-date">Trading day</label>
      <select
        id="market-date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={dates.length === 0}
      >
        {dates.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
    </div>
  );
}
