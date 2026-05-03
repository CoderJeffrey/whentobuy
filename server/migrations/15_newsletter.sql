-- Part 15: daily newsletter
-- Run in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  newsletter_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  unsubscribe_token UUID NOT NULL DEFAULT gen_random_uuid(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS user_preferences_unsubscribe_token_idx
  ON user_preferences (unsubscribe_token);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users access own preferences" ON user_preferences;
CREATE POLICY "Users access own preferences"
  ON user_preferences FOR ALL
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL,
  error_message TEXT,
  resend_id TEXT
);

CREATE INDEX IF NOT EXISTS email_log_user_id_sent_at_idx
  ON email_log (user_id, sent_at DESC);
