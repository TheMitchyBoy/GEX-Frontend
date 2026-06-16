"use client";

import Link from "next/link";
import { useSchema } from "@/components/SchemaProvider";

interface ProcessorOnlyGateProps {
  feature: string;
  children: React.ReactNode;
}

export function ProcessorOnlyGate({ feature, children }: ProcessorOnlyGateProps) {
  const { processorFeatures, loading, mode } = useSchema();

  if (loading) {
    return <p className="glossary" style={{ padding: "2rem 0" }}>Loading…</p>;
  }

  if (!processorFeatures) {
    return (
      <div className="empty-state">
        <div className="empty-icon" aria-hidden>◇</div>
        <p className="empty-title">Processor schema required</p>
        <p className="empty-message">
          <strong>{feature}</strong> needs GEX processor tables (<code>snapshots</code>,{" "}
          <code>snapshot_features</code>, etc.). Your database is in{" "}
          <code>{mode ?? "uw_raw"}</code> mode.
        </p>
        <p className="glossary" style={{ maxWidth: "48ch", marginTop: "1rem" }}>
          Run <code>python3 scripts/init_postgres_schema.py</code> in the GEX processor repo,
          set <code>GEX_STARTUP_BACKFILL=1</code>, and point both services at the same{" "}
          <code>DATABASE_URL</code>.
        </p>
        <p className="empty-action">
          <Link href="/uw-data" className="text-link">UW Data explorer</Link>
          <span> · </span>
          <Link href="/api/db-info" className="text-link">/api/db-info</Link>
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
