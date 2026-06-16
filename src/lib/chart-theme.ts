export const CHART = {
  grid: "#1e2a3a",
  axis: "#6b7c93",
  tooltipBg: "#111820",
  tooltipBorder: "#2a3a4f",
  spot: "#60a5fa",
  gex: "#fbbf24",
  long: "#4ade80",
  short: "#f87171",
  flip: "#22d3ee",
  callWall: "#fbbf24",
  putWall: "#c084fc",
  accent: "#3b82f6",
} as const;

export const chartTooltipStyle = {
  background: CHART.tooltipBg,
  border: `1px solid ${CHART.tooltipBorder}`,
  borderRadius: 10,
  boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
  fontSize: 12,
};
