-- Run only against the disposable fixture, after order_integrity.sql, with ON_ERROR_STOP=1.
BEGIN;
-- Several live orders for ONE customer below, on purpose: the per-customer
-- active-order index is dropped inside this throwaway transaction only.
DROP INDEX IF EXISTS active;
INSERT INTO restaurants(id,name,is_active,is_accepting_orders) VALUES ('10000000-0000-4000-8000-000000000009','Cycle',true,true);
INSERT INTO profiles(id,role,restaurant_id) VALUES
 ('30000000-0000-4000-8000-000000000011','customer',null),
 ('30000000-0000-4000-8000-000000000012','restaurant','10000000-0000-4000-8000-000000000009');
INSERT INTO orders(id,restaurant_id,customer_id,status,delivery_address,delivery_fee_xaf,subtotal_xaf,total_xaf,payment_method,created_at) VALUES
 ('60000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000009','30000000-0000-4000-8000-000000000011','PENDING','a',1500,3000,5000,'cash',now()),
 ('60000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000009','30000000-0000-4000-8000-000000000011','PENDING','a',1500,3000,5000,'cash',now()-interval '30 minutes'),
 ('60000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000009','30000000-0000-4000-8000-000000000011','OUT_FOR_DELIVERY','a',1500,3000,5000,'cash',now()-interval '13 hours'),
 ('60000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000009','30000000-0000-4000-8000-000000000011','OUT_FOR_DELIVERY','a',1500,3000,5000,'cash',now());

-- Restaurant cancels with a reason; an invalid reason is refused; a reason cannot be set on a live order.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000012', true);
DO $$ BEGIN
 BEGIN UPDATE orders SET cancellation_reason='OTHER' WHERE id='60000000-0000-4000-8000-000000000001'; RAISE EXCEPTION 'reason on live order';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'STATUS_CONFLICT' THEN RAISE; END IF; END;
 BEGIN UPDATE orders SET status='CANCELLED', cancellation_reason='BAD' WHERE id='60000000-0000-4000-8000-000000000001'; RAISE EXCEPTION 'bad reason accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 UPDATE orders SET status='CANCELLED', cancellation_reason='OUT_OF_STOCK' WHERE id='60000000-0000-4000-8000-000000000001';
 IF (SELECT cancellation_reason FROM orders WHERE id='60000000-0000-4000-8000-000000000001') <> 'OUT_OF_STOCK' THEN RAISE EXCEPTION 'reason lost'; END IF;
 -- Delivery in progress may be cancelled (customer unreachable).
 UPDATE orders SET status='CANCELLED', cancellation_reason='CUSTOMER_UNREACHABLE' WHERE id='60000000-0000-4000-8000-000000000004';
 -- A restaurant cancelling without a reason gets OTHER, never NULL.
 UPDATE orders SET status='ACCEPTED' WHERE id='60000000-0000-4000-8000-000000000002';
 IF (SELECT accepted_at FROM orders WHERE id='60000000-0000-4000-8000-000000000002') IS NULL THEN RAISE EXCEPTION 'accepted_at not stamped'; END IF;
 UPDATE orders SET status='CANCELLED' WHERE id='60000000-0000-4000-8000-000000000002';
 IF (SELECT cancellation_reason FROM orders WHERE id='60000000-0000-4000-8000-000000000002') <> 'OTHER' THEN RAISE EXCEPTION 'default reason missing'; END IF;
END $$;
ROLLBACK;

BEGIN;
INSERT INTO restaurants(id,name,is_active,is_accepting_orders) VALUES ('10000000-0000-4000-8000-000000000009','Cycle',true,true);
INSERT INTO profiles(id,role,restaurant_id) VALUES
 ('30000000-0000-4000-8000-000000000011','customer',null),
 ('30000000-0000-4000-8000-000000000012','restaurant','10000000-0000-4000-8000-000000000009');
INSERT INTO orders(id,restaurant_id,customer_id,status,delivery_address,delivery_fee_xaf,subtotal_xaf,total_xaf,payment_method,created_at) VALUES
 ('60000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000009','30000000-0000-4000-8000-000000000011','PENDING','a',1500,3000,5000,'cash',now());
