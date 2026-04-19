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
    CREATE TABLE IF NOT EXISTS securities (
      ticker VARCHAR PRIMARY KEY,
      name   VARCHAR NOT NULL,
      cik    INTEGER
    );
  `);

  // Drop legacy columns from older installs.
  const colsReader = await conn.runAndReadAll(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'securities'",
  );
  const cols = new Set(
    colsReader.getRowObjectsJS().map((r) => String(r.column_name)),
  );
  if (cols.has("sector")) {
    await conn.run("ALTER TABLE securities DROP COLUMN sector");
  }
  if (cols.has("is_sp500")) {
    await conn.run("ALTER TABLE securities DROP COLUMN is_sp500");
  }
  if (!cols.has("cik")) {
    await conn.run("ALTER TABLE securities ADD COLUMN cik INTEGER");
  }

  await conn.run(`
    CREATE TABLE IF NOT EXISTS ticker_cache (
      ticker          VARCHAR PRIMARY KEY,
      last_fetched_at TIMESTAMP NOT NULL,
      status          VARCHAR NOT NULL
    );
  `);

  await conn.run(`
    CREATE TABLE IF NOT EXISTS prices (
      ticker    VARCHAR NOT NULL,
      date      DATE NOT NULL,
      open      DOUBLE NOT NULL,
      high      DOUBLE NOT NULL,
      low       DOUBLE NOT NULL,
      close     DOUBLE NOT NULL,
      adj_close DOUBLE NOT NULL,
      volume    BIGINT NOT NULL,
      PRIMARY KEY (ticker, date)
    );
  `);

  await conn.run(`
    CREATE TABLE IF NOT EXISTS indicators (
      ticker           VARCHAR NOT NULL,
      date             DATE NOT NULL,
      rsi_14           DOUBLE,
      sma_20           DOUBLE,
      sma_50           DOUBLE,
      sma_200          DOUBLE,
      macd             DOUBLE,
      macd_signal      DOUBLE,
      macd_cross_up    BOOLEAN,
      bb_lower         DOUBLE,
      pct_from_52w_low DOUBLE,
      volume_avg_20    DOUBLE,
      PRIMARY KEY (ticker, date)
    );
  `);

  await conn.run(
    "CREATE INDEX IF NOT EXISTS idx_prices_ticker ON prices(ticker)",
  );
  await conn.run(
    "CREATE INDEX IF NOT EXISTS idx_indicators_ticker ON indicators(ticker)",
  );
}

export async function closeDb(): Promise<void> {
  if (connection) {
    connection.closeSync();
    connection = null;
  }
}
