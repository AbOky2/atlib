-- Données du premier catalogue, telles qu'on les trouve encore : un genre et une
-- catégorie de carte nommés « Africain ». La table categories vit hors migrations.
CREATE TABLE IF NOT EXISTS public.categories (id serial PRIMARY KEY, name text NOT NULL);
INSERT INTO restaurants(id,name,genre,is_active,is_accepting_orders,rating) VALUES
 ('10000000-0000-4000-8000-000000000041','Saveurs du Chari','Africain',true,true,4),
 ('10000000-0000-4000-8000-000000000042','Pizzeria','Pizza',true,true,4),
 ('10000000-0000-4000-8000-000000000043','Mixte','Cuisine africaine, Grillades',true,true,4);
INSERT INTO public.categories(name) VALUES ('Africain'), ('Burger'), ('Plats africains');
