BEGIN;
INSERT INTO restaurants(id,name) VALUES ('10000000-0000-4000-8000-000000000001','Test');
INSERT INTO orders(id,restaurant_id,customer_id,status,updated_at) VALUES
 ('50000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','PENDING',now());
DO $$ BEGIN
 IF (SELECT count(*) FROM order_notification_events) <> 1 THEN RAISE EXCEPTION 'event lost without HTTP configuration'; END IF;
END $$;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN PERFORM claim_order_notification(gen_random_uuid()); RAISE EXCEPTION 'client may claim'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM * FROM order_notification_events; RAISE EXCEPTION 'client sees queue'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET LOCAL ROLE service_role;
DO $$ DECLARE event uuid; first_claim uuid; next_claim uuid; count integer; BEGIN
 SELECT id INTO event FROM order_notification_events LIMIT 1;
 SELECT claim_id INTO first_claim FROM claim_order_notification(event);
 IF first_claim IS NULL THEN RAISE EXCEPTION 'first claim missing'; END IF;
 IF EXISTS(SELECT * FROM claim_order_notification(event)) THEN RAISE EXCEPTION 'double claim allowed'; END IF;
 UPDATE order_notification_events SET locked_until=now()-interval '1 second',next_attempt_at=now() WHERE id=event;
 SELECT claim_id INTO next_claim FROM claim_order_notification(event);
 IF next_claim=first_claim OR next_claim IS NULL THEN RAISE EXCEPTION 'expired lease not renewed'; END IF;
 UPDATE order_notification_events SET completed_at=now() WHERE id=event AND claim_id=first_claim;
 GET DIAGNOSTICS count=ROW_COUNT;
 IF count<>0 THEN RAISE EXCEPTION 'old worker may acknowledge'; END IF;
 UPDATE order_notification_events SET completed_at=now() WHERE id=event AND claim_id=next_claim;
 IF EXISTS(SELECT * FROM claim_order_notification(event)) THEN RAISE EXCEPTION 'completed event reclaimed'; END IF;
 IF (SELECT attempts FROM order_notification_events WHERE id=event)<>2 THEN RAISE EXCEPTION 'bad attempts'; END IF;
END $$;
RESET ROLE;
ROLLBACK;

-- HTTP dispatch failure also preserves the queued event.
BEGIN;
INSERT INTO orders(id,status,updated_at) VALUES ('50000000-0000-4000-8000-000000000002','PENDING',now());
INSERT INTO app_settings(key,value) VALUES ('edge_url','https://example.invalid'),('service_key','fixture-only');
-- No pg_net extension exists in this disposable fixture, so no network is used.
SELECT public.dispatch_order_notifications();
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM order_notification_events WHERE last_error='dispatch unavailable' AND completed_at IS NULL AND next_attempt_at>now()) THEN
 RAISE EXCEPTION 'failed dispatch lost its retry'; END IF;
END $$;
ROLLBACK;
