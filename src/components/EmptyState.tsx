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
      <div className="empty-icon" aria-hidden>
        ◌
      </div>
      <p className="empty-title">{title}</p>
      <p className="empty-message">{message}</p>
      {showHealthLink ? (
        <p className="empty-action">
          <Link href="/api/health" className="text-link">
            Check /api/health
          </Link>
          <span> — is the processor running?</span>
        </p>
      ) : null}
    </div>
  );
}
