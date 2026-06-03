-- Part 27: per-instance timeframe for combo indicators.
-- A combo can now contain the same indicator at multiple timeframes (e.g.
-- "RSI Oversold" daily AND weekly), so timeframe joins the primary key.
-- Existing rows default to 'daily' — no user-visible change.
-- Run in the Supabase SQL editor.

ALTER TABLE combo_indicators
  ADD COLUMN IF NOT EXISTS timeframe TEXT NOT NULL DEFAULT 'daily';

ALTER TABLE combo_indicators
  DROP CONSTRAINT IF EXISTS combo_indicators_pkey;

ALTER TABLE combo_indicators
  ADD PRIMARY KEY (combo_id, indicator_id, timeframe);
