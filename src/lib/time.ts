const NY_TZ = "America/New_York";

export function parseTs(ts: string): Date {
  const [datePart, timePart] = ts.split("_");
  if (!datePart || !timePart) {
    throw new Error(`Invalid ts format: ${ts}`);
  }
  const iso = `${datePart}T${timePart.slice(0, 2)}:${timePart.slice(2, 4)}:${timePart.slice(4, 6)}Z`;
  return new Date(iso);
}

export function formatTsLabel(ts: string, timeZone = NY_TZ): string {
  const date = parseTs(ts);
  return date.toLocaleString("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function formatTsShort(ts: string, timeZone = NY_TZ): string {
  const date = parseTs(ts);
  return date.toLocaleString("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatNumber(value: number | null | undefined, digits = 2): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatGex(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${formatNumber(value, 3)} Bn$/1%`;
}

export function regimeClass(regime: string | null | undefined): string {
  if (!regime) return "neutral";
  return regime.toLowerCase().includes("long") ? "long" : "short";
}
