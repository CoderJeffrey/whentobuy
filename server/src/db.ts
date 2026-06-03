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

async function getColumns(
  conn: DuckDBConnection,
  table: string,
): Promise<Set<string>> {
  const reader = await conn.runAndReadAll(
    `SELECT column_name FROM information_schema.columns WHERE table_name = '${table}'`,
  );
  return new Set(reader.getRowObjectsJS().map((r) => String(r.column_name)));
}

async function migrate(conn: DuckDBConnection): Promise<void> {
  // ── securities ─────────────────────────────────────────────────────────
  // Fresh installs get the v21 shape directly; older installs (ticker-only PK,
  // possibly with legacy sector/is_sp500 columns) are rebuilt with every US
  // row qualified as exchange='US', market='us'.
  await conn.run(`
    CREATE TABLE IF NOT EXISTS securities (
      ticker   VARCHAR NOT NULL,
      exchange VARCHAR NOT NULL,
      name     VARCHAR NOT NULL,
      market   VARCHAR NOT NULL,
      cik      INTEGER,
      PRIMARY KEY (ticker, exchange)
    );
  `);
  {
    const cols = await getColumns(conn, "securities");
    if (!cols.has("exchange")) {
      const cikExpr = cols.has("cik") ? "cik" : "NULL";
      await conn.run(`
        CREATE TABLE securities_new (
          ticker   VARCHAR NOT NULL,
          exchange VARCHAR NOT NULL,
          name     VARCHAR NOT NULL,
          market   VARCHAR NOT NULL,
          cik      INTEGER,
          PRIMARY KEY (ticker, exchange)
        );
      `);
      await conn.run(
        `INSERT INTO securities_new SELECT ticker, 'US', name, 'us', ${cikExpr} FROM securities`,
      );
      await conn.run("DROP TABLE securities");
      await conn.run("ALTER TABLE securities_new RENAME TO securities");
    }
  }

  // ── prices ─────────────────────────────────────────────────────────────
  // Daily is the original table; weekly/monthly (v27) mirror its shape exactly
  // and are queried directly for their respective chart/indicator timeframes.
  for (const table of ["prices", "prices_weekly", "prices_monthly"]) {
    await conn.run(`
      CREATE TABLE IF NOT EXISTS ${table} (
        ticker    VARCHAR NOT NULL,
        exchange  VARCHAR NOT NULL,
        date      DATE NOT NULL,
        open      DOUBLE NOT NULL,
        high      DOUBLE NOT NULL,
        low       DOUBLE NOT NULL,
        close     DOUBLE NOT NULL,
        adj_close DOUBLE NOT NULL,
        volume    BIGINT NOT NULL,
        PRIMARY KEY (ticker, exchange, date)
      );
    `);
  }
  {
    const cols = await getColumns(conn, "prices");
    if (!cols.has("exchange")) {
      await conn.run(`
        CREATE TABLE prices_new (
          ticker    VARCHAR NOT NULL,
          exchange  VARCHAR NOT NULL,
          date      DATE NOT NULL,
          open      DOUBLE NOT NULL,
          high      DOUBLE NOT NULL,
          low       DOUBLE NOT NULL,
          close     DOUBLE NOT NULL,
          adj_close DOUBLE NOT NULL,
          volume    BIGINT NOT NULL,
          PRIMARY KEY (ticker, exchange, date)
        );
      `);
      await conn.run(
        `INSERT INTO prices_new SELECT ticker, 'US', date, open, high, low, close, adj_close, volume FROM prices`,
      );
      await conn.run("DROP TABLE prices");
      await conn.run("ALTER TABLE prices_new RENAME TO prices");
    }
  }

  // ── indicators ─────────────────────────────────────────────────────────
  await conn.run(`
    CREATE TABLE IF NOT EXISTS indicators (
      ticker           VARCHAR NOT NULL,
      exchange         VARCHAR NOT NULL,
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
      PRIMARY KEY (ticker, exchange, date)
    );
  `);
  // Weekly/monthly indicator tables (v27) mirror the daily `indicators` shape.
  for (const table of ["indicators_weekly", "indicators_monthly"]) {
    await conn.run(`
      CREATE TABLE IF NOT EXISTS ${table} (
        ticker           VARCHAR NOT NULL,
        exchange         VARCHAR NOT NULL,
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
        PRIMARY KEY (ticker, exchange, date)
      );
    `);
  }
  {
    const cols = await getColumns(conn, "indicators");
    if (!cols.has("exchange")) {
      await conn.run(`
        CREATE TABLE indicators_new (
          ticker           VARCHAR NOT NULL,
          exchange         VARCHAR NOT NULL,
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
          PRIMARY KEY (ticker, exchange, date)
        );
      `);
      await conn.run(
        `INSERT INTO indicators_new SELECT ticker, 'US', date, rsi_14, sma_20, sma_50, sma_200, macd, macd_signal, macd_cross_up, bb_lower, pct_from_52w_low, volume_avg_20 FROM indicators`,
      );
      await conn.run("DROP TABLE indicators");
      await conn.run("ALTER TABLE indicators_new RENAME TO indicators");
    }
  }

  // ── ticker_cache ───────────────────────────────────────────────────────
  // v27 tracks freshness per timeframe so a partial failure (e.g. weekly gap
  // for an A-share) doesn't poison the daily cache.
  await conn.run(`
    CREATE TABLE IF NOT EXISTS ticker_cache (
      ticker          VARCHAR NOT NULL,
      exchange        VARCHAR NOT NULL,
      timeframe       VARCHAR NOT NULL,
      last_fetched_at TIMESTAMP NOT NULL,
      status          VARCHAR NOT NULL,
      PRIMARY KEY (ticker, exchange, timeframe)
    );
  `);
  {
    const cols = await getColumns(conn, "ticker_cache");
    if (!cols.has("exchange")) {
      // Legacy ticker-only PK → qualify as exchange='US', timeframe='daily'.
      await conn.run(`
        CREATE TABLE ticker_cache_new (
          ticker          VARCHAR NOT NULL,
          exchange        VARCHAR NOT NULL,
          timeframe       VARCHAR NOT NULL,
          last_fetched_at TIMESTAMP NOT NULL,
          status          VARCHAR NOT NULL,
          PRIMARY KEY (ticker, exchange, timeframe)
        );
      `);
      await conn.run(
        `INSERT INTO ticker_cache_new SELECT ticker, 'US', 'daily', last_fetched_at, status FROM ticker_cache`,
      );
      await conn.run("DROP TABLE ticker_cache");
      await conn.run("ALTER TABLE ticker_cache_new RENAME TO ticker_cache");
    } else if (!cols.has("timeframe")) {
      // Had (ticker, exchange) PK from v21 → existing rows become daily.
      await conn.run(`
        CREATE TABLE ticker_cache_new (
          ticker          VARCHAR NOT NULL,
          exchange        VARCHAR NOT NULL,
          timeframe       VARCHAR NOT NULL,
          last_fetched_at TIMESTAMP NOT NULL,
          status          VARCHAR NOT NULL,
          PRIMARY KEY (ticker, exchange, timeframe)
        );
      `);
      await conn.run(
        `INSERT INTO ticker_cache_new SELECT ticker, exchange, 'daily', last_fetched_at, status FROM ticker_cache`,
      );
      await conn.run("DROP TABLE ticker_cache");
      await conn.run("ALTER TABLE ticker_cache_new RENAME TO ticker_cache");
    }
  }

  await conn.run(`
    CREATE TABLE IF NOT EXISTS market_data (
      date       DATE PRIMARY KEY,
      vix        DOUBLE,
      fng_value  INTEGER,
      fng_rating VARCHAR,
      fetched_at TIMESTAMP NOT NULL DEFAULT now()
    );
  `);

  for (const table of ["prices", "prices_weekly", "prices_monthly"]) {
    await conn.run(
      `CREATE INDEX IF NOT EXISTS idx_${table}_ticker ON ${table}(ticker, exchange)`,
    );
  }
  for (const table of ["indicators", "indicators_weekly", "indicators_monthly"]) {
    await conn.run(
      `CREATE INDEX IF NOT EXISTS idx_${table}_ticker ON ${table}(ticker, exchange)`,
    );
  }
}

export async function closeDb(): Promise<void> {
  if (connection) {
    connection.closeSync();
    connection = null;
  }
}
