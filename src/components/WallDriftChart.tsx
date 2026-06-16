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
import type { WallDriftRow } from "@/lib/types";

interface WallDriftChartProps {
  rows: WallDriftRow[];
}

export function WallDriftChart({ rows }: WallDriftChartProps) {
  if (!rows.length) {
    return <div className="empty-state">No wall drift data for this date.</div>;
  }

  const data = rows.map((r) => ({
    label: formatTsShort(r.ts),
    ts: r.ts,
    spot: r.spot ?? 0,
    gamma_flip: r.gamma_flip ?? null,
    call_wall: r.call_wall ?? null,
    put_wall: r.put_wall ?? null,
  }));

  return (
    <div className="chart-wrap tall">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#243041" />
          <XAxis dataKey="label" tick={{ fill: "#8b9bb0", fontSize: 11 }} />
          <YAxis tick={{ fill: "#8b9bb0", fontSize: 11 }} domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{
              background: "#161d27",
              border: "1px solid #243041",
              borderRadius: 8,
            }}
          />
          <Legend />
          <Line type="monotone" dataKey="spot" name="Spot" stroke="#3b82f6" dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="gamma_flip" name="Gamma flip" stroke="#06b6d4" dot={false} strokeWidth={2} connectNulls />
          <Line type="monotone" dataKey="call_wall" name="Call wall" stroke="#f59e0b" dot={false} strokeWidth={2} connectNulls />
          <Line type="monotone" dataKey="put_wall" name="Put wall" stroke="#a855f7" dot={false} strokeWidth={2} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
