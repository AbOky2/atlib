-- Chad Delivery: Seed Data for Restaurants & Menu Items
-- Run this in the Supabase SQL Editor after the schema is created.

-- ================================================================
-- 1. Restaurant Owners Table (for dashboard auth)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.restaurant_owners (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'owner',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.restaurant_owners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own record"
ON public.restaurant_owners FOR SELECT
USING (auth.uid() = id);

-- Allow Super Admin to manage restaurant owners
CREATE POLICY "Super Admin can manage restaurant owners"
ON public.restaurant_owners FOR ALL
USING (auth.jwt() ->> 'email' = 'admin@chaddelivery.com')
WITH CHECK (auth.jwt() ->> 'email' = 'admin@chaddelivery.com');

-- Allow restaurant owners to manage their own restaurant
CREATE POLICY "Owners can update own restaurant"
ON public.restaurants FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.restaurant_owners
  WHERE restaurant_owners.restaurant_id = restaurants.id
  AND restaurant_owners.id = auth.uid()
));

-- Allow restaurant owners to manage menu items for their restaurant
CREATE POLICY "Owners can insert menu items"
ON public.menu_items FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.restaurant_owners
  WHERE restaurant_owners.restaurant_id = menu_items.restaurant_id
  AND restaurant_owners.id = auth.uid()
));

CREATE POLICY "Owners can update menu items"
ON public.menu_items FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.restaurant_owners
  WHERE restaurant_owners.restaurant_id = menu_items.restaurant_id
  AND restaurant_owners.id = auth.uid()
));

CREATE POLICY "Owners can delete menu items"
ON public.menu_items FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.restaurant_owners
  WHERE restaurant_owners.restaurant_id = menu_items.restaurant_id
  AND restaurant_owners.id = auth.uid()
));

-- Allow restaurant owners to view and update orders for their restaurant
CREATE POLICY "Owners can view restaurant orders"
ON public.orders FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.restaurant_owners
  WHERE restaurant_owners.restaurant_id = orders.restaurant_id
  AND restaurant_owners.id = auth.uid()
));

CREATE POLICY "Owners can update order status"
ON public.orders FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.restaurant_owners
  WHERE restaurant_owners.restaurant_id = orders.restaurant_id
  AND restaurant_owners.id = auth.uid()
));

-- ================================================================
-- 2. Seed Restaurants
-- ================================================================
INSERT INTO public.restaurants (id, name, cover_image, rating, delivery_time, delivery_fee, tags) VALUES
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567801',
  'L''Atelier Noir',
  'https://images.unsplash.com/photo-1544025162-811114bd4760?q=80&w=3000&auto=format&fit=crop',
  4.9,
  '25-35 min',
  2500,
  ARRAY['Cuisine Française', 'Gastronomique', 'Premium']
),
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567802',
  'Sakura Omakase',
  'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=3000&auto=format&fit=crop',
  4.8,
  '20-30 min',
  2000,
  ARRAY['Japonais', 'Sushi', 'Premium']
),
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567803',
  'The Heritage Grill',
  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=3000&auto=format&fit=crop',
  4.7,
  '15-25 min',
  1500,
  ARRAY['Américain', 'Burgers', 'Grillades']
),
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567804',
  'Pizzeria Florentine',
  'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?q=80&w=3000&auto=format&fit=crop',
  4.9,
  '15-25 min',
  1500,
  ARRAY['Italien', 'Pizza', 'Artisanal']
),
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567805',
  'Le Jardin Vert',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=3000&auto=format&fit=crop',
  4.6,
  '20-30 min',
  1800,
  ARRAY['Végétarien', 'Healthy', 'Bio']
),
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567806',
  'Chez Mama Africa',
  'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?q=80&w=3000&auto=format&fit=crop',
  4.8,
  '20-35 min',
  1000,
  ARRAY['Africain', 'Tchadien', 'Traditionnel']
);

-- ================================================================
-- 3. Seed Menu Items
-- ================================================================

-- L'Atelier Noir
INSERT INTO public.menu_items (restaurant_id, name, description, price, image_url, category) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'Saffron Hokkaido Scallops', 'Coquilles Saint-Jacques plongées, émulsion de pignons torréfiés et mousse de parmesan 24 mois.', 42000, 'https://images.unsplash.com/photo-1599813083556-9d3381fa4ce0?q=80&w=3000&auto=format&fit=crop', 'Populaire'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'Truffle Agnolotti', 'Duxelles de champignons sauvages, beurre du Piémont, truffe fraîche du Périgord.', 38000, 'https://images.unsplash.com/photo-1516100882582-96c3a05fe590?q=80&w=3000&auto=format&fit=crop', 'Populaire'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'Wagyu Beef Tartare', 'Jaune d''œuf confit, chips de pain au levain et huile de graines de moutarde sauvage.', 28000, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=3000&auto=format&fit=crop', 'Entrées'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'Burrata & Fruits de Saison', 'Burrata artisanale, pêche grillée, huile de basilic et caviar de balsamique blanc.', 24000, 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=3000&auto=format&fit=crop', 'Entrées'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'Herb-Crusted Lamb Rack', 'Légumes provençaux, purée de pommes de terre fumée et réduction de vin rouge au romarin.', 56000, 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=3000&auto=format&fit=crop', 'Plats'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'Crème Brûlée à la Vanille', 'Vanille de Madagascar, caramel croustillant et tuile aux amandes.', 15000, 'https://images.unsplash.com/photo-1470324161839-ce2bb6fa6bc3?q=80&w=3000&auto=format&fit=crop', 'Desserts');

