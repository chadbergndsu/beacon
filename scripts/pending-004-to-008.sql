-- System email outbox for Beacon announcements & notifications
CREATE TABLE IF NOT EXISTS email_outbox (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id),
  kind TEXT NOT NULL DEFAULT 'announcement',
  to_email TEXT NOT NULL,
  to_name TEXT,
  subject TEXT NOT NULL,
  body_text TEXT NOT NULL,
  body_html TEXT,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sent', 'failed', 'skipped')),
  provider TEXT,
  error TEXT,
  related_table TEXT,
  related_id UUID,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_email_outbox_school ON email_outbox(school_id);
CREATE INDEX IF NOT EXISTS idx_email_outbox_status ON email_outbox(status);
CREATE INDEX IF NOT EXISTS idx_email_outbox_created ON email_outbox(created_at DESC);

ALTER TABLE email_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff view school email outbox" ON email_outbox;
CREATE POLICY "Staff view school email outbox" ON email_outbox FOR SELECT
  USING (
    school_id = get_user_school_id()
    AND get_user_role() IN ('admin', 'staff', 'teacher', 'principal')
  );
-- Allow principal role on profiles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'teacher', 'parent', 'staff', 'principal'));

-- Legacy demo emails only: prefer profiles.role = 'principal' per school,
-- or BEACON_PRINCIPAL_EMAIL env for seed elevation.
UPDATE profiles
SET role = 'principal'
WHERE email IN ('principal@lighthouse.test', 'principal@example.test')
  AND role <> 'principal';
-- Principal billing + QuickBooks Online connection layer

