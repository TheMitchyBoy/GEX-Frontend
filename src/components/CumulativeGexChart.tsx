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
          <CartesianGrid strokeDasharray="3 3" stroke="#243041" />
          <XAxis
            dataKey="strike"
            tick={{ fill: "#8b9bb0", fontSize: 11 }}
            tickFormatter={(v) => String(Math.round(v))}
            interval="preserveStartEnd"
          />
          <YAxis tick={{ fill: "#8b9bb0", fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              background: "#161d27",
              border: "1px solid #243041",
              borderRadius: 8,
            }}
            formatter={(value: number) => [`${value.toFixed(4)} Bn$/1%`, "Cumulative GEX"]}
            labelFormatter={(label) => `Strike ${label}`}
          />
          <ReferenceLine y={0} stroke="#64748b" />
          {gammaFlip != null ? (
            <ReferenceLine
              x={gammaFlip}
              stroke="#06b6d4"
              strokeDasharray="4 4"
              label={{ value: "Gamma flip", fill: "#06b6d4", fontSize: 11 }}
            />
          ) : null}
          {spot != null ? (
            <ReferenceLine x={spot} stroke="#3b82f6" strokeDasharray="4 4" />
          ) : null}
          <Line
            type="monotone"
            dataKey="cumulative"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
