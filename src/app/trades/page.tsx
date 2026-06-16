"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { ChartSkeleton } from "@/components/LoadingSkeleton";
import { formatNumber } from "@/lib/time";
import { ProcessorOnlyGate } from "@/components/ProcessorOnlyGate";
import type { TradeRow } from "@/lib/types";

export default function TradesPage() {
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/trades?limit=100")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setTrades(data.trades ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="page-header">
        <h1>Trade Journal</h1>
        <p>Paper/live trades from the <code>trades</code> table.</p>
      </div>
      <ProcessorOnlyGate feature="Trade Journal">
      {error ? <div className="error-banner">{error}</div> : null}
      <div className="card">
        {loading ? <ChartSkeleton /> : trades.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Type</th>
                  <th>Strike</th>
                  <th>Qty</th>
                  <th>Entry</th>
                  <th>Exit</th>
                  <th>PnL %</th>
                  <th>PnL $</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((t) => (
                  <tr key={t.id}>
                    <td>{t.status}</td>
                    <td>{t.option_type}</td>
                    <td>{formatNumber(t.strike, 0)}</td>
                    <td>{formatNumber(t.qty, 0)}</td>
                    <td>{t.entry_ts}</td>
                    <td>{t.exit_ts ?? "—"}</td>
                    <td>{formatNumber(t.pnl_pct, 2)}</td>
                    <td>{formatNumber(t.pnl_usd, 2)}</td>
                    <td>{t.exit_reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No trades" message="The trades table is empty." />
        )}
      </div>
      </ProcessorOnlyGate>
    </>
  );
}
