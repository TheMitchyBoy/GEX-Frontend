"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART, chartTooltipStyle } from "@/lib/chart-theme";
import { formatTsShort } from "@/lib/time";
import type { SnapshotTimelineRow } from "@/lib/types";

interface SpotTimelineProps {
  snapshots: SnapshotTimelineRow[];
  showRegimeBands?: boolean;
}

function regimeColor(regime: string | null | undefined): string {
  if (!regime) return "transparent";
  return regime.toLowerCase().includes("long") ? CHART.long + "14" : CHART.short + "14";
}

export function SpotTimeline({ snapshots, showRegimeBands = true }: SpotTimelineProps) {
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

  const regimeBands: Array<{ x1: string; x2: string; fill: string }> = [];
  if (showRegimeBands) {
    for (let i = 0; i < data.length; i++) {
      const next = data[i + 1];
      regimeBands.push({
        x1: data[i].label,
        x2: next?.label ?? data[i].label,
        fill: regimeColor(data[i].regime),
      });
    }
  }

  return (
    <div className="chart-wrap tall">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 50, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
          {regimeBands.map((band, i) => (
            <ReferenceArea key={i} x1={band.x1} x2={band.x2} fill={band.fill} strokeOpacity={0} />
          ))}
          <XAxis dataKey="label" tick={{ fill: CHART.axis, fontSize: 11 }} />
          <YAxis yAxisId="spot" tick={{ fill: CHART.axis, fontSize: 11 }} domain={["auto", "auto"]} />
          <YAxis yAxisId="gex" orientation="right" tick={{ fill: CHART.axis, fontSize: 11 }} />
          <Tooltip
            contentStyle={chartTooltipStyle}
            labelFormatter={(_, payload) => {
              const row = payload?.[0]?.payload;
              const regime = row?.regime ? ` · ${row.regime}` : "";
              return row?.ts ? `${formatTsShort(row.ts)} ET${regime}` : "";
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          <Line yAxisId="spot" type="monotone" dataKey="spot" name="Spot" stroke={CHART.spot} strokeWidth={2} dot={false} />
          <Line yAxisId="gex" type="monotone" dataKey="total_gex" name="GEX (Bn$/1%)" stroke={CHART.gex} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface MultiDayChartProps {
  snapshots: Array<{ ts: string; spot: number | null; total_gex: number | null }>;
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
          <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="label" tick={{ fill: CHART.axis, fontSize: 10 }} hide />
          <YAxis yAxisId="spot" tick={{ fill: CHART.axis, fontSize: 11 }} />
          <YAxis yAxisId="gex" orientation="right" tick={{ fill: CHART.axis, fontSize: 11 }} />
          <Tooltip contentStyle={chartTooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line yAxisId="spot" type="monotone" dataKey="spot" name="Spot" stroke={CHART.spot} dot={false} strokeWidth={2} />
          <Line yAxisId="gex" type="monotone" dataKey="total_gex" name="GEX" stroke={CHART.gex} dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
