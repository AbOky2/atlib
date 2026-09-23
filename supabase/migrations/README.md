# Correction des commandes — déploiement à préparer

`202609050001_order_integrity.sql` est une migration sur la base existante, pas un bootstrap Supabase complet. Appliquer les anciens scripts `supabase_production.sql`, puis `supabase_notifications.sql`, avant cette migration. Ne pas rejouer les anciens scripts ensuite : ils redéfinissent `create_order`.

L'application mise à jour exige la RPC. Déployer et vérifier la migration avant de distribuer cette version de l'application. Les options payantes sont refusées tant qu'un catalogue serveur d'options n'existe pas ; les consignes libres sont enregistrées dans `order_items.note`.

Vérifier en préproduction les politiques et déclencheurs réellement installés, notamment les fonctions `is_admin`, `my_restaurant_id` et les protections de `profiles`. Les politiques restrictives ajoutées complètent les politiques permissives existantes ; elles ne remplacent pas un audit du schéma distant. La révocation des écritures directes est intentionnelle : création par RPC, modification du statut par le client autorisé seulement.

## Validation locale effectuée

PostgreSQL 14, base temporaire isolée : fixture minimale `tests/sql/fixture.sql`, migration puis `tests/sql/order_integrity.sql`, avec `ON_ERROR_STOP=1`. Tests : plat d'un autre restaurant, plat indisponible, prix altéré, quantité invalide, options non supportées, carte, zone inconnue, billet insuffisant, répétition idempotente, consigne conservée, isolation des lectures, clé connue d'un autre client, droits de modification des montants et statuts, expiration réservée, transitions légales et terminales.

La fixture ne reproduit pas l'intégralité des contraintes, extensions et politiques de production. Aucune migration distante n'a été exécutée.

## Notifications et récupération du mot de passe

Le second lot ajoute une file durable, ses reprises et les reçus Expo dans `202609060001_notification_outbox.sql`. Suivre [DEPLOIEMENT_NOTIFICATIONS.md](DEPLOIEMENT_NOTIFICATIONS.md) pour l'ordre migration/fonction/build natif, le job cron, les liens Auth et les tests sur appareil. La fonction `notify-order` attend désormais un `event_id` et conserve l'authentification serveur explicite.


## Ordre complet des migrations (23 septembre 2026)

1. `202609050001_order_integrity.sql` — RPC `create_order` validée, garde des transitions, expiration.
2. `202609060001_notification_outbox.sql` puis `202609140001_notification_resilience.sql` — file de notifications.
3. `202609220001_account_deletion.sql` — `account_deletion_blocker()` (client) et `erase_customer_data()` (service_role,
   appelée par l’Edge Function `delete-account`).
4. `202609230001_order_lifecycle.sql` — `cancellation_reason`, `accepted_at`, réception confirmée par le client,
   `expire_stale_orders(pending_after, abandoned_after)`, jobs `pg_cron` créés si l’extension est active.
5. `202609230002_access_hardening.sql` — droits par colonne sur `restaurants`, aucune lecture anonyme des commandes.

`npm run test:sql` rejoue tout sur un PostgreSQL 14 jetable (initdb requis) ; la CI le fait sur un service Postgres.
