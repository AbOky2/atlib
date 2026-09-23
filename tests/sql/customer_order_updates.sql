-- Run after customer_update_setup.sql and 202609230004_customer_order_updates.sql, with ON_ERROR_STOP=1.
BEGIN;
SET LOCAL ROLE authenticated;
-- Client 51 : annuler sa commande en attente — une ligne, motif CUSTOMER posé par le déclencheur.
SELECT set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000051', true);
DO $$ DECLARE n int; BEGIN
 UPDATE orders SET status='CANCELLED' WHERE id='80000000-0000-4000-8000-000000000001' AND status='PENDING';
 GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'customer could not cancel a pending order (% rows)', n; END IF;
 IF (SELECT cancellation_reason FROM orders WHERE id='80000000-0000-4000-8000-000000000001') <> 'CUSTOMER' THEN RAISE EXCEPTION 'reason not CUSTOMER'; END IF;
 -- La commande d'un autre client reste hors de portée : zéro ligne, pas d'erreur.
 UPDATE orders SET status='CANCELLED' WHERE id='80000000-0000-4000-8000-000000000004';
 GET DIAGNOSTICS n = ROW_COUNT; IF n <> 0 THEN RAISE EXCEPTION 'customer touched another customer''s order'; END IF;
END $$;
-- Client 53 : une commande déjà acceptée n'est plus annulable — zéro ligne.
SELECT set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000053', true);
DO $$ DECLARE n int; BEGIN
 UPDATE orders SET status='CANCELLED' WHERE id='80000000-0000-4000-8000-000000000002' AND status='ACCEPTED';
 GET DIAGNOSTICS n = ROW_COUNT; IF n <> 0 THEN RAISE EXCEPTION 'customer cancelled an accepted order'; END IF;
END $$;
-- Client 54 : confirmer la réception.
SELECT set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000054', true);
DO $$ DECLARE n int; BEGIN
 UPDATE orders SET status='DELIVERED' WHERE id='80000000-0000-4000-8000-000000000003' AND status='OUT_FOR_DELIVERY';
 GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'customer could not confirm reception (% rows)', n; END IF;
END $$;
RESET ROLE;
ROLLBACK;
