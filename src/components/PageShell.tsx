import { Suspense } from "react";
import type { ReactNode } from "react";
import { ChartSkeleton } from "@/components/LoadingSkeleton";

export function PageShell({ children }: { children: ReactNode }) {
  return <Suspense fallback={<ChartSkeleton />}>{children}</Suspense>;
}
