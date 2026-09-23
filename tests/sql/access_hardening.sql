-- Run only against the disposable fixture, after order_integrity.sql, with ON_ERROR_STOP=1.
BEGIN;
INSERT INTO restaurants(id,name,is_active,is_accepting_orders,rating) VALUES ('10000000-0000-4000-8000-000000000031','Droits',true,true,4);
INSERT INTO profiles(id,role,restaurant_id) VALUES ('30000000-0000-4000-8000-000000000031','restaurant','10000000-0000-4000-8000-000000000031');
INSERT INTO orders(id,restaurant_id,customer_id,status,delivery_address,delivery_fee_xaf,subtotal_xaf,total_xaf,payment_method) VALUES
 ('70000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000031','30000000-0000-4000-8000-000000000032','PENDING','a',1500,3000,5000,'cash');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000031', true);
DO $$ BEGIN
 UPDATE restaurants SET is_accepting_orders=false, description='Fermé ce soir' WHERE id='10000000-0000-4000-8000-000000000031';
 BEGIN UPDATE restaurants SET rating=5 WHERE id='10000000-0000-4000-8000-000000000031'; RAISE EXCEPTION 'restaurant changed its own rating';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN UPDATE restaurants SET is_active=false WHERE id='10000000-0000-4000-8000-000000000031'; RAISE EXCEPTION 'restaurant changed its activation';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN PERFORM * FROM orders; RAISE EXCEPTION 'anon reads orders'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM * FROM order_items; RAISE EXCEPTION 'anon reads order items'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK;
