import { formatGex, formatNumber, regimeClass } from "@/lib/time";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  regime?: string | null;
  tooltip?: string;
}

export function StatCard({ label, value, sub, regime, tooltip }: StatCardProps) {
  const regimeCls = regime ? `regime-${regimeClass(regime)}` : "";

  return (
    <div className="card" title={tooltip}>
      <div className="stat-label">{label}</div>
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
