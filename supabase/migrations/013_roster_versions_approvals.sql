-- Roster version history (undo mistakes) + deletion approval workflow

CREATE TABLE IF NOT EXISTS roster_revisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('student', 'class', 'enrollment')),
  entity_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (
    action IN (
      'create',
      'update',
      'soft_delete',
      'restore',
      'enroll',
      'unenroll',
      'assign_teacher'
    )
  ),
  before_data JSONB,
  after_data JSONB,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_role TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roster_revisions_school_time
  ON roster_revisions (school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_roster_revisions_entity
  ON roster_revisions (entity_type, entity_id, created_at DESC);

CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('delete_student', 'delete_class', 'unenroll_student')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('student', 'class', 'enrollment')),
  entity_id UUID NOT NULL,
  entity_label TEXT NOT NULL DEFAULT '',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  requested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'approved', 'rejected', 'cancelled')
  ),
  reviewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  review_note TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_school_status
  ON approval_requests (school_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requester
  ON approval_requests (requested_by, created_at DESC);
