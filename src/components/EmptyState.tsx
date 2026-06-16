import Link from "next/link";

interface EmptyStateProps {
  title?: string;
  message?: string;
  showHealthLink?: boolean;
}

export function EmptyState({
  title = "No data",
  message = "No snapshots found for this selection.",
  showHealthLink = true,
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      <p style={{ fontWeight: 600, color: "var(--text)", marginBottom: "0.5rem" }}>{title}</p>
      <p>{message}</p>
      {showHealthLink ? (
        <p style={{ marginTop: "1rem" }}>
          <Link href="/api/health" className="text-link">
            Check /api/health
          </Link>
          {" — is the processor running?"}
        </p>
      ) : null}
    </div>
  );
}
