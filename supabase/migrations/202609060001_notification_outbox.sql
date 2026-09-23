-- Requires 202609050001_order_integrity.sql and the historical app_settings table.
BEGIN;
ALTER TABLE public.push_tokens ADD COLUMN IF NOT EXISTS progress_version integer NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS public.order_notification_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
 event_type text NOT NULL CHECK(event_type IN ('INSERT','UPDATE')),
 status text NOT NULL,
 order_updated_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 attempts integer NOT NULL DEFAULT 0,
 next_attempt_at timestamptz NOT NULL DEFAULT now(),
 locked_until timestamptz,
 dispatched_until timestamptz,
 claim_id uuid,
 push_sent boolean NOT NULL DEFAULT false,
 activity_sent boolean NOT NULL DEFAULT false,
 completed_at timestamptz,
 last_error text,
 UNIQUE(order_id, event_type, status, order_updated_at)
);
ALTER TABLE public.order_notification_events ADD COLUMN IF NOT EXISTS dispatched_until timestamptz;
ALTER TABLE public.order_notification_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.order_notification_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.order_notification_events TO service_role;
CREATE INDEX IF NOT EXISTS notification_due_idx ON public.order_notification_events(next_attempt_at) WHERE completed_at IS NULL;

CREATE TABLE IF NOT EXISTS public.order_push_receipts (
 id text PRIMARY KEY,
 event_id uuid NOT NULL REFERENCES public.order_notification_events(id) ON DELETE CASCADE,
 token text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 check_after timestamptz NOT NULL DEFAULT now()+interval '15 minutes',
 checked_at timestamptz,
 error text
);
ALTER TABLE public.order_push_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.order_push_receipts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.order_push_receipts TO service_role;

CREATE OR REPLACE FUNCTION public.claim_order_notification(event_id uuid)
RETURNS SETOF public.order_notification_events LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
 UPDATE order_notification_events SET attempts=attempts+1,
   locked_until=now()+interval '2 minutes', claim_id=gen_random_uuid(),
   next_attempt_at=now()+make_interval(secs => least(3600, 15 * power(2, least(attempts,8))::integer))
 WHERE id=event_id AND completed_at IS NULL AND next_attempt_at<=now()
   AND (locked_until IS NULL OR locked_until<now())
 RETURNING *
$$;
REVOKE ALL ON FUNCTION public.claim_order_notification(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_order_notification(uuid) TO service_role;

-- Dispatch is best effort; the durable row is never removed by an HTTP failure.
CREATE OR REPLACE FUNCTION public.dispatch_order_notifications()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE endpoint text; secret text; event record; dispatched integer := 0;
BEGIN
 SELECT value INTO endpoint FROM app_settings WHERE key='edge_url';
 SELECT value INTO secret FROM app_settings WHERE key='service_key';
 IF endpoint IS NULL OR secret IS NULL THEN RETURN 0; END IF;
 FOR event IN SELECT id FROM order_notification_events
   WHERE completed_at IS NULL AND next_attempt_at<=now()
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
 -- Receipts are checked independently from event delivery.
 BEGIN
   PERFORM net.http_post(url:=endpoint,
     headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||secret),
     body:='{"check_receipts":true}'::jsonb, timeout_milliseconds:=10000);
 EXCEPTION WHEN OTHERS THEN NULL;
 END;
 RETURN dispatched;
END $$;
REVOKE ALL ON FUNCTION public.dispatch_order_notifications() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_order_notifications() TO service_role;

CREATE OR REPLACE FUNCTION public.notify_order_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF TG_OP='UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
 INSERT INTO order_notification_events(order_id,event_type,status,order_updated_at)
 VALUES(NEW.id,TG_OP,NEW.status,coalesce(NEW.updated_at,now())) ON CONFLICT DO NOTHING;
 -- Keep the insert outside the exception handler: persistence is required.
 BEGIN
   PERFORM public.dispatch_order_notifications();
 EXCEPTION WHEN OTHERS THEN NULL;
 END;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS orders_notify_change ON public.orders;
CREATE TRIGGER orders_notify_change AFTER INSERT OR UPDATE OF status ON public.orders
 FOR EACH ROW EXECUTE FUNCTION public.notify_order_change();
COMMIT;

-- Mandatory scheduling in the deployment runbook, once pg_cron is available:
-- SELECT cron.schedule('noir-notification-retries','* * * * *',
--   'SELECT public.dispatch_order_notifications()');
-- Monitor completed_at IS NULL, attempts and last_error. Retain completed events
-- for the operational retention period; never purge pending rows automatically.
