type LogLevel = "info" | "warn" | "error";

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const entry = {
    level,
    message,
    ts: new Date().toISOString(),
    ...meta,
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export function logSlowQuery(
  queryName: string,
  durationMs: number,
  meta?: Record<string, unknown>,
) {
  if (durationMs > 500) {
    log("warn", "slow_query", { queryName, durationMs, ...meta });
  }
}

export function logDbError(queryName: string, error: unknown) {
  log("error", "db_error", {
    queryName,
    error: error instanceof Error ? error.message : String(error),
  });
}

export { log };
