"use client";

import { formatNumber } from "@/lib/time";

interface GreeksTableProps {
  rows: Record<string, unknown>[];
  total: number;
  limit: number;
  offset: number;
  onPageChange: (offset: number) => void;
}

const COLUMNS = ["strike", "expiration", "gamma", "delta", "vanna", "charm"] as const;

export function GreeksTable({
  rows,
  total,
  limit,
  offset,
  onPageChange,
}: GreeksTableProps) {
  if (!total) {
    return <div className="empty-state">No greek exposure rows for this snapshot.</div>;
  }

  const presentCols = COLUMNS.filter((col) =>
    rows.some((r) => r[col] != null && r[col] !== ""),
  );

  const page = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  return (
    <>
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
            {rows.map((row, i) => (
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
      </div>
      <div className="pagination-row">
        <button
          type="button"
          className="btn-secondary"
          disabled={offset <= 0}
          onClick={() => onPageChange(Math.max(0, offset - limit))}
        >
          Previous
        </button>
        <span className="glossary">
          Page {page} of {totalPages} ({total} rows)
        </span>
        <button
          type="button"
          className="btn-secondary"
          disabled={offset + limit >= total}
          onClick={() => onPageChange(offset + limit)}
        >
          Next
        </button>
      </div>
    </>
  );
}
