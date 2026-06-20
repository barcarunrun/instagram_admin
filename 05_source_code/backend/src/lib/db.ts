import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://instagram:instagram@localhost:5432/instagram_ops";

export const pool = new Pool({
  connectionString,
});

export async function checkDatabaseConnection(): Promise<void> {
  await pool.query("select 1");
}
