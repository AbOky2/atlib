-- ============================================================================
-- NOIR Delivery — durcissement production (SCALABILITE.md §2, §4)
--
-- À exécuter dans le SQL Editor Supabase (ou via migration). Idempotent :
-- chaque bloc peut être rejoué sans danger.
--
-- Le client (src/hooks/useSupabase.ts) appelle d'abord la RPC `create_order`
-- et retombe sur l'ancien chemin si elle n'existe pas — ce script peut donc
-- être déployé avant OU après la mise à jour de l'app.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Horodatage fiable des mises à jour (réconciliation côté client)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS orders_touch_updated_at ON public.orders;
CREATE TRIGGER orders_touch_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- 1. Idempotence : une clé par tentative de checkout
-- ----------------------------------------------------------------------------
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS client_request_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS orders_client_request_id_key
    ON public.orders (client_request_id)
    WHERE client_request_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 2. Une seule commande active par client — garanti ATOMIQUEMENT par la base
--    (le check-then-insert du client ne suffit pas sous concurrence)
-- ----------------------------------------------------------------------------
-- NB : CONCURRENTLY ne passe pas dans une transaction ; exécuter ce bloc seul.
CREATE UNIQUE INDEX IF NOT EXISTS one_active_order_per_customer
    ON public.orders (customer_id)
    WHERE status NOT IN ('DELIVERED', 'CANCELLED');

-- ----------------------------------------------------------------------------
-- 3. RPC atomique + idempotente de création de commande
--    - transaction unique (fini les commandes orphelines sans articles)
--    - totaux RECALCULÉS serveur : un client modifié ne peut pas envoyer 0 F
--    - rejoue la même commande si le client retente avec la même clé
-- ----------------------------------------------------------------------------
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
    v_order        public.orders;
BEGIN
    -- Le demandeur ne peut créer que SA commande.
    IF v_customer_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
    END IF;

    -- Idempotence : même clé → même commande, sans double insertion.
    IF v_request_id IS NOT NULL THEN
        SELECT * INTO v_order FROM orders WHERE client_request_id = v_request_id;
        IF FOUND THEN
            RETURN v_order;
        END IF;
    END IF;

    -- Sous-total recalculé depuis les prix RÉELS des plats (jamais du client).
    SELECT COALESCE(SUM(d.price_xaf * LEAST(GREATEST((i->>'qty')::int, 1), 99)), 0)
    INTO v_subtotal
    FROM jsonb_array_elements(payload->'items') AS i
    JOIN dishes d ON d.id = (i->>'dish_id')::uuid;

    IF v_subtotal <= 0 THEN
        RAISE EXCEPTION 'empty_order' USING ERRCODE = '22023';
    END IF;

    INSERT INTO orders (
        customer_id, customer_name, customer_phone,
        restaurant_id, restaurant_name,
        delivery_address, delivery_zone, delivery_note,
        delivery_lat, delivery_lng,
        subtotal_xaf, delivery_fee_xaf, total_xaf,
        payment_method, status, client_request_id
    ) VALUES (
        v_customer_id,
        payload->>'customer_name',
        payload->>'customer_phone',
        (payload->>'restaurant_id')::uuid,
        payload->>'restaurant_name',
        payload->>'delivery_address',
        payload->>'delivery_zone',
        payload->>'delivery_note',
        NULLIF(payload->>'delivery_lat', '')::double precision,
        NULLIF(payload->>'delivery_lng', '')::double precision,
        v_subtotal,
        v_delivery_fee,
        v_subtotal + v_delivery_fee + v_service_fee,
        COALESCE(payload->>'payment_method', 'cash'),
        'PENDING',
        v_request_id
    )
    RETURNING * INTO v_order;
    -- L'index partiel `one_active_order_per_customer` fait échouer cet INSERT
    -- en 23505 si une commande active existe déjà → mappé côté client sur
    -- ACTIVE_ORDER_EXISTS.

    INSERT INTO order_items (order_id, dish_id, name, qty, price_xaf)
    SELECT
        v_order.id,
        d.id,
        d.name,
        LEAST(GREATEST((i->>'qty')::int, 1), 99),
        d.price_xaf
    FROM jsonb_array_elements(payload->'items') AS i
    JOIN dishes d ON d.id = (i->>'dish_id')::uuid;

    RETURN v_order;
END $$;

REVOKE ALL ON FUNCTION public.create_order(jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_order(jsonb) TO authenticated;

-- ----------------------------------------------------------------------------
-- 4. Index manquants (Postgres n'indexe PAS les FK automatiquement)
--    En production chargée, préférer CREATE INDEX CONCURRENTLY (hors transaction).
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS orders_customer_created_idx   ON public.orders (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_restaurant_created_idx ON public.orders (restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS order_items_order_id_idx      ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS order_items_dish_id_idx       ON public.order_items (dish_id);
CREATE INDEX IF NOT EXISTS dishes_restaurant_avail_idx   ON public.dishes (restaurant_id) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS dishes_category_id_idx        ON public.dishes (category_id);
CREATE INDEX IF NOT EXISTS categories_restaurant_idx     ON public.categories (restaurant_id);
CREATE INDEX IF NOT EXISTS restaurants_active_rating_idx ON public.restaurants (rating DESC) WHERE is_active = true;

-- ----------------------------------------------------------------------------
-- 5. Helpers RLS STABLE (le planner évalue UNE fois par requête, pas par ligne)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.my_restaurant_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT restaurant_id FROM profiles WHERE id = (SELECT auth.uid())
$$;

-- Rappel : dans les policies, envelopper les appels dans un sous-SELECT scalaire :
--   USING ( customer_id = (SELECT auth.uid())
--           OR restaurant_id = (SELECT public.my_restaurant_id()) )

-- ----------------------------------------------------------------------------
-- 6. Garde-fous d'infra (best effort)
--
-- Sur Supabase hébergé, `authenticated` et `anon` sont des rôles RÉSERVÉS : le
-- rôle `postgres` du SQL Editor n'est pas superutilisateur et se voit refuser
-- l'ALTER ROLE avec 42501. Comme l'éditeur exécute tout le script dans UNE
-- transaction, cet échec annulait l'intégralité du déploiement — l'index unique,
-- la RPC, les index : tout était perdu pour une ligne de confort.
--
-- On tente donc la mise en place, et on l'ignore proprement si la plateforme la
-- refuse. Le timeout n'est pas nécessaire au fonctionnement de l'app ; c'est une
-- ceinture de sécurité contre les requêtes folles, à régler sinon depuis
-- Dashboard → Settings → Database.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    EXECUTE 'ALTER ROLE authenticated SET statement_timeout = ''5s''';
    EXECUTE 'ALTER ROLE anon SET statement_timeout = ''5s''';
    RAISE NOTICE 'statement_timeout appliqué aux rôles API.';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'statement_timeout non modifiable ici (rôles réservés) — étape ignorée, le reste du script est appliqué.';
END $$;
