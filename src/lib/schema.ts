import { queryOptional } from "@/db/pg";

export type DatabaseSchema = "processor" | "uw_raw";

let cachedSchema: DatabaseSchema | null = null;
let cachedAt = 0;
const CACHE_MS = 60_000;

export async function detectDatabaseSchema(force = false): Promise<DatabaseSchema> {
  if (!force && cachedSchema && Date.now() - cachedAt < CACHE_MS) {
    return cachedSchema;
  }

  const tables = await queryOptional<{ name: string }>(
    `SELECT tablename AS name FROM pg_tables WHERE schemaname = 'public'`,
    [],
    "detectDatabaseSchema.tables",
  );
  const names = new Set(tables.map((t) => t.name));

  if (names.has("snapshots")) {
    const count = await queryOptional<{ cnt: string }>(
      `SELECT COUNT(*)::text AS cnt FROM snapshots`,
      [],
      "detectDatabaseSchema.snapshotCount",
    );
    if (Number(count[0]?.cnt ?? 0) > 0) {
      cachedSchema = "processor";
      cachedAt = Date.now();
      return cachedSchema;
    }
  }

  if (names.has("uw_periscope") || names.has("uw_history")) {
    cachedSchema = "uw_raw";
    cachedAt = Date.now();
    return cachedSchema;
  }

  cachedSchema = names.has("snapshots") ? "processor" : "uw_raw";
  cachedAt = Date.now();
  return cachedSchema;
}

export function resetSchemaCache() {
  cachedSchema = null;
  cachedAt = 0;
}
