import { readFile } from "node:fs/promises";
import pg from "pg";

const { Pool } = pg;
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required. Copy .env.example to .env and configure PostgreSQL.");
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function initializeDatabase() {
  const schema = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
  await pool.query(schema);
}
