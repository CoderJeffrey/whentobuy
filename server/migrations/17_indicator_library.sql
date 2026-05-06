-- Part 17: per-user indicator library (marketplace flow)
-- Run in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS user_indicator_library (
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  indicator_id TEXT NOT NULL,
  added_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, indicator_id)
);

ALTER TABLE user_indicator_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users access own library" ON user_indicator_library;
CREATE POLICY "Users access own library"
  ON user_indicator_library FOR ALL
  USING (auth.uid() = user_id);

-- Backfill: any indicator already configured (weighted) goes into the library.
INSERT INTO user_indicator_library (user_id, indicator_id)
SELECT user_id, key
FROM user_configs, jsonb_object_keys(weights) AS key
ON CONFLICT DO NOTHING;

-- Seed all 10 currently-registered indicators for users who still have an
-- empty library (existing users who never configured anything, or new ones
-- who slipped past the first-signup hook).
INSERT INTO user_indicator_library (user_id, indicator_id)
SELECT u.id, d.indicator_id
FROM auth.users u
CROSS JOIN (VALUES
  ('rsi_oversold'),
  ('macd_bullish_cross'),
  ('macd_positive'),
  ('above_sma_200'),
  ('above_sma_50'),
  ('above_sma_20'),
  ('golden_cross'),
  ('near_52w_low'),
  ('bb_lower_touch'),
  ('volume_spike')
) d(indicator_id)
WHERE NOT EXISTS (
  SELECT 1 FROM user_indicator_library l WHERE l.user_id = u.id
)
ON CONFLICT DO NOTHING;
