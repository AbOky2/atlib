-- Run only against the disposable fixture, with ON_ERROR_STOP=1.
BEGIN;
INSERT INTO restaurants(id,name,is_active,is_accepting_orders) VALUES
 ('10000000-0000-4000-8000-000000000001','Test',true,true),
 ('10000000-0000-4000-8000-000000000002','Other',true,true);
INSERT INTO dishes(id,restaurant_id,name,price_xaf,is_available) VALUES
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Plat',3000,true),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','Autre',3000,true),
 ('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','Indisponible',3000,false);
INSERT INTO profiles(id,role,restaurant_id) VALUES
 ('30000000-0000-4000-8000-000000000001','customer',null),
 ('30000000-0000-4000-8000-000000000002','customer',null),
 ('30000000-0000-4000-8000-000000000003','restaurant','10000000-0000-4000-8000-000000000001');
CREATE FUNCTION pg_temp.payload() RETURNS jsonb LANGUAGE sql AS $$ SELECT '{
 "customer_id":"30000000-0000-4000-8000-000000000001",
 "client_request_id":"40000000-0000-4000-8000-000000000001",
 "restaurant_id":"10000000-0000-4000-8000-000000000001",
 "customer_name":"Test", "customer_phone":"+23566123456", "delivery_address":"Sabangali, portail test",
 "delivery_zone":"Sabangali", "payment_method":"cash", "subtotal_xaf":3000, "delivery_fee_xaf":1500, "total_xaf":5000,
 "cash_paid_with_xaf":10000,
 "items":[{"dish_id":"20000000-0000-4000-8000-000000000001","qty":1,"price_xaf":3000,"note":"Sans piment"}]
}'::jsonb $$;
CREATE FUNCTION pg_temp.reject(p jsonb, expected text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 BEGIN
  PERFORM public.create_order(p);
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> expected THEN RAISE EXCEPTION 'expected %, got %', expected, SQLERRM; END IF;
  RETURN;
 END;
 RAISE EXCEPTION 'unexpected success: %', expected;
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000001', true);
SELECT pg_temp.reject(jsonb_set(pg_temp.payload(),'{items,0,dish_id}','"20000000-0000-4000-8000-000000000002"'), 'ITEM_UNAVAILABLE');
SELECT pg_temp.reject(jsonb_set(pg_temp.payload(),'{items,0,dish_id}','"20000000-0000-4000-8000-000000000003"'), 'ITEM_UNAVAILABLE');
SELECT pg_temp.reject(jsonb_set(pg_temp.payload(),'{items,0,price_xaf}','1'), 'PRICE_CHANGED');
SELECT pg_temp.reject(jsonb_set(pg_temp.payload(),'{items,0,qty}','0'), 'INVALID_ITEMS');
SELECT pg_temp.reject(jsonb_set(pg_temp.payload(),'{items,0,options}','["Extra"]'), 'INVALID_ITEMS');
SELECT pg_temp.reject(jsonb_set(pg_temp.payload(),'{payment_method}','"card"'), 'INVALID_CHECKOUT');
SELECT pg_temp.reject(jsonb_set(pg_temp.payload(),'{delivery_zone}','"Paris"'), 'INVALID_ZONE');
SELECT pg_temp.reject(jsonb_set(pg_temp.payload(),'{cash_paid_with_xaf}','1000'), 'INSUFFICIENT_CASH');
DO $$ DECLARE a orders; b orders; BEGIN
 a := public.create_order(pg_temp.payload()); b := public.create_order(pg_temp.payload());
 IF a.id <> b.id OR a.total_xaf <> 5000 OR a.cash_paid_with_xaf <> 10000 OR a.eta_minutes <> 15 OR a.restaurant_name <> 'Test' THEN RAISE EXCEPTION 'bad order or retry'; END IF;
 IF (SELECT note FROM order_items WHERE order_id=a.id) <> 'Sans piment' THEN RAISE EXCEPTION 'lost note'; END IF;
 BEGIN UPDATE orders SET status='ACCEPTED' WHERE id=a.id; RAISE EXCEPTION 'customer accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN UPDATE orders SET total_xaf=1 WHERE id=a.id; RAISE EXCEPTION 'price writable'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM expire_stale_orders(interval '0'); RAISE EXCEPTION 'public expiry'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000002', true);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM orders) OR EXISTS(SELECT 1 FROM order_items) THEN RAISE EXCEPTION 'cross-account read'; END IF;
END $$;
-- A known request key must not disclose another customer's order.
DO $$ BEGIN
 BEGIN PERFORM create_order(jsonb_set(pg_temp.payload(),'{customer_id}','"30000000-0000-4000-8000-000000000002"')); RAISE EXCEPTION 'cross-account retry';
 EXCEPTION WHEN unique_violation THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000003', true);
UPDATE orders SET status='ACCEPTED';
DO $$ BEGIN
 BEGIN UPDATE orders SET status='DELIVERED'; RAISE EXCEPTION 'skipped phases'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END $$;
UPDATE orders SET status='PREPARING'; UPDATE orders SET status='READY'; UPDATE orders SET status='OUT_FOR_DELIVERY'; UPDATE orders SET status='DELIVERED';
DO $$ BEGIN
 BEGIN UPDATE orders SET status='PENDING'; RAISE EXCEPTION 'reopened terminal'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK;
