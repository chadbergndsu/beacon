-- Per-user UI preferences (configurable screen layouts, etc.)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN profiles.preferences IS
  'User UI prefs. viewLayouts: { [screenId]: { order: string[], hidden: string[] } }';
