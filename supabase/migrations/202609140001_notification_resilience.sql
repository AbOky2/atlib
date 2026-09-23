-- Requires 202609060001_notification_outbox.sql. Apply once; the cron statement
-- of the runbook (SELECT public.dispatch_order_notifications()) stays unchanged.
BEGIN;

-- Dead letter: an event that keeps failing leaves the queue with its cause kept.
ALTER TABLE public.order_notification_events ADD COLUMN IF NOT EXISTS failed_at timestamptz;

-- Receipt checks and the served-device lookup of notify-order.
CREATE INDEX IF NOT EXISTS order_push_receipts_due_idx ON public.order_push_receipts(check_after) WHERE checked_at IS NULL;
CREATE INDEX IF NOT EXISTS order_push_receipts_event_idx ON public.order_push_receipts(event_id);

-- Ten attempts of capped exponential backoff span about three hours; a status
-- notification older than that has no value left, retrying it only adds noise.
CREATE OR REPLACE FUNCTION public.claim_order_notification(event_id uuid)
RETURNS SETOF public.order_notification_events LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
 UPDATE order_notification_events SET attempts=attempts+1,
   locked_until=now()+interval '2 minutes', claim_id=gen_random_uuid(),
   next_attempt_at=now()+make_interval(secs => least(3600, 15 * power(2, least(attempts,8))::integer))
 WHERE id=event_id AND completed_at IS NULL AND next_attempt_at<=now() AND attempts<10
   AND (locked_until IS NULL OR locked_until<now())
 RETURNING *
$$;
REVOKE ALL ON FUNCTION public.claim_order_notification(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_order_notification(uuid) TO service_role;

-- `maintenance` is the scheduled job: dead letters and receipt checks. Order
-- writes only dispatch pending events, so a burst of status changes no longer
-- fans out one receipt check per write.
DROP FUNCTION IF EXISTS public.dispatch_order_notifications();
CREATE FUNCTION public.dispatch_order_notifications(maintenance boolean DEFAULT true)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE endpoint text; secret text; event record; dispatched integer := 0;
BEGIN
 IF maintenance THEN
   UPDATE order_notification_events SET completed_at=now(), failed_at=now(), locked_until=NULL
   WHERE completed_at IS NULL AND attempts>=10 AND (locked_until IS NULL OR locked_until<now());
 END IF;
 SELECT value INTO endpoint FROM app_settings WHERE key='edge_url';
 SELECT value INTO secret FROM app_settings WHERE key='service_key';
 IF endpoint IS NULL OR secret IS NULL THEN RETURN 0; END IF;
 FOR event IN SELECT id FROM order_notification_events
   WHERE completed_at IS NULL AND next_attempt_at<=now() AND attempts<10
     AND (locked_until IS NULL OR locked_until<now())
     AND (dispatched_until IS NULL OR dispatched_until<now())
   ORDER BY next_attempt_at LIMIT 50 FOR UPDATE SKIP LOCKED LOOP
   BEGIN
     PERFORM net.http_post(url:=endpoint,
       headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||secret),
       body:=jsonb_build_object('event_id',event.id), timeout_milliseconds:=10000);
     UPDATE order_notification_events SET dispatched_until=now()+interval '1 minute' WHERE id=event.id;
     dispatched := dispatched+1;
   EXCEPTION WHEN OTHERS THEN
     UPDATE order_notification_events SET last_error='dispatch unavailable', next_attempt_at=now()+interval '1 minute' WHERE id=event.id;
   END;
 END LOOP;
 IF maintenance THEN
   BEGIN
     PERFORM net.http_post(url:=endpoint,
       headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||secret),
       body:='{"check_receipts":true}'::jsonb, timeout_milliseconds:=10000);
   EXCEPTION WHEN OTHERS THEN NULL;
   END;
 END IF;
 RETURN dispatched;
END $$;
REVOKE ALL ON FUNCTION public.dispatch_order_notifications(boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_order_notifications(boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.notify_order_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF TG_OP='UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
 INSERT INTO order_notification_events(order_id,event_type,status,order_updated_at)
 VALUES(NEW.id,TG_OP,NEW.status,coalesce(NEW.updated_at,now())) ON CONFLICT DO NOTHING;
 -- Keep the insert outside the exception handler: persistence is required.
 BEGIN
   PERFORM public.dispatch_order_notifications(false);
 EXCEPTION WHEN OTHERS THEN NULL;
 END;
 RETURN NEW;
END $$;

-- Scalar sub-selects let the planner evaluate the helpers once per statement
-- instead of once per scanned row (restaurant queues, order history).
DROP POLICY IF EXISTS orders_scope_guard ON public.orders;
CREATE POLICY orders_scope_guard ON public.orders AS RESTRICTIVE TO authenticated
 USING (customer_id = (SELECT auth.uid()) OR restaurant_id = (SELECT public.my_restaurant_id()) OR (SELECT public.is_admin()))
 WITH CHECK (customer_id = (SELECT auth.uid()) OR restaurant_id = (SELECT public.my_restaurant_id()) OR (SELECT public.is_admin()));
COMMIT;
