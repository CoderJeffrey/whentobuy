import { DuckDBInstance, type DuckDBConnection } from "@duckdb/node-api";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

let connection: DuckDBConnection | null = null;

export async function getDb(): Promise<DuckDBConnection> {
  if (connection) return connection;

  const dbPath = resolve(process.env.DB_PATH ?? "./data/app.db");
  const dir = dirname(dbPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const instance = await DuckDBInstance.create(dbPath);
  connection = await instance.connect();
  await migrate(connection);
  return connection;
}

async function migrate(conn: DuckDBConnection): Promise<void> {
  await conn.run(`
    CREATE TABLE IF NOT EXISTS prices (
      date      DATE PRIMARY KEY,
      open      DOUBLE NOT NULL,
      high      DOUBLE NOT NULL,
      low       DOUBLE NOT NULL,
      close     DOUBLE NOT NULL,
      adj_close DOUBLE NOT NULL,
      volume    BIGINT NOT NULL
    );
  `);
  await conn.run(`
    CREATE TABLE IF NOT EXISTS indicators (
      date             DATE PRIMARY KEY,
      rsi_14           DOUBLE,
      sma_20           DOUBLE,
      sma_50           DOUBLE,
      sma_200          DOUBLE,
      macd             DOUBLE,
      macd_signal      DOUBLE,
      macd_cross_up    BOOLEAN,
      bb_lower         DOUBLE,
      pct_from_52w_low DOUBLE,
      volume_avg_20    DOUBLE
    );
  `);
}

export async function recreateIndicatorsTable(
  conn: DuckDBConnection,
): Promise<void> {
  await conn.run("DROP TABLE IF EXISTS indicators");
  await conn.run(`
    CREATE TABLE indicators (
      date             DATE PRIMARY KEY,
      rsi_14           DOUBLE,
      sma_20           DOUBLE,
      sma_50           DOUBLE,
      sma_200          DOUBLE,
      macd             DOUBLE,
      macd_signal      DOUBLE,
      macd_cross_up    BOOLEAN,
      bb_lower         DOUBLE,
      pct_from_52w_low DOUBLE,
      volume_avg_20    DOUBLE
    );
  `);
}

export async function closeDb(): Promise<void> {
  if (connection) {
    connection.closeSync();
    connection = null;
  }
}
