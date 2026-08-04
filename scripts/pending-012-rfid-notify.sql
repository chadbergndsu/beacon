-- Paste in Supabase SQL Editor (RFID + hardware path)
-- Same as supabase/migrations/012_rfid_parent_notify.sql

ALTER TABLE students ADD COLUMN IF NOT EXISTS rfid_uid TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_school_rfid
  ON students (school_id, rfid_uid)
  WHERE rfid_uid IS NOT NULL;
