"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { StrikeRow } from "@/lib/types";

interface GexProfileChartProps {
  strikes: StrikeRow[];
  spot?: number | null;
  callWall?: number | null;
  putWall?: number | null;
}

export function GexProfileChart({
  strikes,
  spot,
  callWall,
  putWall,
}: GexProfileChartProps) {
  if (!strikes.length) {
    return <div className="empty-state">No strike data for this snapshot.</div>;
  }

  const data = strikes.map((s) => ({
    strike: s.strike,
    gex: s.gex_bn_per_pct ?? 0,
    isCallWall: callWall != null && s.strike === callWall,
    isPutWall: putWall != null && s.strike === putWall,
  }));

  return (
    <div className="chart-wrap tall">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#243041" />
          <XAxis
            dataKey="strike"
            tick={{ fill: "#8b9bb0", fontSize: 11 }}
            tickFormatter={(v) => String(Math.round(v))}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "#8b9bb0", fontSize: 11 }}
            tickFormatter={(v) => `${Number(v).toFixed(2)}`}
          />
          <Tooltip
            contentStyle={{
              background: "#161d27",
              border: "1px solid #243041",
              borderRadius: 8,
            }}
            formatter={(value: number) => [`${value.toFixed(4)} Bn$/1%`, "GEX"]}
            labelFormatter={(label) => `Strike ${label}`}
          />
          {spot != null ? (
            <ReferenceLine x={spot} stroke="#3b82f6" strokeDasharray="4 4" label="Spot" />
          ) : null}
          <Bar dataKey="gex" radius={[2, 2, 0, 0]}>
            {data.map((entry, index) => {
              let fill = entry.gex >= 0 ? "#22c55e" : "#ef4444";
              if (entry.isCallWall) fill = "#f59e0b";
              if (entry.isPutWall) fill = "#a855f7";
              return <Cell key={`cell-${index}`} fill={fill} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
