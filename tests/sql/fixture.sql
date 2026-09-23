-- Disposable database only: minimal schema contract fixture, not a production bootstrap.
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
GRANT USAGE ON SCHEMA auth, public TO authenticated, anon, service_role;
CREATE TABLE public.profiles (created_at timestamptz DEFAULT now(), id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text, phone text, restaurant_id uuid, role text, updated_at timestamptz DEFAULT now());
CREATE TABLE public.restaurants (address text, created_at timestamptz DEFAULT now(), description text, genre text, id uuid PRIMARY KEY DEFAULT gen_random_uuid(), image_url text, is_accepting_orders boolean, is_active boolean, lat integer, lng integer, name text, rating integer);
CREATE TABLE public.dishes (category_id uuid, created_at timestamptz DEFAULT now(), id uuid PRIMARY KEY DEFAULT gen_random_uuid(), image_url text, is_available boolean, name text, price_xaf integer, restaurant_id uuid, short_description text);
CREATE TABLE public.orders (created_at timestamptz DEFAULT now(), customer_id uuid, customer_name text, customer_phone text, delivery_address text, delivery_fee_xaf integer, delivery_landmark text, delivery_lat integer, delivery_lng integer, delivery_note text, delivery_zone text, id uuid PRIMARY KEY DEFAULT gen_random_uuid(), payment_method text, push_token text, restaurant_id uuid, restaurant_name text, status text, cash_paid_with_xaf integer, eta_minutes integer, subtotal_xaf integer, total_xaf integer, updated_at timestamptz DEFAULT now());
CREATE TABLE public.order_items (created_at timestamptz DEFAULT now(), dish_id uuid, id uuid PRIMARY KEY DEFAULT gen_random_uuid(), note text, name text, order_id uuid, price_xaf integer, qty integer);
CREATE FUNCTION public.my_restaurant_id() RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$ SELECT restaurant_id FROM profiles WHERE id = auth.uid() $$;
CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$ SELECT coalesce((SELECT role = 'admin' FROM profiles WHERE id = auth.uid()), false) $$;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
CREATE POLICY orders_baseline ON orders TO authenticated USING(true) WITH CHECK(true);
CREATE POLICY items_baseline ON order_items TO authenticated USING(true) WITH CHECK(true);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_request_id uuid;
CREATE UNIQUE INDEX requests ON orders(client_request_id);
CREATE UNIQUE INDEX active ON orders(customer_id) WHERE status NOT IN ('DELIVERED','CANCELLED');
