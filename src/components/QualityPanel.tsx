import { formatNumber } from "@/lib/time";
import type { SnapshotDiagnostics, SnapshotFeatures } from "@/lib/types";

interface QualityPanelProps {
  features: SnapshotFeatures | null | undefined;
  diagnostics: SnapshotDiagnostics | null | undefined;
  qualityScore?: number | null;
  flipConfidence?: string | null;
  dataLagSec?: number | null;
}

function scoreClass(score: number | null | undefined): string {
  if (score == null) return "";
  if (score >= 0.8) return "quality-high";
  if (score >= 0.5) return "quality-mid";
  return "quality-low";
}

export function QualityPanel({
  features,
  diagnostics,
  qualityScore,
  flipConfidence,
  dataLagSec,
}: QualityPanelProps) {
  const score = qualityScore ?? features?.quality_score ?? diagnostics?.quality_score ?? null;
  const flip = flipConfidence ?? features?.flip_confidence ?? null;
  const lag = dataLagSec ?? features?.data_lag_sec ?? diagnostics?.data_lag_sec ?? null;
  const status = diagnostics?.status ?? null;

  if (score == null && !status && !flip) return null;

  return (
    <div className="card quality-panel">
      <h3>Data Quality</h3>
      <dl className="metric-list">
        {score != null ? (
          <>
            <dt>Quality score</dt>
            <dd className={scoreClass(score)}>{formatNumber(score * 100, 1)}%</dd>
          </>
        ) : null}
        {status ? (
          <>
            <dt>Pipeline status</dt>
            <dd>
              <span className={`badge diag-${status.replace(/_/g, "-")}`}>{status}</span>
            </dd>
          </>
        ) : null}
        {flip ? (
          <>
            <dt>Flip confidence</dt>
            <dd>{flip}</dd>
          </>
        ) : null}
        {features?.strike_profile_confidence ? (
          <>
            <dt>Strike profile</dt>
            <dd>{features.strike_profile_confidence}</dd>
          </>
        ) : null}
        {features?.regime_consistent != null ? (
          <>
            <dt>Regime consistent</dt>
            <dd>{features.regime_consistent ? "Yes" : "No"}</dd>
          </>
        ) : null}
        {features?.spot_source ? (
          <>
            <dt>Spot source</dt>
            <dd>{features.spot_source}</dd>
          </>
        ) : null}
        {features?.spot_disagreement_pct != null ? (
          <>
            <dt>Spot disagreement</dt>
            <dd>{formatNumber(features.spot_disagreement_pct * 100, 3)}%</dd>
          </>
        ) : null}
        {lag != null ? (
          <>
            <dt>Data lag</dt>
            <dd>{formatNumber(lag, 1)}s</dd>
          </>
        ) : null}
        {diagnostics?.uw_fetch_ms != null ? (
          <>
            <dt>UW fetch</dt>
            <dd>{formatNumber(diagnostics.uw_fetch_ms, 0)}ms</dd>
          </>
        ) : null}
        {diagnostics?.postgres_write_ms != null ? (
          <>
            <dt>Postgres write</dt>
            <dd>{formatNumber(diagnostics.postgres_write_ms, 0)}ms</dd>
          </>
        ) : null}
      </dl>
    </div>
  );
}
