-- Part 18: per-user combos (boolean AND-groups of indicators)
-- Run in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS combos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_combos_user ON combos(user_id);

CREATE TABLE IF NOT EXISTS combo_indicators (
  combo_id     UUID NOT NULL REFERENCES combos(id) ON DELETE CASCADE,
  indicator_id TEXT NOT NULL,
  added_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (combo_id, indicator_id)
);

ALTER TABLE combos ENABLE ROW LEVEL SECURITY;
ALTER TABLE combo_indicators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users access own combos" ON combos;
CREATE POLICY "Users access own combos"
  ON combos FOR ALL
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users access own combo indicators" ON combo_indicators;
CREATE POLICY "Users access own combo indicators"
  ON combo_indicators FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM combos
      WHERE combos.id = combo_indicators.combo_id
        AND combos.user_id = auth.uid()
    )
  );

-- Migration: for each existing user with a configured user_configs.weights,
-- create one combo named "My Indicators" containing all indicator IDs from
-- any tier. Users without a config get the default "Oversold + Uptrend".

WITH migrated AS (
  INSERT INTO combos (user_id, name)
  SELECT user_id, 'My Indicators'
  FROM user_configs
  WHERE jsonb_typeof(weights) = 'object'
    AND (SELECT COUNT(*) FROM jsonb_object_keys(weights)) > 0
    AND NOT EXISTS (SELECT 1 FROM combos c WHERE c.user_id = user_configs.user_id)
  RETURNING id, user_id
)
INSERT INTO combo_indicators (combo_id, indicator_id)
SELECT m.id, key
FROM migrated m
JOIN user_configs uc ON uc.user_id = m.user_id,
LATERAL jsonb_object_keys(uc.weights) AS key
ON CONFLICT DO NOTHING;

-- Default combo for users without one (e.g. brand-new users seeded before
-- the first-signup hook had combo support).
WITH defaulted AS (
  INSERT INTO combos (user_id, name)
  SELECT u.id, 'Oversold + Uptrend'
  FROM auth.users u
  WHERE NOT EXISTS (SELECT 1 FROM combos c WHERE c.user_id = u.id)
  RETURNING id, user_id
)
INSERT INTO combo_indicators (combo_id, indicator_id)
SELECT d.id, ind
FROM defaulted d
CROSS JOIN (VALUES ('rsi_oversold'), ('above_ema_200'), ('above_sma_200')) v(ind)
ON CONFLICT DO NOTHING;
