-- Keep UUIDs and timestamps server-owned while preserving the session-client
-- upsert payload used by the weekly parent feedback action. RLS continues to
-- enforce parent, school, surface, and current-week ownership for these rows.
REVOKE INSERT, UPDATE
  ON TABLE public.parent_experience_feedback
  FROM PUBLIC, anon, authenticated;

GRANT INSERT (school_id, parent_id, rating, comment, surface, week_start)
  ON TABLE public.parent_experience_feedback
  TO authenticated;

GRANT UPDATE (school_id, parent_id, rating, comment, surface, week_start)
  ON TABLE public.parent_experience_feedback
  TO authenticated;
