"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type SchemaMode = "processor" | "uw_raw";

interface SchemaContextValue {
  mode: SchemaMode | null;
  processorFeatures: boolean;
  loading: boolean;
}

const SchemaContext = createContext<SchemaContextValue>({
  mode: null,
  processorFeatures: true,
  loading: true,
});

export function useSchema() {
  return useContext(SchemaContext);
}

export function SchemaProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<SchemaMode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/schema", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setMode(data.mode ?? "processor"))
      .catch(() => setMode("processor"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SchemaContext.Provider
      value={{
        mode,
        processorFeatures: mode !== "uw_raw",
        loading,
      }}
    >
      {children}
    </SchemaContext.Provider>
  );
}
