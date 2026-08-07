-- Billing and QuickBooks are principal/admin capabilities in the application.
-- Keep is_school_leadership() unchanged because staff legitimately use it for
-- attendance, lessons, pulse, and videos; use this narrower billing boundary.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_school_billing_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'principal')
    );
$$;
REVOKE ALL ON FUNCTION private.is_school_billing_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_school_billing_admin() TO authenticated, service_role;

DROP POLICY IF EXISTS "Leadership manage QB connection" ON public.quickbooks_connections;
CREATE POLICY "Leadership manage QB connection"
  ON public.quickbooks_connections
  FOR ALL
  TO authenticated
  USING (
    school_id = (SELECT public.get_user_school_id())
    AND (SELECT private.is_school_billing_admin())
  )
  WITH CHECK (
    school_id = (SELECT public.get_user_school_id())
    AND (SELECT private.is_school_billing_admin())
  );

DROP POLICY IF EXISTS "Leadership manage products" ON public.billing_products;
CREATE POLICY "Leadership manage products"
  ON public.billing_products
  FOR ALL
  TO authenticated
  USING (
    school_id = (SELECT public.get_user_school_id())
    AND (SELECT private.is_school_billing_admin())
  )
  WITH CHECK (
    school_id = (SELECT public.get_user_school_id())
    AND (SELECT private.is_school_billing_admin())
  );

DROP POLICY IF EXISTS "Leadership manage invoices" ON public.billing_invoices;
CREATE POLICY "Leadership manage invoices"
  ON public.billing_invoices
  FOR ALL
  TO authenticated
  USING (
    school_id = (SELECT public.get_user_school_id())
    AND (SELECT private.is_school_billing_admin())
  )
  WITH CHECK (
    school_id = (SELECT public.get_user_school_id())
    AND (SELECT private.is_school_billing_admin())
  );

DROP POLICY IF EXISTS "Leadership manage payments" ON public.billing_payments;
CREATE POLICY "Leadership manage payments"
  ON public.billing_payments
  FOR ALL
  TO authenticated
  USING (
    school_id = (SELECT public.get_user_school_id())
    AND (SELECT private.is_school_billing_admin())
  )
  WITH CHECK (
    school_id = (SELECT public.get_user_school_id())
    AND (SELECT private.is_school_billing_admin())
  );

-- Payment plans and schedules arrived in migration 019. Some pilot databases
-- applied migration 006 manually and do not have these optional tables yet;
-- do not roll back the core billing/QB hardening in that state.
DO $$
BEGIN
  IF to_regclass('public.billing_payment_plans') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Leadership manage payment plans" ON public.billing_payment_plans';
    EXECUTE $policy$
      CREATE POLICY "Leadership manage payment plans"
        ON public.billing_payment_plans
        FOR ALL
        TO authenticated
        USING (
          school_id = (SELECT public.get_user_school_id())
          AND (SELECT private.is_school_billing_admin())
        )
        WITH CHECK (
          school_id = (SELECT public.get_user_school_id())
          AND (SELECT private.is_school_billing_admin())
        )
    $policy$;
  END IF;

  IF to_regclass('public.billing_schedules') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Leadership manage schedules" ON public.billing_schedules';
    EXECUTE $policy$
      CREATE POLICY "Leadership manage schedules"
        ON public.billing_schedules
        FOR ALL
        TO authenticated
        USING (
          school_id = (SELECT public.get_user_school_id())
          AND (SELECT private.is_school_billing_admin())
        )
        WITH CHECK (
          school_id = (SELECT public.get_user_school_id())
          AND (SELECT private.is_school_billing_admin())
        )
    $policy$;
  END IF;
END;
$$;
