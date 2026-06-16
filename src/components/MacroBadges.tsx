import type { SummaryJson } from "@/lib/types";

export function MacroBadges({ summary }: { summary: SummaryJson }) {
  const badges: string[] = [];
  if (summary.is_fomc_week) badges.push("FOMC week");
  if (summary.is_cpi_day) badges.push("CPI day");
  if (summary.is_nfp_day) badges.push("NFP day");

  if (!badges.length) return null;

  return (
    <div className="macro-badges">
      {badges.map((b) => (
        <span key={b} className="badge macro">
          {b}
        </span>
      ))}
      {summary.event_risk_score != null ? (
        <span className="badge macro">
          Event risk {Number(summary.event_risk_score).toFixed(2)}
        </span>
      ) : null}
    </div>
  );
}
