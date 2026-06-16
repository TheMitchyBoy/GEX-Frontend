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
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#243041" />
          <XAxis dataKey="date" tick={{ fill: "#8b9bb0", fontSize: 11 }} />
          <YAxis tick={{ fill: "#8b9bb0", fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              background: "#161d27",
              border: "1px solid #243041",
              borderRadius: 8,
            }}
            formatter={(value: number) => [`${value.toFixed(4)} Bn$/1%`, "GEX"]}
          />
          {spot != null ? (
            <ReferenceLine y={0} stroke="#64748b" />
          ) : null}
          <Bar dataKey="gex" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.gex >= 0 ? "#22c55e" : "#ef4444"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {spot != null && emLow != null && emHigh != null ? (
        <p className="glossary" style={{ marginTop: "0.5rem" }}>
          Spot {spot.toFixed(2)} · Expected move band {emLow.toFixed(0)} – {emHigh.toFixed(0)}
        </p>
      ) : null}
    </div>
  );
}