-- Customer cancels while pending: the reason is forced to CUSTOMER whatever was sent.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000011', true);
UPDATE orders SET status='CANCELLED', cancellation_reason='OUT_OF_STOCK' WHERE id='60000000-0000-4000-8000-000000000005';
DO $$ BEGIN IF (SELECT cancellation_reason FROM orders WHERE id='60000000-0000-4000-8000-000000000005') <> 'CUSTOMER' THEN RAISE EXCEPTION 'customer reason not forced'; END IF; END $$;
ROLLBACK;

BEGIN;
INSERT INTO restaurants(id,name,is_active,is_accepting_orders) VALUES ('10000000-0000-4000-8000-000000000009','Cycle',true,true);
INSERT INTO profiles(id,role,restaurant_id) VALUES ('30000000-0000-4000-8000-000000000011','customer',null);
INSERT INTO orders(id,restaurant_id,customer_id,status,delivery_address,delivery_fee_xaf,subtotal_xaf,total_xaf,payment_method,created_at) VALUES
 ('60000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000009','30000000-0000-4000-8000-000000000011','OUT_FOR_DELIVERY','a',1500,3000,5000,'cash',now());
-- Customer confirms reception, but may not cancel a delivery in progress.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000011', true);
DO $$ BEGIN
 BEGIN UPDATE orders SET status='CANCELLED' WHERE id='60000000-0000-4000-8000-000000000006'; RAISE EXCEPTION 'customer cancelled a delivery';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 UPDATE orders SET status='DELIVERED' WHERE id='60000000-0000-4000-8000-000000000006';
 IF (SELECT status FROM orders WHERE id='60000000-0000-4000-8000-000000000006') <> 'DELIVERED' THEN RAISE EXCEPTION 'reception not confirmed'; END IF;
END $$;
ROLLBACK;

BEGIN;
-- The sweep: an unconfirmed order after 20 min, an unclosed one after 12 h; nothing else.
INSERT INTO restaurants(id,name,is_active,is_accepting_orders) VALUES ('10000000-0000-4000-8000-000000000009','Cycle',true,true);
INSERT INTO orders(id,restaurant_id,customer_id,status,delivery_address,delivery_fee_xaf,subtotal_xaf,total_xaf,payment_method,created_at) VALUES
 ('60000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000009','30000000-0000-4000-8000-000000000021','PENDING','a',1500,3000,5000,'cash',now()-interval '25 minutes'),
 ('60000000-0000-4000-8000-000000000008','10000000-0000-4000-8000-000000000009','30000000-0000-4000-8000-000000000022','PENDING','a',1500,3000,5000,'cash',now()-interval '5 minutes'),
 ('60000000-0000-4000-8000-000000000009','10000000-0000-4000-8000-000000000009','30000000-0000-4000-8000-000000000023','OUT_FOR_DELIVERY','a',1500,3000,5000,'cash',now()-interval '13 hours'),
 ('60000000-0000-4000-8000-00000000000a','10000000-0000-4000-8000-000000000009','30000000-0000-4000-8000-000000000024','PREPARING','a',1500,3000,5000,'cash',now()-interval '1 hour');
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN PERFORM expire_stale_orders(); RAISE EXCEPTION 'public expiry'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET LOCAL ROLE service_role;
DO $$ BEGIN
 BEGIN PERFORM expire_stale_orders(interval '1 minute'); RAISE EXCEPTION 'too aggressive expiry accepted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'INVALID_EXPIRY' THEN RAISE; END IF; END;
 IF expire_stale_orders() <> 2 THEN RAISE EXCEPTION 'sweep count'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF (SELECT status||'/'||cancellation_reason FROM orders WHERE id='60000000-0000-4000-8000-000000000007') <> 'CANCELLED/NO_RESPONSE' THEN RAISE EXCEPTION 'stale pending not expired'; END IF;
 IF (SELECT status FROM orders WHERE id='60000000-0000-4000-8000-000000000008') <> 'PENDING' THEN RAISE EXCEPTION 'fresh pending expired'; END IF;
 IF (SELECT status||'/'||cancellation_reason FROM orders WHERE id='60000000-0000-4000-8000-000000000009') <> 'CANCELLED/ABANDONED' THEN RAISE EXCEPTION 'abandoned not closed'; END IF;
 IF (SELECT status FROM orders WHERE id='60000000-0000-4000-8000-00000000000a') <> 'PREPARING' THEN RAISE EXCEPTION 'live order closed too early'; END IF;
END $$;
ROLLBACK;
