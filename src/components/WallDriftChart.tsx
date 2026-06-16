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
import { CHART, chartTooltipStyle } from "@/lib/chart-theme";
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
          <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="label" tick={{ fill: CHART.axis, fontSize: 11 }} />
          <YAxis tick={{ fill: CHART.axis, fontSize: 11 }} domain={["auto", "auto"]} />
          <Tooltip contentStyle={chartTooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="spot" name="Spot" stroke={CHART.spot} dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="gamma_flip" name="Gamma flip" stroke={CHART.flip} dot={false} strokeWidth={2} connectNulls />
          <Line type="monotone" dataKey="call_wall" name="Call wall" stroke={CHART.callWall} dot={false} strokeWidth={2} connectNulls />
          <Line type="monotone" dataKey="put_wall" name="Put wall" stroke={CHART.putWall} dot={false} strokeWidth={2} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
