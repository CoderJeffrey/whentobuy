-- Part 19: settings — per-user time zone
-- Run in the Supabase SQL editor.

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS time_zone TEXT NOT NULL DEFAULT 'America/New_York';
