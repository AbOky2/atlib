-- Chad Delivery: Test Users Setup
-- Run in Supabase SQL Editor AFTER creating the users via Auth

-- ====================================================================
-- STEP 1: Create test users via Supabase Dashboard or API
-- Go to Authentication > Users > "Add User" and create:
--
-- TEST CLIENT:
--   Email: client@test.com
--   Password: Test1234!
--
-- TEST RESTAURANT OWNER (for L'Atelier Noir):
--   Email: atelier@test.com
--   Password: Test1234!
--
-- TEST RESTAURANT OWNER (for Chez Mama Africa):
--   Email: mama@test.com
--   Password: Test1234!
-- ====================================================================

-- STEP 2: After creating users in Auth, run the following to link
-- restaurant owners to their restaurants.
-- Replace the UUIDs below with the actual auth.users IDs from Step 1.

-- You can find the user IDs in Authentication > Users after creating them.
-- Example (replace 'REPLACE_WITH_ATELIER_USER_ID' with actual UUID):

-- INSERT INTO public.restaurant_owners (id, restaurant_id, role)
-- VALUES (
--   'REPLACE_WITH_ATELIER_USER_ID',
--   'a1b2c3d4-e5f6-7890-abcd-ef1234567801',
--   'owner'
-- );

-- INSERT INTO public.restaurant_owners (id, restaurant_id, role)
-- VALUES (
--   'REPLACE_WITH_MAMA_USER_ID',
--   'a1b2c3d4-e5f6-7890-abcd-ef1234567806',
--   'owner'
-- );
