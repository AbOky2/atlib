-- Apply AFTER supabase_production.sql and supabase_notifications.sql.
-- Never replay the legacy scripts after this versioned migration.
BEGIN;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS note text;
CREATE OR REPLACE FUNCTION public.create_order(payload jsonb)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_customer_id uuid := (payload->>'customer_id')::uuid;
    v_request_id  uuid := NULLIF(payload->>'client_request_id', '')::uuid;
    v_delivery_fee int := 1500;  -- = DELIVERY_FEE_XAF (src/lib/pricing.ts)
    v_service_fee  int := 500;   -- = SERVICE_FEE_XAF
    v_subtotal     int;
    v_total        int;
    v_cash         int := NULLIF(payload->>'cash_paid_with_xaf', '')::int;
    v_order        public.orders;
    v_restaurant public.restaurants;
    v_item jsonb;
    v_dish public.dishes;
    v_eta int;
BEGIN
    IF auth.uid() IS NULL OR v_customer_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
    END IF;
    IF v_request_id IS NULL THEN RAISE EXCEPTION 'REQUEST_ID_REQUIRED' USING ERRCODE = '22023'; END IF;
    -- Serialize retries for this customer before checking the unique indexes.
    PERFORM pg_advisory_xact_lock(hashtextextended(v_customer_id::text, 0));
    SELECT * INTO v_order FROM orders
      WHERE client_request_id = v_request_id AND customer_id = auth.uid();
    IF FOUND THEN RETURN v_order; END IF;

    SELECT * INTO v_restaurant FROM restaurants
      WHERE id = (payload->>'restaurant_id')::uuid FOR SHARE;
    IF NOT FOUND OR v_restaurant.is_active IS NOT TRUE OR v_restaurant.is_accepting_orders IS NOT TRUE THEN
        RAISE EXCEPTION 'RESTAURANT_CLOSED' USING ERRCODE = '22023';
    END IF;
    IF payload->>'payment_method' IS DISTINCT FROM 'cash'
      OR coalesce(payload->>'customer_phone', '') !~ '^\+235[0-9]{8}$'
      OR length(trim(coalesce(payload->>'customer_name', ''))) NOT BETWEEN 1 AND 120
      OR length(trim(coalesce(payload->>'delivery_address', ''))) NOT BETWEEN 5 AND 500
      OR length(coalesce(payload->>'delivery_note', '')) > 500 THEN
        RAISE EXCEPTION 'INVALID_CHECKOUT' USING ERRCODE = '22023';
    END IF;
    v_eta := CASE payload->>'delivery_zone'
      WHEN 'Sabangali' THEN 15 WHEN 'Moursal' THEN 20 WHEN 'Farcha' THEN 35
      WHEN 'N''Djari' THEN 30 WHEN 'Chagoua' THEN 25 WHEN 'Gassi' THEN 45
      WHEN 'Ambatta' THEN 30 WHEN 'Diguel' THEN 40 WHEN 'Walya' THEN 45 WHEN 'Klémat' THEN 10 END;
    IF v_eta IS NULL THEN RAISE EXCEPTION 'INVALID_ZONE' USING ERRCODE = '22023'; END IF;
    IF jsonb_typeof(payload->'items') IS DISTINCT FROM 'array' THEN
        RAISE EXCEPTION 'INVALID_ITEMS' USING ERRCODE = '22023';
    END IF;
    IF jsonb_array_length(payload->'items') NOT BETWEEN 1 AND 100 THEN
        RAISE EXCEPTION 'INVALID_ITEMS' USING ERRCODE = '22023';
    END IF;
    v_subtotal := 0;
    -- Stable locking order avoids deadlocks between simultaneous baskets.
    FOR v_item IN SELECT value FROM jsonb_array_elements(payload->'items') ORDER BY value->>'dish_id' LOOP
        IF coalesce(v_item->>'qty', '') !~ '^[0-9]{1,2}$'
          OR (v_item->>'qty')::int NOT BETWEEN 1 AND 99
          OR length(coalesce(v_item->>'note', '')) > 160
          OR (v_item ? 'options' AND v_item->'options' NOT IN ('[]'::jsonb, 'null'::jsonb)) THEN
            RAISE EXCEPTION 'INVALID_ITEMS' USING ERRCODE = '22023';
        END IF;
        SELECT * INTO v_dish FROM dishes WHERE id = (v_item->>'dish_id')::uuid FOR SHARE;
        IF NOT FOUND OR v_dish.restaurant_id IS DISTINCT FROM v_restaurant.id OR v_dish.is_available IS NOT TRUE THEN
            RAISE EXCEPTION 'ITEM_UNAVAILABLE' USING ERRCODE = '22023';
        END IF;
        IF (v_item->>'price_xaf')::int IS DISTINCT FROM v_dish.price_xaf THEN
            RAISE EXCEPTION 'PRICE_CHANGED' USING ERRCODE = '22023';
        END IF;
        v_subtotal := v_subtotal + v_dish.price_xaf * (v_item->>'qty')::int;
    END LOOP;
    v_total := v_subtotal + v_delivery_fee + v_service_fee;
    IF (payload->>'total_xaf')::int IS DISTINCT FROM v_total
      OR (payload->>'subtotal_xaf')::int IS DISTINCT FROM v_subtotal
      OR (payload->>'delivery_fee_xaf')::int IS DISTINCT FROM v_delivery_fee THEN
        RAISE EXCEPTION 'PRICE_CHANGED' USING ERRCODE = '22023';
    END IF;
    IF v_cash IS NOT NULL AND v_cash < v_total THEN
        RAISE EXCEPTION 'INSUFFICIENT_CASH' USING ERRCODE = '22023';
    END IF;

    INSERT INTO orders (
        customer_id, customer_name, customer_phone,
        restaurant_id, restaurant_name,
        delivery_address, delivery_zone, delivery_note,
        delivery_lat, delivery_lng,
        subtotal_xaf, delivery_fee_xaf, total_xaf,
        payment_method, status, client_request_id,
        cash_paid_with_xaf, eta_minutes
    ) VALUES (
        v_customer_id,
        payload->>'customer_name',
        payload->>'customer_phone',
        (payload->>'restaurant_id')::uuid,
        v_restaurant.name,
        payload->>'delivery_address',
        payload->>'delivery_zone',
        payload->>'delivery_note',
        NULLIF(payload->>'delivery_lat', '')::double precision,
        NULLIF(payload->>'delivery_lng', '')::double precision,
        v_subtotal,
        v_delivery_fee,
        v_total,
        COALESCE(payload->>'payment_method', 'cash'),
        'PENDING',
        v_request_id,
        v_cash,
        v_eta
    )
    RETURNING * INTO v_order;
    -- L'index partiel `one_active_order_per_customer` fait échouer cet INSERT
    -- en 23505 si une commande active existe déjà → mappé côté client sur
    -- ACTIVE_ORDER_EXISTS.

    INSERT INTO order_items (order_id, dish_id, name, qty, price_xaf, note)
    SELECT
        v_order.id,
        d.id,
        d.name,
        LEAST(GREATEST((i->>'qty')::int, 1), 99),
        d.price_xaf,
        NULLIF(trim(i->>'note'), '')
    FROM jsonb_array_elements(payload->'items') AS i
    JOIN dishes d ON d.id = (i->>'dish_id')::uuid;

    RETURN v_order;
