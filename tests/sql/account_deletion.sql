-- Run only against the disposable fixture, with ON_ERROR_STOP=1.
BEGIN;
INSERT INTO restaurants(id,name,is_active,is_accepting_orders) VALUES ('10000000-0000-4000-8000-000000000001','Test',true,true);
INSERT INTO profiles(id,role,restaurant_id) VALUES
 ('30000000-0000-4000-8000-000000000001','customer',null),
 ('30000000-0000-4000-8000-000000000002','customer',null),
 ('30000000-0000-4000-8000-000000000003','restaurant','10000000-0000-4000-8000-000000000001');
INSERT INTO orders(id,restaurant_id,customer_id,customer_name,customer_phone,delivery_address,delivery_note,status,delivery_fee_xaf,subtotal_xaf,total_xaf,payment_method) VALUES
 ('50000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Ali','+23566123456','Sabangali, portail vert','Sonner 2 fois','DELIVERED',1500,3000,5000,'cash'),
 ('50000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002','Bilal','+23566000000','Moursal','','PREPARING',1500,3000,5000,'cash');
INSERT INTO order_items(order_id,name,qty,price_xaf,note) VALUES ('50000000-0000-4000-8000-000000000001','Plat',1,3000,'Sans piment');
INSERT INTO push_tokens(token,user_id,platform) VALUES ('ExponentPushToken[a]','30000000-0000-4000-8000-000000000001','ios');
INSERT INTO live_activity_tokens(order_id,token) VALUES ('50000000-0000-4000-8000-000000000001','la-token');

-- A customer asks what blocks deletion.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000001', true);
DO $$ BEGIN
 IF account_deletion_blocker() IS NOT NULL THEN RAISE EXCEPTION 'customer without live order should be deletable'; END IF;
 BEGIN PERFORM erase_customer_data('30000000-0000-4000-8000-000000000001'); RAISE EXCEPTION 'client may erase'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000002', true);
DO $$ BEGIN IF account_deletion_blocker() <> 'ACTIVE_ORDER' THEN RAISE EXCEPTION 'live order must block'; END IF; END $$;
SELECT set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000003', true);
DO $$ BEGIN IF account_deletion_blocker() <> 'STAFF_ACCOUNT' THEN RAISE EXCEPTION 'staff must block'; END IF; END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN PERFORM account_deletion_blocker(); RAISE EXCEPTION 'anon may call'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;

-- The server erases, orders survive anonymised, the restaurant still sees them.
SET LOCAL ROLE service_role;
DO $$ BEGIN
 BEGIN PERFORM erase_customer_data('30000000-0000-4000-8000-000000000002'); RAISE EXCEPTION 'erased despite live order';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'ACTIVE_ORDER' THEN RAISE; END IF; END;
 BEGIN PERFORM erase_customer_data('30000000-0000-4000-8000-000000000003'); RAISE EXCEPTION 'erased staff';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'STAFF_ACCOUNT' THEN RAISE; END IF; END;
 PERFORM erase_customer_data('30000000-0000-4000-8000-000000000001');
 PERFORM erase_customer_data('30000000-0000-4000-8000-000000000001'); -- idempotent
END $$;
RESET ROLE;
-- Verified as the table owner: the fixture grants service_role no direct table access.
DO $$ DECLARE o orders; BEGIN
 SELECT * INTO o FROM orders WHERE id='50000000-0000-4000-8000-000000000001';
 IF o.customer_id IS NOT NULL OR o.customer_phone IS NOT NULL OR o.customer_name <> 'Compte supprimé' OR o.delivery_address <> 'Adresse supprimée' OR o.delivery_note IS NOT NULL THEN
   RAISE EXCEPTION 'personal data left on order: %', to_jsonb(o); END IF;
 IF o.total_xaf <> 5000 OR o.status <> 'DELIVERED' OR o.restaurant_id IS NULL THEN RAISE EXCEPTION 'accounting fields damaged'; END IF;
 IF (SELECT note FROM order_items WHERE order_id=o.id) IS NOT NULL THEN RAISE EXCEPTION 'item note left'; END IF;
 IF EXISTS(SELECT 1 FROM push_tokens WHERE user_id='30000000-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'push token left'; END IF;
 IF EXISTS(SELECT 1 FROM live_activity_tokens WHERE order_id=o.id) THEN RAISE EXCEPTION 'activity token left'; END IF;
 IF EXISTS(SELECT 1 FROM profiles WHERE id='30000000-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'profile left'; END IF;
 -- The other customer is untouched.
 IF (SELECT customer_name FROM orders WHERE id='50000000-0000-4000-8000-000000000002') <> 'Bilal' THEN RAISE EXCEPTION 'wrong customer erased'; END IF;
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000003', true);
DO $$ BEGIN
 IF (SELECT count(*) FROM orders WHERE restaurant_id='10000000-0000-4000-8000-000000000001') <> 2 THEN RAISE EXCEPTION 'restaurant lost its history'; END IF;
END $$;
ROLLBACK;
