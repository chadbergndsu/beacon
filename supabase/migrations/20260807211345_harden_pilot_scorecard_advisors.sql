CREATE INDEX pilot_activity_daily_user_id_idx
  ON public.pilot_activity_daily (user_id);

CREATE INDEX parent_experience_feedback_parent_id_idx
  ON public.parent_experience_feedback (parent_id);

DROP POLICY parent_experience_feedback_parent_select
  ON public.parent_experience_feedback;
DROP POLICY parent_experience_feedback_leadership_select
  ON public.parent_experience_feedback;

CREATE POLICY parent_experience_feedback_select
ON public.parent_experience_feedback
FOR SELECT TO authenticated
USING (
  school_id = (SELECT private.get_user_school_id())
  AND (
    (
      (SELECT private.get_user_role()) = 'parent'
      AND parent_id = (SELECT auth.uid())
      AND week_start = date_trunc('week', timezone('utc', now()))::date
    )
    OR (SELECT private.get_user_role()) IN ('admin', 'principal')
  )
);
