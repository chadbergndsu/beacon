-- Security lockdown: prevent privilege escalation via client RLS,
-- role-scoped writes on core tables, scrub legacy kiosk secrets from settings.
-- Safe to re-run.

-- ========== 1) Lock profile.role / profile.school_id against self-service ==========
-- Clients may still update safe fields (name, phone, preferences) via own-row policy,
-- but cannot change identity fields. Service role (admin API) bypasses RLS.

CREATE OR REPLACE FUNCTION public.profiles_protect_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- service_role / backend may change anything
  IF COALESCE(auth.role(), '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'profiles.id is immutable';
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'profiles.role cannot be changed by clients';
  END IF;

  IF NEW.school_id IS DISTINCT FROM OLD.school_id THEN
    RAISE EXCEPTION 'profiles.school_id cannot be changed by clients';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_protect_identity ON profiles;
CREATE TRIGGER trg_profiles_protect_identity
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_protect_identity();

-- Own-row update only. Identity immutability is enforced by the trigger above
-- (avoids recursive RLS subqueries on profiles during UPDATE).
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users update own safe fields" ON profiles;
CREATE POLICY "Users update own safe fields" ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ========== 2) Role-scoped writes: parents must not write core tables ==========
-- Permissive RLS ORs policies; school-wide FOR ALL gave parents write access.

-- Students
DROP POLICY IF EXISTS "School isolation students" ON students;
DROP POLICY IF EXISTS "staff_students_all" ON students;
CREATE POLICY "staff_students_all" ON students
  FOR ALL
  USING (
    school_id = get_user_school_id()
    AND get_user_role() IN ('admin', 'staff', 'principal', 'teacher')
  )
  WITH CHECK (
    school_id = get_user_school_id()
    AND get_user_role() IN ('admin', 'staff', 'principal', 'teacher')
  );
-- Parent SELECT "Parents see linked students" remains from 001/003

-- Classes
DROP POLICY IF EXISTS "School isolation classes" ON classes;
DROP POLICY IF EXISTS "staff_classes_all" ON classes;
CREATE POLICY "staff_classes_all" ON classes
  FOR ALL
  USING (
    school_id = get_user_school_id()
    AND get_user_role() IN ('admin', 'staff', 'principal', 'teacher')
  )
  WITH CHECK (
    school_id = get_user_school_id()
    AND get_user_role() IN ('admin', 'staff', 'principal', 'teacher')
  );

-- Grades (replace broad school FOR ALL)
DROP POLICY IF EXISTS "School isolation grades" ON grades;
DROP POLICY IF EXISTS "staff_grades_all" ON grades;
CREATE POLICY "staff_grades_all" ON grades
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN classes c ON c.id = a.class_id
      WHERE a.id = grades.assignment_id
        AND c.school_id = get_user_school_id()
        AND (
          get_user_role() IN ('admin', 'staff', 'principal')
          OR c.teacher_id = auth.uid()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN classes c ON c.id = a.class_id
      WHERE a.id = grades.assignment_id
        AND c.school_id = get_user_school_id()
        AND (
          get_user_role() IN ('admin', 'staff', 'principal')
          OR c.teacher_id = auth.uid()
        )
    )
  );
-- Keep "Teachers manage own class grades" and "Parents view child grades" as extra SELECT paths

-- Enrollments: staff/teacher only for writes (FOR ALL was any school member)
DROP POLICY IF EXISTS "School isolation enrollments" ON enrollments;
DROP POLICY IF EXISTS "staff_enrollments_all" ON enrollments;
CREATE POLICY "staff_enrollments_all" ON enrollments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = enrollments.class_id
        AND c.school_id = get_user_school_id()
        AND get_user_role() IN ('admin', 'staff', 'principal', 'teacher')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = enrollments.class_id
        AND c.school_id = get_user_school_id()
        AND get_user_role() IN ('admin', 'staff', 'principal', 'teacher')
    )
  );

-- Assignments
DROP POLICY IF EXISTS "School isolation assignments" ON assignments;
DROP POLICY IF EXISTS "staff_assignments_all" ON assignments;
CREATE POLICY "staff_assignments_all" ON assignments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = assignments.class_id
        AND c.school_id = get_user_school_id()
        AND (
          get_user_role() IN ('admin', 'staff', 'principal')
          OR c.teacher_id = auth.uid()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = assignments.class_id
        AND c.school_id = get_user_school_id()
        AND (
          get_user_role() IN ('admin', 'staff', 'principal')
          OR c.teacher_id = auth.uid()
        )
    )
  );

-- Grade categories
DROP POLICY IF EXISTS "School isolation grade_categories" ON grade_categories;
DROP POLICY IF EXISTS "staff_grade_categories_all" ON grade_categories;
CREATE POLICY "staff_grade_categories_all" ON grade_categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = grade_categories.class_id
        AND c.school_id = get_user_school_id()
        AND (
          get_user_role() IN ('admin', 'staff', 'principal')
          OR c.teacher_id = auth.uid()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = grade_categories.class_id
        AND c.school_id = get_user_school_id()
        AND (
          get_user_role() IN ('admin', 'staff', 'principal')
          OR c.teacher_id = auth.uid()
        )
    )
  );

-- Announcements: never allow school_id IS NULL as a global read
DROP POLICY IF EXISTS "School isolation announcements" ON announcements;
CREATE POLICY "School isolation announcements" ON announcements
  FOR SELECT
  USING (school_id = get_user_school_id());

DROP POLICY IF EXISTS "Staff write announcements" ON announcements;
CREATE POLICY "Staff write announcements" ON announcements
  FOR ALL
  USING (
    school_id = get_user_school_id()
    AND get_user_role() IN ('admin', 'staff', 'principal', 'teacher')
  )
  WITH CHECK (
    school_id = get_user_school_id()
    AND get_user_role() IN ('admin', 'staff', 'principal', 'teacher')
  );

-- Explicit deny-all for school_access_tokens (service_role still bypasses)
DROP POLICY IF EXISTS "No client access school_access_tokens" ON school_access_tokens;
CREATE POLICY "No client access school_access_tokens" ON school_access_tokens
  FOR ALL USING (false) WITH CHECK (false);

-- ========== 3) Scrub legacy kiosk/device secrets from schools.settings ==========
UPDATE schools
SET settings =
  CASE
    WHEN settings ? 'badge' THEN
      jsonb_set(
        settings::jsonb,
        '{badge}',
        (settings::jsonb -> 'badge') - 'kioskToken' - 'deviceToken',
        true
      )
    ELSE settings::jsonb
  END
WHERE settings IS NOT NULL
  AND (
    settings::jsonb #>> '{badge,kioskToken}' IS NOT NULL
    OR settings::jsonb #>> '{badge,deviceToken}' IS NOT NULL
  );
