CREATE TABLE public.pilot_activity_daily (
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_role text NOT NULL
    CHECK (actor_role IN ('admin', 'staff', 'principal', 'teacher', 'parent')),
  event_type text NOT NULL
    CHECK (event_type IN ('sign_in', 'teacher_work', 'parent_portal')),
  activity_date date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (school_id, user_id, event_type, activity_date)
);

CREATE INDEX pilot_activity_daily_school_window_idx
  ON public.pilot_activity_daily (school_id, activity_date DESC, actor_role, event_type);

ALTER TABLE public.pilot_activity_daily ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.pilot_activity_daily FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.pilot_activity_daily FROM service_role;
GRANT SELECT, INSERT ON TABLE public.pilot_activity_daily TO service_role;

CREATE TABLE public.parent_experience_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  parent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating text NOT NULL CHECK (rating IN ('helpful', 'not_yet')),
  comment text CHECK (comment IS NULL OR char_length(comment) <= 500),
  surface text NOT NULL DEFAULT 'parent_dashboard' CHECK (surface = 'parent_dashboard'),
  week_start date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, parent_id, surface, week_start)
);

CREATE INDEX parent_experience_feedback_school_created_idx
  ON public.parent_experience_feedback (school_id, created_at DESC);

ALTER TABLE public.parent_experience_feedback ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.parent_experience_feedback FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.parent_experience_feedback FROM service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.parent_experience_feedback TO authenticated;
GRANT SELECT ON TABLE public.parent_experience_feedback TO service_role;

CREATE POLICY parent_experience_feedback_parent_select
ON public.parent_experience_feedback
FOR SELECT TO authenticated
USING (
  parent_id = (SELECT auth.uid())
  AND school_id = (SELECT private.get_user_school_id())
  AND (SELECT private.get_user_role()) = 'parent'
  AND week_start = date_trunc('week', timezone('utc', now()))::date
);

CREATE POLICY parent_experience_feedback_parent_insert
ON public.parent_experience_feedback
FOR INSERT TO authenticated
WITH CHECK (
  parent_id = (SELECT auth.uid())
  AND school_id = (SELECT private.get_user_school_id())
  AND (SELECT private.get_user_role()) = 'parent'
  AND week_start = date_trunc('week', timezone('utc', now()))::date
);

CREATE POLICY parent_experience_feedback_parent_update
ON public.parent_experience_feedback
FOR UPDATE TO authenticated
USING (
  parent_id = (SELECT auth.uid())
  AND school_id = (SELECT private.get_user_school_id())
  AND (SELECT private.get_user_role()) = 'parent'
  AND week_start = date_trunc('week', timezone('utc', now()))::date
)
WITH CHECK (
  parent_id = (SELECT auth.uid())
  AND school_id = (SELECT private.get_user_school_id())
  AND (SELECT private.get_user_role()) = 'parent'
  AND week_start = date_trunc('week', timezone('utc', now()))::date
);

CREATE POLICY parent_experience_feedback_leadership_select
ON public.parent_experience_feedback
FOR SELECT TO authenticated
USING (
  school_id = (SELECT private.get_user_school_id())
  AND (SELECT private.get_user_role()) IN ('admin', 'principal')
);
