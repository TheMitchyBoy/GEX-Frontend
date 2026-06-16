import type { SnapshotFeatures, SummaryJson, StrikeRow, Walls } from "@/lib/types";

export function deriveWalls(strikes: StrikeRow[]): Walls {
  if (strikes.length === 0) return { call_wall: null, put_wall: null };
  let callWall: StrikeRow | null = null;
  let putWall: StrikeRow | null = null;
  for (const row of strikes) {
    const gex = row.gex_bn_per_pct ?? 0;
    if (gex > 0 && (!callWall || gex > (callWall.gex_bn_per_pct ?? 0))) callWall = row;
    if (gex < 0 && (!putWall || gex < (putWall.gex_bn_per_pct ?? 0))) putWall = row;
  }
  return { call_wall: callWall?.strike ?? null, put_wall: putWall?.strike ?? null };
}

export function wallsFromFeatures(
  features: SnapshotFeatures | null,
  strikes: StrikeRow[],
): Walls {
  if (features?.call_wall != null || features?.put_wall != null) {
    return {
      call_wall: features.call_wall ?? null,
      put_wall: features.put_wall ?? null,
    };
  }
  return deriveWalls(strikes);
}

export function gammaFlipFrom(
  features: SnapshotFeatures | null,
  summary: SummaryJson | null,
): number | null {
  if (features?.gamma_flip != null) return features.gamma_flip;
  const fromSummary = summary?.gamma_flip;
  if (fromSummary != null && !Number.isNaN(Number(fromSummary))) return Number(fromSummary);
  return null;
}
