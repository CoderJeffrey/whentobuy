-- Part 22: language — per-user UI language preference (en | zh)
-- Run in the Supabase SQL editor.

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en';
