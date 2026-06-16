"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface TermStructureChartProps {
  expiration: Record<string, number>;
}

export function TermStructureChart({ expiration }: TermStructureChartProps) {
  const entries = Object.entries(expiration ?? {}).sort(([a], [b]) => a.localeCompare(b));

  if (!entries.length) {
    return <div className="empty-state">No expiration term structure for this snapshot.</div>;
  }

  const data = entries.map(([date, gex]) => ({ date, gex }));

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
          <Bar dataKey="gex" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