END $$;

REVOKE ALL ON FUNCTION public.create_order(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_order(jsonb) TO authenticated;


-- Clients create atomically through create_order. Updates expose status only;
-- this also prevents customers changing prices/ownership through the REST API.
REVOKE INSERT, DELETE, UPDATE ON public.orders FROM PUBLIC, anon, authenticated;
REVOKE INSERT, DELETE, UPDATE ON public.order_items FROM PUBLIC, anon, authenticated;
GRANT UPDATE(status) ON public.orders TO authenticated;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS orders_scope_guard ON public.orders;
CREATE POLICY orders_scope_guard ON public.orders AS RESTRICTIVE TO authenticated
 USING (customer_id = auth.uid() OR restaurant_id = public.my_restaurant_id() OR public.is_admin())
 WITH CHECK (customer_id = auth.uid() OR restaurant_id = public.my_restaurant_id() OR public.is_admin());
DROP POLICY IF EXISTS items_scope_guard ON public.order_items;
CREATE POLICY items_scope_guard ON public.order_items AS RESTRICTIVE TO authenticated
 USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id));

CREATE OR REPLACE FUNCTION public.guard_order_transition()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
 IF NOT ((OLD.status = 'PENDING' AND NEW.status IN ('ACCEPTED','CANCELLED'))
   OR (OLD.status = 'ACCEPTED' AND NEW.status IN ('PREPARING','CANCELLED'))
   OR (OLD.status = 'PREPARING' AND NEW.status IN ('READY','CANCELLED'))
   OR (OLD.status = 'READY' AND NEW.status IN ('OUT_FOR_DELIVERY','CANCELLED'))
   OR (OLD.status = 'OUT_FOR_DELIVERY' AND NEW.status = 'DELIVERED')) THEN
   RAISE EXCEPTION 'STATUS_CONFLICT' USING ERRCODE = '22023';
 END IF;
 IF auth.uid() IS NOT NULL AND NOT coalesce(public.is_admin(), false) THEN
   IF public.my_restaurant_id() IS DISTINCT FROM OLD.restaurant_id
      AND NOT (auth.uid() = OLD.customer_id AND OLD.status = 'PENDING' AND NEW.status = 'CANCELLED') THEN
     RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
   END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS orders_guard_transition_v2 ON public.orders;
CREATE TRIGGER orders_guard_transition_v2 BEFORE UPDATE OF status ON public.orders
 FOR EACH ROW EXECUTE FUNCTION public.guard_order_transition();

CREATE OR REPLACE FUNCTION public.expire_stale_orders(max_age interval DEFAULT interval '20 minutes')
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE affected integer;
BEGIN
 IF max_age IS NULL OR max_age < interval '20 minutes' OR max_age > interval '24 hours' THEN
   RAISE EXCEPTION 'INVALID_EXPIRY' USING ERRCODE = '22023';
 END IF;
 UPDATE public.orders SET status = 'CANCELLED', updated_at = now()
 WHERE status = 'PENDING' AND created_at < now() - max_age;
 GET DIAGNOSTICS affected = ROW_COUNT;
 RETURN affected;
END $$;
REVOKE ALL ON FUNCTION public.expire_stale_orders(interval) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_stale_orders(interval) TO service_role;
COMMIT;
