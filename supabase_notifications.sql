-- ============================================================================
-- NOIR Delivery — migration « notifications, disponibilité, monnaie »
--
-- À exécuter APRÈS supabase_production.sql, dans l'éditeur SQL Supabase.
-- Idempotent : ré-exécutable sans risque.
--
-- Ce que ça apporte :
--   1. push_tokens        — un appareil ↔ un utilisateur, pour joindre client ET restaurant
--   2. is_accepting_orders — l'interrupteur ouvert/fermé du restaurant
--   3. cash_paid_with_xaf  — le billet annoncé par le client, pour préparer la monnaie
--   4. expire_stale_orders  — annule les commandes jamais confirmées (sinon le client
--                             reste bloqué : l'index unique interdit une 2e commande active)
--   5. notify_order_change  — déclenche l'Edge Function qui envoie les push
--
-- Le client fonctionne SANS cette migration (dégradation gracieuse) ; il en a
-- besoin pour que les notifications, l'ouverture/fermeture et la monnaie vivent.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Jetons de notification
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.push_tokens (
    token       text PRIMARY KEY,
    user_id     uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    platform    text,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_tokens_user_idx ON public.push_tokens (user_id);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Chacun ne gère que ses propres appareils. L'Edge Function lit avec la clé
-- service_role, qui contourne RLS.
DROP POLICY IF EXISTS push_tokens_own ON public.push_tokens;
CREATE POLICY push_tokens_own ON public.push_tokens
    FOR ALL
    USING (user_id = (SELECT auth.uid()))
    WITH CHECK (user_id = (SELECT auth.uid()));

-- ----------------------------------------------------------------------------
-- 2. Disponibilité du restaurant
-- ----------------------------------------------------------------------------
ALTER TABLE public.restaurants
    ADD COLUMN IF NOT EXISTS is_accepting_orders boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.restaurants.is_accepting_orders IS
    'Interrupteur manuel du restaurant. false = la carte reste visible mais on ne peut pas commander.';

-- ----------------------------------------------------------------------------
-- 3. Monnaie à rendre
-- ----------------------------------------------------------------------------
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS cash_paid_with_xaf integer;

COMMENT ON COLUMN public.orders.cash_paid_with_xaf IS
    'Billet que le client annonce. NULL = il aura l''appoint exact.';

-- Un montant annoncé doit pouvoir couvrir la commande.
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_cash_paid_with_valid;
ALTER TABLE public.orders ADD CONSTRAINT orders_cash_paid_with_valid
    CHECK (cash_paid_with_xaf IS NULL OR cash_paid_with_xaf >= total_xaf);

-- ----------------------------------------------------------------------------
-- 3-bis. Live Activity : jeton APNs et ETA annoncée
--
-- ActivityKit délivre un jeton PAR activité (donc par commande). Sans lui,
-- l'écran verrouillé ne bouge que si l'app tourne — c'est-à-dire jamais au
-- moment où on le regarde.
--
-- `eta_minutes` est figée à la commande pour que l'Edge Function recompose
-- l'heure d'arrivée sans dupliquer la table des quartiers (src/lib/localities.ts).
-- ----------------------------------------------------------------------------
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS eta_minutes integer;

CREATE TABLE IF NOT EXISTS public.live_activity_tokens (
    order_id    uuid PRIMARY KEY REFERENCES public.orders (id) ON DELETE CASCADE,
    token       text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.live_activity_tokens ENABLE ROW LEVEL SECURITY;

-- Seul le client propriétaire de la commande dépose son jeton. L'Edge Function
-- lit avec la clé service_role, qui contourne RLS.
DROP POLICY IF EXISTS live_activity_tokens_own ON public.live_activity_tokens;
CREATE POLICY live_activity_tokens_own ON public.live_activity_tokens
    FOR ALL
    USING (
        order_id IN (SELECT id FROM public.orders WHERE customer_id = (SELECT auth.uid()))
    )
    WITH CHECK (
        order_id IN (SELECT id FROM public.orders WHERE customer_id = (SELECT auth.uid()))
    );

-- ----------------------------------------------------------------------------
-- 3-ter. Gestion du menu par le restaurant
--
-- `dishes.is_available` existait déjà mais aucun compte restaurant ne pouvait
-- l'écrire : vendre un plat épuisé produisait une annulation, et en paiement
-- espèces une annulation est une conversation désagréable au téléphone.
-- ----------------------------------------------------------------------------
-- FOR ALL, et non FOR UPDATE : une première version ne couvrait que la mise à
-- jour, pensée pour le seul interrupteur de disponibilité. Créer ou supprimer un
-- plat était donc refusé par RLS — silencieusement, puisque PostgREST renvoie
-- simplement « aucune ligne insérée ». Un restaurant doit pouvoir gérer sa carte
-- entière, pas seulement éteindre des plats existants.
DROP POLICY IF EXISTS dishes_manage_own ON public.dishes;
CREATE POLICY dishes_manage_own ON public.dishes
    FOR ALL
    USING (restaurant_id = (SELECT public.my_restaurant_id()))
    WITH CHECK (restaurant_id = (SELECT public.my_restaurant_id()));

-- Un nouveau plat a besoin d'une catégorie : sans ce droit, la carte ne peut
-- être organisée que par ce qui existe déjà.
DROP POLICY IF EXISTS categories_manage_own ON public.categories;
CREATE POLICY categories_manage_own ON public.categories
    FOR ALL
    USING (restaurant_id = (SELECT public.my_restaurant_id()))
    WITH CHECK (restaurant_id = (SELECT public.my_restaurant_id()));

-- Le restaurant doit voir TOUTE sa carte, y compris les plats indisponibles,
-- alors que les clients ne voient que ce qui est vendable.
DROP POLICY IF EXISTS dishes_read_own ON public.dishes;
CREATE POLICY dishes_read_own ON public.dishes
    FOR SELECT
    USING (is_available = true OR restaurant_id = (SELECT public.my_restaurant_id()));

-- Idem pour l'interrupteur ouvert/fermé du restaurant.
DROP POLICY IF EXISTS restaurants_manage_own ON public.restaurants;
CREATE POLICY restaurants_manage_own ON public.restaurants
    FOR UPDATE
    USING (id = (SELECT public.my_restaurant_id()))
    WITH CHECK (id = (SELECT public.my_restaurant_id()));

-- ----------------------------------------------------------------------------
-- 3-quater. La RPC create_order doit connaître les nouvelles colonnes
--
-- ⚠️ Sans ce bloc, déployer supabase_production.sql CASSE deux fonctions en
-- silence : le client envoie bien `cash_paid_with_xaf` et `eta_minutes` dans le
-- payload, mais l'INSERT de la RPC ne les lit pas — et comme la RPC est le
-- chemin PRIVILÉGIÉ (le repli n'est utilisé que si elle n'existe pas), la
-- monnaie à rendre et l'heure d'arrivée de la Live Activity disparaîtraient
-- sans la moindre erreur.
--
-- Même corps que dans supabase_production.sql, avec les deux colonnes en plus.
-- À exécuter APRÈS ce fichier-là.
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
    v_total        int;
    v_cash         int := NULLIF(payload->>'cash_paid_with_xaf', '')::int;
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

    v_total := v_subtotal + v_delivery_fee + v_service_fee;

    -- Le total étant recalculé ici, un billet annoncé plus PETIT que le vrai
    -- total n'a pas de sens : on l'ignore plutôt que de violer la contrainte
    -- et de faire échouer une commande par ailleurs valide.
    IF v_cash IS NOT NULL AND v_cash < v_total THEN
        v_cash := NULL;
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
        payload->>'restaurant_name',
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
        NULLIF(payload->>'eta_minutes', '')::int
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
-- 4. Commandes fantômes
--
-- Une commande jamais confirmée bloque le client à vie (index unique sur la
-- commande active). On l'annule au bout de 20 min : le client peut recommander,
-- et il reçoit une notification honnête plutôt qu'un silence.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.expire_stale_orders(max_age interval DEFAULT interval '20 minutes')
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    affected integer;
BEGIN
    UPDATE public.orders
       SET status = 'CANCELLED',
           updated_at = now()
     WHERE status = 'PENDING'
       AND created_at < now() - max_age;
    GET DIAGNOSTICS affected = ROW_COUNT;
    RETURN affected;
END;
$$;

-- Planification (nécessite l'extension pg_cron, activable depuis Database → Extensions).
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('expire-stale-orders', '*/5 * * * *', $$SELECT public.expire_stale_orders();$$);

-- ----------------------------------------------------------------------------
-- 5. Déclencheur des notifications
--
-- Le déclencheur ci-dessous appelle l'Edge Function `notify-order`. Sa
-- configuration vit dans la table `app_settings` créée juste après — PAS dans
-- `app.settings.*` : `ALTER DATABASE … SET` est refusé sur Supabase hébergé.
--
-- APRÈS avoir exécuté ce script, renseignez les deux valeurs (une seule fois) :
--
--   INSERT INTO public.app_settings (key, value) VALUES
--     ('edge_url',    'https://<VOTRE-REF>.supabase.co/functions/v1/notify-order'),
--     ('service_key', '<VOTRE_SERVICE_ROLE_KEY>')
--   ON CONFLICT (key) DO UPDATE SET value = excluded.value;
--
-- Tant qu'elles manquent, le déclencheur est INERTE : il rend la main sans rien
-- appeler, donc aucune commande n'est jamais bloquée par une notification.
--
-- Alternative équivalente si vous préférez l'interface : Database Webhooks du
-- Dashboard (selon la version : Database → Webhooks, ou Integrations →
-- Database Webhooks). N'activez PAS les deux, les notifications partiraient
-- en double.
--
-- ⚠️ La service_role key donne un accès total : ne la mettez JAMAIS dans l'app.
-- ----------------------------------------------------------------------------
-- Même précaution qu'en section 6 de supabase_production.sql : si la plateforme
-- refuse l'installation de l'extension, on ne fait pas échouer TOUT le script
-- (le SQL Editor exécute l'ensemble dans une seule transaction). Le trigger créé
-- plus bas avale déjà ses propres erreurs, donc l'absence de pg_net coûte
-- seulement les notifications, jamais une commande.
-- Si ce message apparaît : Dashboard → Database → Extensions → activer « pg_net ».
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_net;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_net indisponible ici — activez-la depuis Dashboard → Database → Extensions, puis rejouez ce script.';
END $$;

-- Configuration du déclencheur, dans une TABLE et non dans un paramètre de base.
--
-- `ALTER DATABASE … SET app.settings.…` est refusé sur Supabase hébergé (42501,
-- comme l'ALTER ROLE de production.sql) : le rôle postgres n'a pas le droit de
-- définir des paramètres personnalisés. Une table ordinaire n'a pas ce problème.
--
-- RLS activée SANS aucune policy : ni `anon` ni `authenticated` ne peuvent lire
-- cette table à travers l'API. Seuls la clé service_role (qui contourne RLS) et
-- les fonctions SECURITY DEFINER y accèdent — dont le déclencheur ci-dessous.
CREATE TABLE IF NOT EXISTS public.app_settings (
    key   text PRIMARY KEY,
    value text NOT NULL
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.app_settings IS
    'Configuration serveur. Contient la service_role key : ne jamais exposer via l''API.';

CREATE OR REPLACE FUNCTION public.notify_order_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    edge_url    text;
    service_key text;
BEGIN
    SELECT value INTO edge_url    FROM app_settings WHERE key = 'edge_url';
    SELECT value INTO service_key FROM app_settings WHERE key = 'service_key';

    -- Pas encore configuré : on ne bloque surtout pas l'écriture de la commande.
    IF edge_url IS NULL OR service_key IS NULL THEN
        RETURN NEW;
    END IF;

    -- Une UPDATE qui ne change pas le statut n'intéresse personne.
    IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
        RETURN NEW;
    END IF;

    PERFORM net.http_post(
        url     := edge_url,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || service_key
        ),
        body    := jsonb_build_object(
            'type', TG_OP,
            'record', to_jsonb(NEW),
            'old_record', CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END
        )
    );
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Une notification ratée ne doit jamais faire échouer une commande.
    RAISE WARNING 'notify_order_change: %', SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_notify_change ON public.orders;
CREATE TRIGGER orders_notify_change
    AFTER INSERT OR UPDATE OF status ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_order_change();

-- ----------------------------------------------------------------------------
-- 6. Vérification
-- ----------------------------------------------------------------------------
-- SELECT column_name FROM information_schema.columns
--  WHERE table_name = 'restaurants' AND column_name = 'is_accepting_orders';
-- SELECT public.expire_stale_orders(interval '20 minutes');
