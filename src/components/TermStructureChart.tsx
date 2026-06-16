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
import { CHART, chartTooltipStyle } from "@/lib/chart-theme";

interface TermStructureChartProps {
  expiration: Record<string, number>;
  spot?: number | null;
  expectedMovePct?: number | null;
}

export function TermStructureChart({
  expiration,
  spot,
  expectedMovePct,
}: TermStructureChartProps) {
  const entries = Object.entries(expiration ?? {}).sort(([a], [b]) => a.localeCompare(b));

  if (!entries.length) {
    return <div className="empty-state">No expiration term structure for this snapshot.</div>;
  }

  const data = entries.map(([date, gex]) => ({ date, gex }));
  const emHigh = spot && expectedMovePct ? spot * (1 + expectedMovePct) : null;
  const emLow = spot && expectedMovePct ? spot * (1 - expectedMovePct) : null;

  return (
    <>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="date" tick={{ fill: CHART.axis, fontSize: 11 }} />
            <YAxis tick={{ fill: CHART.axis, fontSize: 11 }} />
            <Tooltip
              contentStyle={chartTooltipStyle}
              formatter={(value: number) => [`${value.toFixed(4)} Bn$/1%`, "GEX"]}
            />
            <ReferenceLine y={0} stroke={CHART.axis} strokeOpacity={0.5} />
            <Bar dataKey="gex" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.gex >= 0 ? CHART.long : CHART.short} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {spot != null && emLow != null && emHigh != null ? (
        <p className="glossary" style={{ marginTop: "0.75rem" }}>
          Spot <span style={{ fontFamily: "var(--font-mono)" }}>{spot.toFixed(2)}</span>
          {" · "}Expected move band{" "}
          <span style={{ fontFamily: "var(--font-mono)" }}>
            {emLow.toFixed(0)} – {emHigh.toFixed(0)}
          </span>
        </p>
      ) : null}
    </>
  );
}
