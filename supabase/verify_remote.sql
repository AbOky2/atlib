-- Lecture seule : état réellement déployé. À coller dans Supabase → SQL Editor.
-- N'affiche aucune valeur secrète (seulement la présence des clés).
--
-- L'éditeur n'affiche que le résultat de la DERNIÈRE instruction : tout est donc
-- rassemblé dans un seul tableau (section 1 = déploiement, 2 = jobs, 3 = policies).

-- Jobs planifiés. Sans pg_cron, la table cron.job n'existe pas et la référencer
-- directement ferait échouer TOUT le script (une seule transaction dans l'éditeur) :
-- on passe donc par du SQL dynamique, qui répond « absent » au lieu d'échouer.
CREATE OR REPLACE FUNCTION pg_temp.scheduled_jobs()
RETURNS TABLE(jobname text, schedule text, command text, active boolean)
LANGUAGE plpgsql AS $$
BEGIN
  IF to_regclass('cron.job') IS NULL THEN
    RETURN QUERY SELECT 'pg_cron absent : Database → Extensions, puis rejouer 202609230001_order_lifecycle.sql'::text, NULL::text, NULL::text, false;
  ELSE
    RETURN QUERY EXECUTE 'SELECT jobname::text, schedule::text, command::text, active FROM cron.job ORDER BY jobname';
  END IF;
END $$;

SELECT section, check_name, ok, detail FROM (
  SELECT 1 AS section, check_name, ok, detail FROM (VALUES
 ('create_order validée serveur (migration intégrité)',
   EXISTS (SELECT 1 FROM pg_proc WHERE proname='create_order' AND prosrc LIKE '%INVALID_ZONE%'), NULL),
 ('garde des transitions de statut',
   EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='orders_guard_transition_v2'), NULL),
 ('une seule commande active par client',
   EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='one_active_order_per_customer'), NULL),
 ('file de notifications (outbox)',
   to_regclass('public.order_notification_events') IS NOT NULL, NULL),
 ('reprises bornées (migration résilience)',
   EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='order_notification_events' AND column_name='failed_at'), NULL),
 ('déclencheur de notification',
   EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='orders_notify_change'), NULL),
 ('suppression de compte (erase_customer_data + account_deletion_blocker)',
   (SELECT count(*) = 2 FROM pg_proc WHERE proname IN ('erase_customer_data','account_deletion_blocker')), NULL),
 ('motif d''annulation (migration cycle de vie)',
   EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='cancellation_reason'), NULL),
 ('expiration des commandes fantômes à deux vitesses',
   EXISTS (SELECT 1 FROM pg_proc WHERE proname='expire_stale_orders' AND pronargs=2), NULL),
 ('heure d''acceptation (accepted_at)',
   EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='accepted_at'), NULL),
 ('anon ne lit pas les commandes',
   NOT EXISTS (SELECT 1 FROM information_schema.role_table_grants WHERE table_name='orders' AND grantee='anon' AND privilege_type='SELECT'), NULL),
 ('extension pg_net', EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_net'), NULL),
 ('extension pg_cron', EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_cron'), NULL),
 ('app_settings edge_url + service_key présents',
   (SELECT count(*) = 2 FROM public.app_settings WHERE key IN ('edge_url','service_key') AND coalesce(value,'') <> ''), NULL),
 ('RLS active sur orders / order_items / push_tokens / app_settings',
   (SELECT bool_and(relrowsecurity) FROM pg_class WHERE oid IN ('public.orders'::regclass,'public.order_items'::regclass,'public.push_tokens'::regclass,'public.app_settings'::regclass)), NULL),
 ('commandes PENDING de plus de 30 min (doit être 0 si le job d''expiration tourne)',
   (SELECT count(*) = 0 FROM public.orders WHERE status='PENDING' AND created_at < now() - interval '30 minutes'),
   (SELECT count(*)::text FROM public.orders WHERE status='PENDING' AND created_at < now() - interval '30 minutes')),
 ('commandes actives de plus de 6 h (client bloqué : une seule commande active)',
   (SELECT count(*) = 0 FROM public.orders WHERE status NOT IN ('DELIVERED','CANCELLED') AND created_at < now() - interval '6 hours'),
   (SELECT count(*)::text FROM public.orders WHERE status NOT IN ('DELIVERED','CANCELLED') AND created_at < now() - interval '6 hours')),
 ('taille de la base', true, pg_size_pretty(pg_database_size(current_database())))
) AS t(check_name, ok, detail)
  UNION ALL
  SELECT 2, 'job planifié : ' || jobname, active, coalesce(schedule || ' · ' || command, '') FROM pg_temp.scheduled_jobs()
  UNION ALL
  SELECT 3, 'policy ' || tablename || '.' || policyname, true, permissive || ' ' || cmd || ' — ' || coalesce(left(qual, 90), '(with check)')
  FROM pg_policies WHERE tablename IN ('orders','order_items')
) AS all_checks
ORDER BY section, check_name;
