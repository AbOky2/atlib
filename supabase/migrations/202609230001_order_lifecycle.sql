-- Cycle de vie des commandes : motif d'annulation, réception confirmée par le
-- client, commandes fantômes clôturées, jobs planifiés créés par la migration.
-- Requires 202609050001_order_integrity.sql (guard_order_transition, grants).
BEGIN;

-- 1. Motif d'annulation, communiqué au client (push + suivi) et gardé pour l'exploitation ;
--    heure d'acceptation, base réelle de l'heure d'arrivée annoncée (et non la création).
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancellation_reason text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS accepted_at timestamptz;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_cancellation_reason_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_cancellation_reason_check CHECK (
  cancellation_reason IS NULL OR cancellation_reason IN
  ('OUT_OF_STOCK','CLOSED','ADDRESS_NOT_SERVED','CUSTOMER_UNREACHABLE','CUSTOMER','NO_RESPONSE','ABANDONED','OTHER')
);
GRANT UPDATE(cancellation_reason) ON public.orders TO authenticated;

-- 2. Transitions : le restaurant peut aussi annuler en cours de livraison (client
--    injoignable) ; le client peut confirmer la réception ; une annulation porte
--    toujours un motif, et un motif ne peut pas être posé sur une commande vivante.
CREATE OR REPLACE FUNCTION public.guard_order_transition()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE is_customer boolean := auth.uid() IS NOT NULL AND auth.uid() = OLD.customer_id;
BEGIN
 IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
   IF NEW.cancellation_reason IS DISTINCT FROM OLD.cancellation_reason THEN
     RAISE EXCEPTION 'STATUS_CONFLICT' USING ERRCODE = '22023';
   END IF;
   RETURN NEW;
 END IF;
 IF NOT ((OLD.status = 'PENDING' AND NEW.status IN ('ACCEPTED','CANCELLED'))
   OR (OLD.status = 'ACCEPTED' AND NEW.status IN ('PREPARING','CANCELLED'))
   OR (OLD.status = 'PREPARING' AND NEW.status IN ('READY','CANCELLED'))
   OR (OLD.status = 'READY' AND NEW.status IN ('OUT_FOR_DELIVERY','CANCELLED'))
   OR (OLD.status = 'OUT_FOR_DELIVERY' AND NEW.status IN ('DELIVERED','CANCELLED'))) THEN
   RAISE EXCEPTION 'STATUS_CONFLICT' USING ERRCODE = '22023';
 END IF;
 IF auth.uid() IS NOT NULL AND NOT coalesce(public.is_admin(), false) THEN
   IF public.my_restaurant_id() IS DISTINCT FROM OLD.restaurant_id
      AND NOT (is_customer AND OLD.status = 'PENDING' AND NEW.status = 'CANCELLED')
      AND NOT (is_customer AND OLD.status = 'OUT_FOR_DELIVERY' AND NEW.status = 'DELIVERED') THEN
     RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
   END IF;
 END IF;
 IF NEW.status = 'ACCEPTED' THEN NEW.accepted_at := coalesce(NEW.accepted_at, now()); END IF;
 IF NEW.status = 'CANCELLED' THEN
   IF is_customer AND public.my_restaurant_id() IS DISTINCT FROM OLD.restaurant_id THEN
     NEW.cancellation_reason := 'CUSTOMER';
   ELSIF NEW.cancellation_reason IS NULL THEN
     NEW.cancellation_reason := 'OTHER';
   END IF;
 ELSE
   NEW.cancellation_reason := NULL;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS orders_guard_transition_v2 ON public.orders;
CREATE TRIGGER orders_guard_transition_v2 BEFORE UPDATE OF status, cancellation_reason ON public.orders
 FOR EACH ROW EXECUTE FUNCTION public.guard_order_transition();

-- 3. Commandes fantômes. Une commande jamais confirmée est annulée après
--    `pending_after` ; une commande jamais clôturée l'est après `abandoned_after`
--    (l'index « une seule commande active » bloquerait sinon le client pour toujours).
DROP FUNCTION IF EXISTS public.expire_stale_orders(interval);
CREATE OR REPLACE FUNCTION public.expire_stale_orders(
  pending_after interval DEFAULT interval '20 minutes',
  abandoned_after interval DEFAULT interval '12 hours'
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE affected integer := 0; part integer;
BEGIN
 IF pending_after IS NULL OR pending_after < interval '20 minutes' OR pending_after > interval '24 hours'
    OR abandoned_after IS NULL OR abandoned_after < interval '2 hours' OR abandoned_after > interval '7 days' THEN
   RAISE EXCEPTION 'INVALID_EXPIRY' USING ERRCODE = '22023';
 END IF;
 UPDATE public.orders SET status = 'CANCELLED', cancellation_reason = 'NO_RESPONSE', updated_at = now()
  WHERE status = 'PENDING' AND created_at < now() - pending_after;
 GET DIAGNOSTICS part = ROW_COUNT; affected := affected + part;
 UPDATE public.orders SET status = 'CANCELLED', cancellation_reason = 'ABANDONED', updated_at = now()
  WHERE status NOT IN ('DELIVERED','CANCELLED') AND created_at < now() - abandoned_after;
 GET DIAGNOSTICS part = ROW_COUNT; affected := affected + part;
 RETURN affected;
END $$;
REVOKE ALL ON FUNCTION public.expire_stale_orders(interval, interval) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_stale_orders(interval, interval) TO service_role;

-- 4. Jobs planifiés — créés ici plutôt que « à la main », si pg_cron est activé.
--    Sans l'extension, la migration passe et verify_remote.sql le signale.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname IN ('naakul-expire-stale-orders', 'expire-stale-orders');
    PERFORM cron.schedule('naakul-expire-stale-orders', '*/5 * * * *', 'SELECT public.expire_stale_orders()');
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'noir-notification-retries') THEN
      PERFORM cron.schedule('noir-notification-retries', '* * * * *', 'SELECT public.dispatch_order_notifications()');
    END IF;
    RAISE NOTICE 'Jobs pg_cron planifiés.';
  ELSE
    RAISE NOTICE 'pg_cron absent : activer l''extension puis rejouer ce bloc.';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Planification pg_cron ignorée : %', SQLERRM;
END $$;

COMMIT;
