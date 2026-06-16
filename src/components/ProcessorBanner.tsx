"use client";

import { useEffect, useState } from "react";
import type { ProcessorHealth } from "@/lib/types";

export function ProcessorBanner() {
  const [health, setHealth] = useState<ProcessorHealth | null>(null);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_PROCESSOR_HEALTH_URL;
    if (!url) return;

    const load = () => {
      fetch(url, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then(setHealth)
        .catch(() => setHealth(null));
    };

    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  if (!health) return null;

  const status = health.status ?? "degraded";
  const cls = status === "ok" ? "ok" : status === "stale" ? "stale" : "degraded";

  return (
    <div className={`processor-banner ${cls}`}>
      <span className={`badge ${cls}`}>Processor: {status.toUpperCase()}</span>
      <span>
        Latest export {health.latest_ts ?? "—"}
        {health.export_age_minutes != null
          ? ` · ${health.export_age_minutes.toFixed(1)} min ago`
          : ""}
      </span>
    </div>
  );
}
