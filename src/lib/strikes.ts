import type { StrikeRow } from "@/lib/types";

/** Keep strikes within pctBand of spot (default ±3%). */
export function filterStrikesNearSpot(
  strikes: StrikeRow[],
  spot: number | null | undefined,
  pctBand = 0.03,
): StrikeRow[] {
  if (!spot || spot <= 0 || strikes.length === 0) return strikes;
  const low = spot * (1 - pctBand);
  const high = spot * (1 + pctBand);
  const filtered = strikes.filter((s) => s.strike >= low && s.strike <= high);
  return filtered.length >= 10 ? filtered : strikes;
}
