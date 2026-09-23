-- Naakul est au Tchad : la cuisine du pays est simplement « locale ». « Africain »
-- — le mot d'un regard extérieur pour tout un continent — figurait dans le genre
-- d'un restaurant et dans une catégorie de carte du premier catalogue. Les
-- filtres de l'app reconnaissent encore l'ancien mot, mais la donnée doit dire
-- juste. Idempotent : ne touche que les lignes qui contiennent le mot.
BEGIN;
UPDATE public.restaurants
   SET genre = regexp_replace(genre, 'cuisine\s+africaine|africaine?', 'Cuisine locale', 'gi')
 WHERE genre ~* 'africain';

-- La table des catégories de plats vit hors migrations (créée depuis le
-- dashboard) : on ne la corrige que si elle existe.
DO $$
BEGIN
    IF to_regclass('public.categories') IS NOT NULL THEN
        UPDATE public.categories
           SET name = regexp_replace(name, 'plats\s+africains|africaine?s?', 'Plats locaux', 'gi')
         WHERE name ~* 'africain';
    END IF;
END $$;
COMMIT;