CREATE TABLE IF NOT EXISTS quickbooks_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL UNIQUE REFERENCES schools(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'disconnected'
    CHECK (status IN ('disconnected', 'pending', 'connected', 'error')),
  environment TEXT NOT NULL DEFAULT 'sandbox'
    CHECK (environment IN ('sandbox', 'production')),
  realm_id TEXT,
  company_name TEXT,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT,
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  sync_customers BOOLEAN DEFAULT TRUE,
  sync_invoices BOOLEAN DEFAULT TRUE,
  sync_payments BOOLEAN DEFAULT TRUE,
  connected_by UUID REFERENCES profiles(id),
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS billing_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  frequency TEXT NOT NULL DEFAULT 'monthly'
    CHECK (frequency IN ('one_time', 'monthly', 'term', 'annual')),
  active BOOLEAN DEFAULT TRUE,
  qb_item_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS billing_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id),
  family_name TEXT,
  parent_email TEXT,
  product_id UUID REFERENCES billing_products(id),
  description TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'open', 'paid', 'void', 'overdue', 'syncing')),
  due_date DATE,
  qb_invoice_id TEXT,
  qb_synced_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS billing_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES billing_invoices(id) ON DELETE SET NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  method TEXT DEFAULT 'card'
    CHECK (method IN ('card', 'ach', 'check', 'cash', 'other', 'quickbooks')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded', 'syncing')),
  paid_at TIMESTAMPTZ,
  qb_payment_id TEXT,
  qb_synced_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_products_school ON billing_products(school_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_school ON billing_invoices(school_id);
CREATE INDEX IF NOT EXISTS idx_billing_payments_school ON billing_payments(school_id);

ALTER TABLE quickbooks_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_payments ENABLE ROW LEVEL SECURITY;

-- Leadership only (principal / admin / staff) via helper
CREATE OR REPLACE FUNCTION public.is_school_leadership()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_role() IN ('admin', 'staff', 'principal');
$$;

DROP POLICY IF EXISTS "Leadership manage QB connection" ON quickbooks_connections;
CREATE POLICY "Leadership manage QB connection" ON quickbooks_connections FOR ALL
  USING (school_id = get_user_school_id() AND is_school_leadership());

DROP POLICY IF EXISTS "Leadership manage products" ON billing_products;
CREATE POLICY "Leadership manage products" ON billing_products FOR ALL
  USING (school_id = get_user_school_id() AND is_school_leadership());

DROP POLICY IF EXISTS "Leadership manage invoices" ON billing_invoices;
CREATE POLICY "Leadership manage invoices" ON billing_invoices FOR ALL
  USING (school_id = get_user_school_id() AND is_school_leadership());

DROP POLICY IF EXISTS "Leadership manage payments" ON billing_payments;
CREATE POLICY "Leadership manage payments" ON billing_payments FOR ALL
  USING (school_id = get_user_school_id() AND is_school_leadership());
-- Beacon suite hardening: attendance + first-class module tables
-- Safe to re-run where possible

-- ========== ATTENDANCE ==========
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'tardy', 'excused')),
  note TEXT,
  marked_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (class_id, student_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON attendance(class_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_school ON attendance(school_id);

-- ========== LESSON PLANS ==========
CREATE TABLE IF NOT EXISTS lesson_plans (
  id TEXT PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  unit TEXT,
  objectives TEXT NOT NULL DEFAULT '',
  materials TEXT NOT NULL DEFAULT '',
  activities TEXT NOT NULL DEFAULT '',
  scripture TEXT,
  homework TEXT,
  differentiation TEXT,
  assessment TEXT,
  duration_minutes INTEGER DEFAULT 45,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'ready', 'taught')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lesson_plans_class ON lesson_plans(class_id, date DESC);

-- ========== BEACON PULSE ==========
CREATE TABLE IF NOT EXISTS pulse_entries (
  id TEXT PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES profiles(id),
  teacher_name TEXT,
  date DATE NOT NULL,
  overall TEXT NOT NULL CHECK (overall IN ('strong', 'steady', 'needs_care')),
  dimensions JSONB NOT NULL DEFAULT '{}'::jsonb,
  note TEXT,
  celebrate TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pulse_student ON pulse_entries(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pulse_school ON pulse_entries(school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pulse_class ON pulse_entries(class_id, date DESC);

-- ========== SCHOOL VIDEOS ==========
CREATE TABLE IF NOT EXISTS school_videos (
  id TEXT PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'other',
  category TEXT NOT NULL DEFAULT 'other',
  featured BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_school_videos_school ON school_videos(school_id, created_at DESC);

-- ========== RLS ==========
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_videos ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_school_leadership()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.get_user_role() IN ('admin', 'staff', 'principal'), false);
$$;

CREATE OR REPLACE FUNCTION public.teaches_class(p_class_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM classes c
    WHERE c.id = p_class_id AND c.teacher_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.parent_of_student(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM parent_students ps
    WHERE ps.student_id = p_student_id AND ps.parent_id = auth.uid()
  );
$$;

-- Attendance policies
DROP POLICY IF EXISTS "att_staff_all" ON attendance;
CREATE POLICY "att_staff_all" ON attendance FOR ALL
  USING (
    school_id = get_user_school_id()
    AND (is_school_leadership() OR teaches_class(class_id))
  );

DROP POLICY IF EXISTS "att_parent_select" ON attendance;
CREATE POLICY "att_parent_select" ON attendance FOR SELECT
  USING (parent_of_student(student_id));

-- Lesson plans
DROP POLICY IF EXISTS "lp_staff_all" ON lesson_plans;
CREATE POLICY "lp_staff_all" ON lesson_plans FOR ALL
  USING (
    school_id = get_user_school_id()
    AND (is_school_leadership() OR teaches_class(class_id))
  );

-- Pulse
DROP POLICY IF EXISTS "pulse_staff_all" ON pulse_entries;
CREATE POLICY "pulse_staff_all" ON pulse_entries FOR ALL
  USING (
    school_id = get_user_school_id()
    AND (is_school_leadership() OR teaches_class(class_id))
  );

DROP POLICY IF EXISTS "pulse_parent_select" ON pulse_entries;
CREATE POLICY "pulse_parent_select" ON pulse_entries FOR SELECT
  USING (parent_of_student(student_id));

-- Videos: leadership write, school staff read
DROP POLICY IF EXISTS "vid_leadership_all" ON school_videos;
CREATE POLICY "vid_leadership_all" ON school_videos FOR ALL
  USING (school_id = get_user_school_id() AND is_school_leadership());

DROP POLICY IF EXISTS "vid_staff_select" ON school_videos;
CREATE POLICY "vid_staff_select" ON school_videos FOR SELECT
  USING (
    school_id = get_user_school_id()
    AND get_user_role() IN ('admin', 'staff', 'principal', 'teacher')
  );
-- Communications hardening: principal can read outbox; ensure kinds stay free-form text
-- (email kinds are application-level: announcement, message, dinner_digest, etc.)

DROP POLICY IF EXISTS "Staff view school email outbox" ON email_outbox;
CREATE POLICY "Staff view school email outbox" ON email_outbox FOR SELECT
  USING (
    school_id = get_user_school_id()
    AND get_user_role() IN ('admin', 'staff', 'teacher', 'principal')
  );

-- Helpful index for filtering failed sends in the Comms UI
CREATE INDEX IF NOT EXISTS idx_email_outbox_kind ON email_outbox(kind);
