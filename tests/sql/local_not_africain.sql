-- Run after local_fixture.sql and 202609230003_local_not_africain.sql, with ON_ERROR_STOP=1.
DO $$ BEGIN
 IF (SELECT genre FROM restaurants WHERE id='10000000-0000-4000-8000-000000000041') <> 'Cuisine locale' THEN RAISE EXCEPTION 'genre « Africain » not renamed'; END IF;
 IF (SELECT genre FROM restaurants WHERE id='10000000-0000-4000-8000-000000000042') <> 'Pizza' THEN RAISE EXCEPTION 'unrelated genre touched'; END IF;
 IF (SELECT genre FROM restaurants WHERE id='10000000-0000-4000-8000-000000000043') <> 'Cuisine locale, Grillades' THEN RAISE EXCEPTION 'composite genre mangled: %', (SELECT genre FROM restaurants WHERE id='10000000-0000-4000-8000-000000000043'); END IF;
 IF EXISTS (SELECT 1 FROM public.categories WHERE name ~* 'africain') THEN RAISE EXCEPTION 'a menu category still says « Africain »'; END IF;
 IF (SELECT count(*) FROM public.categories WHERE name = 'Plats locaux') <> 2 THEN RAISE EXCEPTION 'menu categories not renamed to « Plats locaux »'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Burger') THEN RAISE EXCEPTION 'unrelated category touched'; END IF;
END $$;
-- Rejouer la migration ne change plus rien : elle est idempotente.
