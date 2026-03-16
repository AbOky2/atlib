-- Fix Row Level Security (RLS) Policies for Public Reads
-- Run this script in your Supabase SQL Editor.
-- The previous schema enabled RLS but didn't provide any policies to allow reading the data.

-- 1. Allow public read access to restaurants
CREATE POLICY "Public profiles are viewable by everyone."
  ON public.restaurants FOR SELECT
  USING ( true );

-- 2. Allow public read access to categories
CREATE POLICY "Categories are viewable by everyone."
  ON public.categories FOR SELECT
  USING ( true );

-- 3. Allow public read access to dishes
CREATE POLICY "Dishes are viewable by everyone."
  ON public.dishes FOR SELECT
  USING ( true );
