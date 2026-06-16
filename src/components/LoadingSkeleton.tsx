"use client";

export function LoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="skeleton-grid">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-card" />
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return <div className="skeleton-chart" />;
}
