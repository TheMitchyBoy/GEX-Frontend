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
import { filterStrikesNearSpot } from "@/lib/strikes";
import { CHART, chartTooltipStyle } from "@/lib/chart-theme";
import type { StrikeRow } from "@/lib/types";

interface GexProfileChartProps {
  strikes: StrikeRow[];
  spot?: number | null;
  callWall?: number | null;
  putWall?: number | null;
  pctBand?: number;
}

export function GexProfileChart({
  strikes,
  spot,
  callWall,
  putWall,
  pctBand = 0.03,
}: GexProfileChartProps) {
  const windowed = filterStrikesNearSpot(strikes, spot, pctBand);

  if (!windowed.length) {
    return <div className="empty-state">No strike data for this snapshot.</div>;
  }

  const data = windowed.map((s) => ({
    strike: s.strike,
    gex: s.gex_bn_per_pct ?? 0,
    isCallWall: callWall != null && s.strike === callWall,
    isPutWall: putWall != null && s.strike === putWall,
  }));

  return (
    <>
      {strikes.length > windowed.length ? (
        <p className="glossary" style={{ marginBottom: "0.5rem" }}>
          Showing {windowed.length} strikes within ±{(pctBand * 100).toFixed(0)}% of spot
        </p>
      ) : null}
      <div className="chart-wrap tall">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
            <XAxis
              dataKey="strike"
              tick={{ fill: CHART.axis, fontSize: 11 }}
              tickFormatter={(v) => String(Math.round(v))}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: CHART.axis, fontSize: 11 }}
              tickFormatter={(v) => `${Number(v).toFixed(2)}`}
            />
          <Tooltip contentStyle={chartTooltipStyle} formatter={(value: number) => [`${value.toFixed(4)} Bn$/1%`, "GEX"]} labelFormatter={(label) => `Strike ${label}`} />
          {spot != null ? (
            <ReferenceLine x={spot} stroke={CHART.spot} strokeDasharray="4 4" label={{ value: "Spot", fill: CHART.spot, fontSize: 10 }} />
            ) : null}
            <Bar dataKey="gex" radius={[2, 2, 0, 0]}>
              {data.map((entry, index) => {
              let fill: string = entry.gex >= 0 ? CHART.long : CHART.short;
              if (entry.isCallWall) fill = CHART.callWall;
              if (entry.isPutWall) fill = CHART.putWall;
                return <Cell key={`cell-${index}`} fill={fill} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
