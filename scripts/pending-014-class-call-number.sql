-- Paste in Supabase SQL Editor
ALTER TABLE classes ADD COLUMN IF NOT EXISTS call_number TEXT;

CREATE INDEX IF NOT EXISTS idx_classes_school_call
  ON classes (school_id, call_number)
  WHERE call_number IS NOT NULL;
