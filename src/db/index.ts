import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "@/db/schema";

// Deprecated to set explicitly in recent versions, but keeping the import for Neon runtime support.
void neonConfig;

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:5432/postgres";

const pool = new Pool({ connectionString });

export const db = drizzle({ client: pool, schema });
export { schema };
