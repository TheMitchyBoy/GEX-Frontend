"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART, chartTooltipStyle } from "@/lib/chart-theme";
import { filterStrikesNearSpot } from "@/lib/strikes";
import type { StrikeRow } from "@/lib/types";

interface CumulativeGexChartProps {
  strikes: StrikeRow[];
  gammaFlip?: number | null;
  spot?: number | null;
}

export function CumulativeGexChart({
  strikes,
  gammaFlip,
  spot,
}: CumulativeGexChartProps) {
  if (!strikes.length) {
    return <div className="empty-state">No cumulative GEX data.</div>;
  }

  const windowed = filterStrikesNearSpot(strikes, spot, 0.05);
  const data = windowed.map((s) => ({
    strike: s.strike,
    cumulative: s.cumulative_gex_bn_per_pct ?? 0,
  }));

  return (
    <div className="chart-wrap tall">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
          <XAxis
            dataKey="strike"
            tick={{ fill: CHART.axis, fontSize: 11 }}
            tickFormatter={(v) => String(Math.round(v))}
            interval="preserveStartEnd"
          />
          <YAxis tick={{ fill: CHART.axis, fontSize: 11 }} />
          <Tooltip
            contentStyle={chartTooltipStyle}
            formatter={(value: number) => [`${value.toFixed(4)} Bn$/1%`, "Cumulative GEX"]}
            labelFormatter={(label) => `Strike ${label}`}
          />
          <ReferenceLine y={0} stroke={CHART.axis} strokeOpacity={0.5} />
          {gammaFlip != null ? (
            <ReferenceLine
              x={gammaFlip}
              stroke={CHART.flip}
              strokeDasharray="4 4"
              label={{ value: "Flip", fill: CHART.flip, fontSize: 10 }}
            />
          ) : null}
          {spot != null ? (
            <ReferenceLine x={spot} stroke={CHART.spot} strokeDasharray="4 4" />
          ) : null}
          <Line type="monotone" dataKey="cumulative" stroke={CHART.accent} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
