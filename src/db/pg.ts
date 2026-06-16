import { Pool, type QueryResultRow } from "pg";
import { logDbError, logSlowQuery } from "@/lib/logger";

let pool: Pool | null = null;
let shutdownRegistered = false;

function resolveSsl(connectionString: string): false | { rejectUnauthorized: boolean } {
  if (connectionString.includes(".railway.internal")) return false;
  if (
    connectionString.includes("sslmode=require") ||
    connectionString.includes("ssl=true") ||
    connectionString.includes("proxy.rlwy.net")
  ) {
    return { rejectUnauthorized: false };
  }
  return false;
}

function registerShutdown() {
  if (shutdownRegistered || typeof process === "undefined") return;
  shutdownRegistered = true;
  const close = async () => {
    if (pool) {
      await pool.end().catch(() => undefined);
      pool = null;
    }
  };
  process.on("SIGTERM", close);
  process.on("SIGINT", close);
}

export function getPool(): Pool | null {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) return null;
    pool = new Pool({
      connectionString,
      ssl: resolveSsl(connectionString),
      max: Number(process.env.PG_POOL_MAX ?? "5"),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
    registerShutdown();
  }
  return pool;
}

export async function query<T extends QueryResultRow>(
  text: string,
  params?: unknown[],
  queryName = "query",
): Promise<T[]> {
  const db = getPool();
  if (!db) throw new Error("DATABASE_URL is not set");
  const started = Date.now();
  try {
    const result = await db.query<T>(text, params);
    logSlowQuery(queryName, Date.now() - started, { rows: result.rowCount });
    return result.rows;
  } catch (error) {
    logDbError(queryName, error);
    throw error;
  }
}

export async function queryOptional<T extends QueryResultRow>(
  text: string,
  params?: unknown[],
  queryName = "query",
): Promise<T[]> {
  try {
    return await query<T>(text, params, queryName);
  } catch {
    return [];
  }
}

export async function checkDbConnection(): Promise<boolean> {
  try {
    const db = getPool();
    if (!db) return false;
    await db.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}
