-- Disposable local test database only. Never run on hosted Supabase.
-- A stub pg_net records outgoing calls instead of using the network.
BEGIN;
CREATE SCHEMA net;
CREATE TABLE net.calls(body jsonb);
CREATE FUNCTION net.http_post(url text, headers jsonb, body jsonb, timeout_milliseconds integer)
RETURNS bigint LANGUAGE sql AS $$ INSERT INTO net.calls VALUES (body) RETURNING 1::bigint $$;
INSERT INTO app_settings(key,value) VALUES ('edge_url','https://example.invalid'),('service_key','fixture-only');

-- Order writes dispatch their own event but never fan out a receipt check.
INSERT INTO orders(id,status,updated_at) VALUES ('50000000-0000-4000-8000-000000000003','PENDING',now());
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM net.calls WHERE body ? 'event_id') THEN RAISE EXCEPTION 'write path did not dispatch its event'; END IF;
 IF EXISTS (SELECT 1 FROM net.calls WHERE body ? 'check_receipts') THEN RAISE EXCEPTION 'every order write triggers a receipt check'; END IF;
END $$;
-- The scheduled job (same statement as the runbook) still checks receipts.
SELECT public.dispatch_order_notifications();
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM net.calls WHERE body ? 'check_receipts') THEN RAISE EXCEPTION 'scheduled job no longer checks receipts'; END IF;
END $$;

-- A poison event is retried a bounded number of times, then dead-lettered visibly.
UPDATE order_notification_events SET attempts=10, next_attempt_at=now()-interval '1 second',
  locked_until=NULL, dispatched_until=NULL, completed_at=NULL, last_error='InvalidCredentials';
DO $$ DECLARE event uuid; BEGIN
 SELECT id INTO event FROM order_notification_events LIMIT 1;
 IF EXISTS (SELECT * FROM claim_order_notification(event)) THEN RAISE EXCEPTION 'poison event is claimed forever'; END IF;
END $$;
SELECT public.dispatch_order_notifications();
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM order_notification_events WHERE completed_at IS NULL) THEN RAISE EXCEPTION 'poison event never leaves the queue'; END IF;
 IF NOT EXISTS (SELECT 1 FROM order_notification_events WHERE failed_at IS NOT NULL AND last_error LIKE 'InvalidCredentials%') THEN
   RAISE EXCEPTION 'dead-lettered event lost its failure cause'; END IF;
END $$;

-- RLS helpers are evaluated once per statement, not once per row.
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname='orders_scope_guard'
   AND (qual !~ 'SELECT auth\.uid\(\)' OR qual !~ 'SELECT my_restaurant_id\(\)')) THEN
   RAISE EXCEPTION 'orders_scope_guard re-evaluates auth helpers per row'; END IF;
END $$;
ROLLBACK;
