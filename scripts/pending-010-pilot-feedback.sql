-- Pilot feedback / suggestions (paste in Supabase SQL Editor if needed)
CREATE TABLE IF NOT EXISTS pilot_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  role TEXT,
  category TEXT NOT NULL DEFAULT 'idea'
    CHECK (category IN ('idea', 'issue', 'question', 'other')),
  message TEXT NOT NULL,
  page_path TEXT,
  page_title TEXT,
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'reviewed', 'planned', 'done', 'wont_do')),
  staff_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_pilot_feedback_school ON pilot_feedback(school_id);
CREATE INDEX IF NOT EXISTS idx_pilot_feedback_created ON pilot_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pilot_feedback_status ON pilot_feedback(status);

ALTER TABLE pilot_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own pilot feedback" ON pilot_feedback;
CREATE POLICY "Users insert own pilot feedback" ON pilot_feedback
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users view own pilot feedback" ON pilot_feedback;
CREATE POLICY "Users view own pilot feedback" ON pilot_feedback
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR (
      school_id = get_user_school_id()
      AND get_user_role() IN ('admin', 'staff', 'principal')
    )
  );

DROP POLICY IF EXISTS "Leadership update pilot feedback" ON pilot_feedback;
CREATE POLICY "Leadership update pilot feedback" ON pilot_feedback
  FOR UPDATE
  USING (
    school_id = get_user_school_id()
    AND get_user_role() IN ('admin', 'staff', 'principal')
  );
