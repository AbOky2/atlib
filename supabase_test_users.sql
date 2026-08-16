-- ============================================================================
-- NOIR Delivery — comptes de test
--
-- ⚠️ Ce script lit VOTRE catalogue réel et ne présuppose aucun UUID.
--
-- Une version précédente reprenait les identifiants d'un ancien seed (supprimé
-- du dépôt le 9 août 2026 : il décrivait un schéma révolu — tables `users` et
-- `menu_items`, colonnes cover_image/delivery_time/tags). Ces UUID n'existaient
-- pas en base, et comme profiles.restaurant_id n'a PAS de clé étrangère vers
-- restaurants, l'écriture passait sans erreur : le gérant se retrouvait rattaché
-- à rien, visible uniquement par la jointure de l'ÉTAPE 3.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ÉTAPE 1 — Créer les comptes
--
-- Authentication → Users → « Add user », en cochant « Auto Confirm User » :
--
--   CLIENT             client@test.com     (mot de passe de votre choix)
--   GÉRANT (1)         atelier@test.com    (mot de passe de votre choix)
--   GÉRANT (2)         mama@test.com       (mot de passe de votre choix)
--
-- Aucun mot de passe n'est stocké ici : Supabase Auth les hache, ils ne
-- transitent jamais par du SQL. Vous les choisissez à la création.
--
-- Si vos adresses diffèrent, modifiez-les à l'ÉTAPE 2 (constantes en haut du bloc).
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- ÉTAPE 0 — Voir ce que contient réellement votre catalogue
-- ----------------------------------------------------------------------------
SELECT id, name FROM public.restaurants ORDER BY name;

-- ----------------------------------------------------------------------------
-- ÉTAPE 2 — Rattacher chaque gérant à un restaurant EXISTANT
--
-- Deux obstacles, traités ici :
--
--   a) `guard_profile_privileges` interdit toute modification de profiles.role.
--      C'est une protection anti-escalade saine, à CONSERVER : on la désactive
--      le temps de deux UPDATE, puis on la remet. Le tout dans une transaction,
--      donc un échec en cours de route annule aussi la désactivation — la base
--      ne peut pas rester sans son garde-fou.
--
--   b) profiles.restaurant_id n'a pas de clé étrangère vers restaurants : écrire
--      un UUID inexistant ne lève AUCUNE erreur, ça produit juste un compte
--      gérant rattaché à rien. On choisit donc les restaurants dans la table,
--      et on refuse de continuer si elle est vide.
--
-- Idempotent : rejouable sans risque.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    trg        record;
    EMAIL_1 CONSTANT text := 'atelier@test.com';
    EMAIL_2 CONSTANT text := 'mama@test.com';
    v_user_1   uuid;
    v_user_2   uuid;
    v_resto_1  uuid;  v_nom_1 text;
    v_resto_2  uuid;  v_nom_2 text;
