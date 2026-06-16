import { formatGex, formatNumber, regimeClass } from "@/lib/time";

type StatAccent =
  | "spot"
  | "gex"
  | "regime"
  | "flip"
  | "call"
  | "put"
  | "vix"
  | "iv"
  | "default";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  regime?: string | null;
  tooltip?: string;
  accent?: StatAccent;
  icon?: string;
}

export function StatCard({
  label,
  value,
  sub,
  regime,
  tooltip,
  accent = "default",
  icon,
}: StatCardProps) {
  const regimeCls = regime ? `regime-${regimeClass(regime)}` : "";

  return (
    <div
      className={`stat-card accent-${accent}`}
      title={tooltip}
      data-tooltip={tooltip}
    >
      <div className="stat-card-top">
        <span className="stat-label">{label}</span>
        {icon ? <span className="stat-icon" aria-hidden>{icon}</span> : null}
      </div>
      <div className={`stat-value ${regimeCls}`}>{value}</div>
      {sub ? <div className="stat-sub">{sub}</div> : null}
    </div>
  );
}

export function formatSpot(value: number | null | undefined): string {
  return value != null ? formatNumber(value, 2) : "—";
}

export function formatGexValue(value: number | null | undefined): string {
  return formatGex(value);
}
