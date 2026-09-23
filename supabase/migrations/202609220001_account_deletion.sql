-- Suppression de compte (App Store 5.1.1(v), Play « Suppression de compte »).
-- Requires 202609050001_order_integrity.sql (orders RLS/grants) and the historical
-- push_tokens / live_activity_tokens tables from supabase_notifications.sql.
--
-- Two functions, two callers :
--   account_deletion_blocker()  — the signed-in customer asks whether deletion is
--                                 possible right now (NULL) or why not.
--   erase_customer_data(uuid)   — service_role only, called by the Edge Function
--                                 `delete-account` BEFORE auth.admin.deleteUser().
--
-- Orders are kept for the restaurant's accounting but stripped of every personal
-- field; the customer link is cut so the row survives whatever the FK rule on
-- auth.users is. The UPDATE touches no status column, so orders_notify_change
-- (AFTER INSERT OR UPDATE OF status) sends nothing.
BEGIN;

CREATE OR REPLACE FUNCTION public.account_deletion_blocker()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN 'UNAUTHENTICATED'
    WHEN EXISTS (SELECT 1 FROM orders WHERE customer_id = auth.uid() AND status NOT IN ('DELIVERED','CANCELLED')) THEN 'ACTIVE_ORDER'
    WHEN EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (restaurant_id IS NOT NULL OR role = 'admin')) THEN 'STAFF_ACCOUNT'
    ELSE NULL
  END
$$;
REVOKE ALL ON FUNCTION public.account_deletion_blocker() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.account_deletion_blocker() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.erase_customer_data(p_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_user IS NULL THEN RAISE EXCEPTION 'USER_REQUIRED' USING ERRCODE = '22023'; END IF;
  -- Same lock as create_order: a checkout racing the deletion waits, then fails
  -- on the missing account instead of leaving an active order behind.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text, 0));
  IF EXISTS (SELECT 1 FROM orders WHERE customer_id = p_user AND status NOT IN ('DELIVERED','CANCELLED')) THEN
    RAISE EXCEPTION 'ACTIVE_ORDER' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE id = p_user AND (restaurant_id IS NOT NULL OR role = 'admin')) THEN
    RAISE EXCEPTION 'STAFF_ACCOUNT' USING ERRCODE = '22023';
  END IF;

  UPDATE order_items SET note = NULL
   WHERE order_id IN (SELECT id FROM orders WHERE customer_id = p_user);
  DELETE FROM live_activity_tokens
   WHERE order_id IN (SELECT id FROM orders WHERE customer_id = p_user);
  UPDATE orders SET
    customer_id = NULL,
    customer_name = 'Compte supprimé',
    customer_phone = NULL,
    delivery_address = 'Adresse supprimée',
    delivery_landmark = NULL,
    delivery_note = NULL,
    delivery_lat = NULL,
    delivery_lng = NULL,
    push_token = NULL
   WHERE customer_id = p_user;
  DELETE FROM push_tokens WHERE user_id = p_user;
  DELETE FROM profiles WHERE id = p_user;
END $$;
REVOKE ALL ON FUNCTION public.erase_customer_data(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.erase_customer_data(uuid) TO service_role;

COMMIT;
