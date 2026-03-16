-- Seed Data for Atlib Supabase Migration
-- Run this script in your Supabase SQL Editor to populate the database with test data.

-- 1. Insert Categories
INSERT INTO public.categories (id, name, image_url) VALUES 
('11111111-1111-4111-a111-111111111111', 'Burger', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60'),
('22222222-2222-4222-a222-222222222222', 'Pizza', 'https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60'),
('33333333-3333-4333-a333-333333333333', 'Africain', 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60');

-- 2. Insert Restaurants
INSERT INTO public.restaurants (id, name, description, image_url, rating, address, genre) VALUES 
('a1111111-1111-4111-a111-111111111111', 'Le Grilladin Ndjamena', 'Les meilleurs burgers et grillades de la capitale.', 'https://images.unsplash.com/photo-1552566626-52f8b828add9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', 4.8, 'Quartier Sabangali', 'Fast Food & Grill'),
('a2222222-2222-4222-a222-222222222222', 'Pizzeria La Mamma', 'Pizza italienne authentique cuite au feu de bois.', 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', 4.5, 'Avenue Charles de Gaulle', 'Pizza'),
('a3333333-3333-4333-a333-333333333333', 'Saveurs du Chari', 'Plats traditionnels tchadiens et africains.', 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', 4.2, 'Quartier Moursal', 'Africain');

-- 3. Insert Dishes
INSERT INTO public.dishes (id, name, short_description, price_xaf, image_url, restaurant_id, category_id) VALUES 
-- Restaurant 1 (Le Grilladin)
('b1111111-1111-4111-a111-111111111111', 'Double Cheese Burger', 'Steak haché double, cheddar fondant, salade, tomate.', 3500, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60', 'a1111111-1111-4111-a111-111111111111', '11111111-1111-4111-a111-111111111111'),
('b2222222-2222-4222-a222-222222222222', 'Poulet Braisé', 'Demi-poulet braisé mariné, servi avec frites ou bananes plantains.', 4500, 'https://images.unsplash.com/photo-1598514982205-f36b96d1e8d4?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60', 'a1111111-1111-4111-a111-111111111111', '33333333-3333-4333-a333-333333333333'),

-- Restaurant 2 (Pizzeria La Mamma)
('b3333333-3333-4333-a333-333333333333', 'Pizza Margherita', 'Sauce tomate, mozzarella fraiche, basilic.', 4000, 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60', 'a2222222-2222-4222-a222-222222222222', '22222222-2222-4222-a222-222222222222'),
('b4444444-4444-4444-a444-444444444444', 'Pizza Royale', 'Sauce tomate, jambon, champignons, mozzarella.', 5500, 'https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60', 'a2222222-2222-4222-a222-222222222222', '22222222-2222-4222-a222-222222222222'),

-- Restaurant 3 (Saveurs du Chari)
('b5555555-5555-4555-a555-555555555555', 'Kissar et sauce gombo', 'Galette fine tchadienne servie avec une sauce gombo à la viande stérile.', 2500, 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60', 'a3333333-3333-4333-a333-333333333333', '33333333-3333-4333-a333-333333333333');

-- End of script
