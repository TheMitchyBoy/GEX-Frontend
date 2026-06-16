"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatTsShort } from "@/lib/time";
import type { SnapshotTimelineRow } from "@/lib/types";

interface SpotTimelineProps {
  snapshots: SnapshotTimelineRow[];
}

export function SpotTimeline({ snapshots }: SpotTimelineProps) {
  if (!snapshots.length) {
    return <div className="empty-state">No intraday snapshots for this date.</div>;
  }

  const data = snapshots.map((s) => ({
    ts: s.ts,
    label: formatTsShort(s.ts),
    spot: s.spot ?? 0,
    total_gex: s.total_gex ?? 0,
    regime: s.regime,
  }));

  return (
    <div className="chart-wrap tall">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 50, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#243041" />
          <XAxis dataKey="label" tick={{ fill: "#8b9bb0", fontSize: 11 }} />
          <YAxis
            yAxisId="spot"
            tick={{ fill: "#8b9bb0", fontSize: 11 }}
            domain={["auto", "auto"]}
          />
          <YAxis
            yAxisId="gex"
            orientation="right"
            tick={{ fill: "#8b9bb0", fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{
              background: "#161d27",
              border: "1px solid #243041",
              borderRadius: 8,
            }}
            labelFormatter={(_, payload) => {
              const row = payload?.[0]?.payload;
              return row?.ts ? formatTsShort(row.ts) + " ET" : "";
            }}
          />
          <Legend />
          <Line
            yAxisId="spot"
            type="monotone"
            dataKey="spot"
            name="Spot"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
          />
          <Line
            yAxisId="gex"
            type="monotone"
            dataKey="total_gex"
            name="Total GEX (Bn$/1%)"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface MultiDayChartProps {
  snapshots: Array<{
    ts: string;
    spot: number | null;
    total_gex: number | null;
  }>;
}

export function MultiDayChart({ snapshots }: MultiDayChartProps) {
  if (!snapshots.length) {
    return <div className="empty-state">No history data.</div>;
  }

  const data = snapshots.map((s) => ({
    ts: s.ts,
    label: formatTsShort(s.ts),
    spot: s.spot ?? 0,
    total_gex: s.total_gex ?? 0,
  }));

  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 50, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#243041" />
          <XAxis dataKey="label" tick={{ fill: "#8b9bb0", fontSize: 10 }} hide />
          <YAxis yAxisId="spot" tick={{ fill: "#8b9bb0", fontSize: 11 }} />
          <YAxis yAxisId="gex" orientation="right" tick={{ fill: "#8b9bb0", fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              background: "#161d27",
              border: "1px solid #243041",
              borderRadius: 8,
            }}
          />
          <Legend />
          <Line yAxisId="spot" type="monotone" dataKey="spot" name="Spot" stroke="#3b82f6" dot={false} />
          <Line yAxisId="gex" type="monotone" dataKey="total_gex" name="GEX" stroke="#f59e0b" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