BEGIN
    -- Choisir dans le catalogue RÉEL. Correspondance par nom quand elle existe,
    -- sinon simplement les premiers restaurants — l'important pour un test est
    -- que la référence pointe vers quelque chose.
    SELECT id, name INTO v_resto_1, v_nom_1
      FROM public.restaurants
     ORDER BY (name ILIKE '%atelier%') DESC, name
     LIMIT 1;

    IF v_resto_1 IS NULL THEN
        RAISE EXCEPTION 'La table restaurants est vide : ajoutez au moins un restaurant avant de rattacher un gérant.';
    END IF;

    SELECT id, name INTO v_resto_2, v_nom_2
      FROM public.restaurants
     WHERE id <> v_resto_1
     ORDER BY (name ILIKE '%mama%') DESC, name
     LIMIT 1;

    -- 1) Neutraliser le garde-fou (uniquement les déclencheurs qui l'appellent).
    BEGIN
        FOR trg IN
            SELECT tg.tgname
              FROM pg_trigger tg
              JOIN pg_class  c ON c.oid = tg.tgrelid
              JOIN pg_proc   p ON p.oid = tg.tgfoid
             WHERE c.relname = 'profiles'
               AND p.proname = 'guard_profile_privileges'
               AND NOT tg.tgisinternal
        LOOP
            EXECUTE format('ALTER TABLE public.profiles DISABLE TRIGGER %I', trg.tgname);
        END LOOP;
    EXCEPTION WHEN insufficient_privilege THEN
        RAISE EXCEPTION
            'Impossible de désactiver le garde-fou : exécutez ce script depuis le SQL Editor Supabase (rôle postgres, propriétaire de la table).';
    END;

    -- 2) S'assurer qu'un profil existe (normalement créé par un trigger sur auth.users).
    INSERT INTO public.profiles (id, name, role)
    SELECT u.id, split_part(u.email, '@', 1), 'customer'
      FROM auth.users u
     WHERE u.email IN (EMAIL_1, EMAIL_2, 'client@test.com')
    ON CONFLICT (id) DO NOTHING;

    -- 3) Promouvoir les gérants vers des restaurants qui existent vraiment.
    SELECT id INTO v_user_1 FROM auth.users WHERE email = EMAIL_1;
    SELECT id INTO v_user_2 FROM auth.users WHERE email = EMAIL_2;

    IF v_user_1 IS NULL THEN
        RAISE NOTICE '% introuvable — créez le compte à l''étape 1.', EMAIL_1;
    ELSE
        UPDATE public.profiles
           SET restaurant_id = v_resto_1, role = 'restaurant'
         WHERE id = v_user_1;
        RAISE NOTICE '% → %', EMAIL_1, v_nom_1;
    END IF;

    IF v_user_2 IS NULL THEN
        RAISE NOTICE '% introuvable — créez le compte à l''étape 1.', EMAIL_2;
    ELSIF v_resto_2 IS NULL THEN
        RAISE NOTICE 'Un seul restaurant au catalogue : % reste client.', EMAIL_2;
    ELSE
        UPDATE public.profiles
           SET restaurant_id = v_resto_2, role = 'restaurant'
         WHERE id = v_user_2;
        RAISE NOTICE '% → %', EMAIL_2, v_nom_2;
    END IF;

    -- 4) Remettre le garde-fou. Non négociable : la protection doit survivre à
    --    ce script, sinon n'importe quel client pourrait se promouvoir.
    FOR trg IN
        SELECT tg.tgname
          FROM pg_trigger tg
          JOIN pg_class  c ON c.oid = tg.tgrelid
          JOIN pg_proc   p ON p.oid = tg.tgfoid
         WHERE c.relname = 'profiles'
           AND p.proname = 'guard_profile_privileges'
           AND NOT tg.tgisinternal
    LOOP
        EXECUTE format('ALTER TABLE public.profiles ENABLE TRIGGER %I', trg.tgname);
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- ÉTAPE 3 — Vérifier
--
-- La colonne `restaurant` NE DOIT PLUS être NULL pour les gérants : c'est
-- exactement ce que lit `my_restaurant_id()`, dont dépend l'accès au dashboard.
-- ----------------------------------------------------------------------------
SELECT u.email,
       p.role,
       p.restaurant_id,
       r.name AS restaurant
  FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  LEFT JOIN public.restaurants r ON r.id = p.restaurant_id
 WHERE u.email IN ('client@test.com', 'atelier@test.com', 'mama@test.com')
 ORDER BY u.email;

-- Le garde-fou doit être ACTIF (tgenabled = 'O', la LETTRE O pour « Origin ») :
SELECT tg.tgname, tg.tgenabled
  FROM pg_trigger tg
  JOIN pg_class c ON c.oid = tg.tgrelid
 WHERE c.relname = 'profiles' AND NOT tg.tgisinternal;

-- Connecté en tant que gérant, ceci doit renvoyer l'id de son restaurant :
--   SELECT public.my_restaurant_id();
