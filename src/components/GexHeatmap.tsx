"use client";

import { useMemo } from "react";
import { formatTsShort } from "@/lib/time";
import type { HeatmapCell } from "@/lib/types";

interface GexHeatmapProps {
  cells: HeatmapCell[];
}

export function GexHeatmap({ cells }: GexHeatmapProps) {
  const { times, strikes, matrix, maxAbs } = useMemo(() => {
    const timeSet = new Set<string>();
    const strikeSet = new Set<number>();
    for (const c of cells) {
      timeSet.add(c.ts);
      strikeSet.add(c.strike);
    }
    const times = Array.from(timeSet).sort();
    const strikes = Array.from(strikeSet).sort((a, b) => a - b);
    const lookup = new Map<string, number>();
    let maxAbs = 0.001;
    for (const c of cells) {
      const v = c.gex_bn_per_pct ?? 0;
      lookup.set(`${c.ts}|${c.strike}`, v);
      maxAbs = Math.max(maxAbs, Math.abs(v));
    }
    const matrix = times.map((ts) =>
      strikes.map((strike) => lookup.get(`${ts}|${strike}`) ?? 0),
    );
    return { times, strikes, matrix, maxAbs };
  }, [cells]);

  if (!cells.length) {
    return <div className="empty-state">No heatmap data for this date.</div>;
  }

  function cellColor(value: number): string {
    const t = Math.min(1, Math.abs(value) / maxAbs);
    if (value >= 0) return `rgba(34, 197, 94, ${0.15 + t * 0.85})`;
    return `rgba(239, 68, 68, ${0.15 + t * 0.85})`;
  }

  return (
    <div className="heatmap-wrap">
      <div className="heatmap-scroll">
        <table className="heatmap-table">
          <thead>
            <tr>
              <th>Time ET</th>
              {strikes.map((s) => (
                <th key={s}>{Math.round(s)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {times.map((ts, ri) => (
              <tr key={ts}>
                <td className="heatmap-time">{formatTsShort(ts)}</td>
                {matrix[ri].map((val, ci) => (
                  <td
                    key={`${ts}-${strikes[ci]}`}
                    className="heatmap-cell"
                    style={{ background: cellColor(val) }}
                    title={`${formatTsShort(ts)} · ${strikes[ci]} · ${val.toFixed(4)} Bn$/1%`}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