-- Sakura Omakase
INSERT INTO public.menu_items (restaurant_id, name, description, price, image_url, category) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567802', 'Sashimi Royal', 'Assortiment de 12 pièces de sashimi ultra-frais : thon, saumon, daurade.', 35000, 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=3000&auto=format&fit=crop', 'Populaire'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567802', 'Dragon Roll', 'Crevette tempura, avocat, anguille grillée, sauce teriyaki maison.', 22000, 'https://images.unsplash.com/photo-1553621042-f6e147245754?q=80&w=3000&auto=format&fit=crop', 'Sushi'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567802', 'Ramen Tonkotsu', 'Bouillon de porc 18h, nouilles fraîches, œuf mariné, chashu fondant.', 18000, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?q=80&w=3000&auto=format&fit=crop', 'Plats'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567802', 'Mochi Glacé', 'Assortiment de 6 mochis : matcha, mangue, fraise, sésame noir.', 12000, 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?q=80&w=3000&auto=format&fit=crop', 'Desserts');

-- The Heritage Grill
INSERT INTO public.menu_items (restaurant_id, name, description, price, image_url, category) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567803', 'Heritage Smash Burger', 'Double smash patty, cheddar fondu, sauce secrète, oignons caramélisés, brioche toastée.', 15000, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=3000&auto=format&fit=crop', 'Populaire'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567803', 'BBQ Ribs Fumées', 'Travers de porc fumé 12h, glace BBQ bourbon, coleslaw maison.', 28000, 'https://images.unsplash.com/photo-1544025162-811114bd4760?q=80&w=3000&auto=format&fit=crop', 'Grillades'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567803', 'Loaded Fries', 'Frites croustillantes, fromage fondu, bacon croustillant, jalapeños, crème aigre.', 10000, 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?q=80&w=3000&auto=format&fit=crop', 'Accompagnements'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567803', 'Milkshake Oreo', 'Milkshake crémeux aux cookies Oreo et chantilly.', 8000, 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?q=80&w=3000&auto=format&fit=crop', 'Boissons');

-- Pizzeria Florentine
INSERT INTO public.menu_items (restaurant_id, name, description, price, image_url, category) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567804', 'Margherita DOP', 'Tomates San Marzano, mozzarella di Bufala, basilic frais, huile d''olive extra vierge.', 12000, 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?q=80&w=3000&auto=format&fit=crop', 'Populaire'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567804', 'Quattro Formaggi', 'Mozzarella, gorgonzola, parmesan, fontina, miel de truffe.', 16000, 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?q=80&w=3000&auto=format&fit=crop', 'Pizzas'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567804', 'Calzone Napolitain', 'Ricotta, jambon de Parme, champignons, sauce tomate maison.', 14000, 'https://images.unsplash.com/photo-1536964549204-cce9eab227bd?q=80&w=3000&auto=format&fit=crop', 'Pizzas'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567804', 'Tiramisu Classique', 'Mascarpone, café espresso, cacao amer, biscuits Savoiardi.', 10000, 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?q=80&w=3000&auto=format&fit=crop', 'Desserts');

-- Le Jardin Vert
INSERT INTO public.menu_items (restaurant_id, name, description, price, image_url, category) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567805', 'Buddha Bowl', 'Quinoa, avocat, edamame, carotte rôtie, sauce tahini citron.', 14000, 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=3000&auto=format&fit=crop', 'Populaire'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567805', 'Smoothie Bowl Açaí', 'Açaí, banane, granola maison, fruits frais, miel.', 10000, 'https://images.unsplash.com/photo-1590301157890-4810ed352733?q=80&w=3000&auto=format&fit=crop', 'Petit-Déjeuner'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567805', 'Wrap Méditerranéen', 'Falafel, houmous, légumes grillés, sauce yaourt menthe.', 12000, 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?q=80&w=3000&auto=format&fit=crop', 'Plats');

-- Chez Mama Africa
INSERT INTO public.menu_items (restaurant_id, name, description, price, image_url, category) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567806', 'Poulet DG', 'Poulet braisé aux plantains frits, légumes sautés, épices traditionnelles.', 12000, 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?q=80&w=3000&auto=format&fit=crop', 'Populaire'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567806', 'Ndolé', 'Feuilles de ndolé, crevettes, arachides pilées, accompagné de plantain.', 10000, 'https://images.unsplash.com/photo-1567982047351-76b6f93e38ee?q=80&w=3000&auto=format&fit=crop', 'Plats Traditionnels'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567806', 'Brochettes de Bœuf', 'Bœuf mariné aux épices tchadiennes, oignons grillés, sauce piment.', 8000, 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=3000&auto=format&fit=crop', 'Grillades'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567806', 'Jus de Bissap', 'Hibiscus frais, gingembre, menthe, sucre de canne.', 3000, 'https://images.unsplash.com/photo-1544145945-f90425340c7e?q=80&w=3000&auto=format&fit=crop', 'Boissons');
