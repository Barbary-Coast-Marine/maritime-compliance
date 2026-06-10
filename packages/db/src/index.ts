import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

export * from "./schema/index.js";
export { schema };

export function createDb(connectionString?: string) {
  const url = connectionString ?? process.env.DATABASE_URL ?? "postgresql://darren@localhost:5432/maritime_compliance";
  const client = postgres(url);
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDb>;
