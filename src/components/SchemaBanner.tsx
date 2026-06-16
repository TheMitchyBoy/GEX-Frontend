"use client";

import Link from "next/link";
import { useSchema } from "@/components/SchemaProvider";

export function SchemaBanner() {
  const { mode, loading } = useSchema();
  if (loading || mode !== "uw_raw") return null;

  return (
    <div className="schema-banner">
      <span>
        <strong>UW raw mode</strong> — reading from <code>uw_periscope</code> /{" "}
        <code>uw_history</code>. Journal pages need the GEX processor schema.
      </span>
      <Link href="/uw-data" className="text-link">
        UW explorer
      </Link>
      <Link href="/api/db-info" className="text-link">
        DB info
      </Link>
    </div>
  );
}
