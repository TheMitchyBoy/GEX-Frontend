"use client";

import { formatNumber } from "@/lib/time";
import type { GreekExposureRow } from "@/lib/types";

interface GreeksTableProps {
  rows: GreekExposureRow[];
}

const COLUMNS = ["strike", "expiration", "gamma", "delta", "vanna", "charm"] as const;

export function GreeksTable({ rows }: GreeksTableProps) {
  if (!rows?.length) {
    return <div className="empty-state">No greek exposure rows for this snapshot.</div>;
  }

  const presentCols = COLUMNS.filter((col) =>
    rows.some((r) => r[col] != null && r[col] !== ""),
  );

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {presentCols.map((col) => (
              <th key={col}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 200).map((row, i) => (
            <tr key={i}>
              {presentCols.map((col) => (
                <td key={col}>
                  {typeof row[col] === "number"
                    ? formatNumber(row[col] as number, 4)
                    : String(row[col] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 200 ? (
        <p className="glossary" style={{ marginTop: "0.75rem" }}>
          Showing first 200 of {rows.length} rows.
        </p>
      ) : null}
    </div>
  );
}
