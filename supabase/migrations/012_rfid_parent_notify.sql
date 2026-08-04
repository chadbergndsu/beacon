-- RFID UIDs on students + indexes for hardware readers
-- Parent aftercare notify uses existing email_outbox + optional Twilio (no schema)

ALTER TABLE students ADD COLUMN IF NOT EXISTS rfid_uid TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_school_rfid
  ON students (school_id, rfid_uid)
  WHERE rfid_uid IS NOT NULL;
