# Déploiement du second lot

Aucune des opérations distantes ci-dessous n'a été exécutée.

## Ordre de livraison

1. En préproduction, sauvegarder le schéma et vérifier ses politiques/déclencheurs. Appliquer la migration d'intégrité, puis `202609060001_notification_outbox.sql`, puis `202609140001_notification_resilience.sql` (reprises bornées à dix tentatives puis lettre morte `failed_at`, vérification des reçus réservée au job planifié, policy RLS évaluée une fois par requête). La fonction `notify-order` livrée avec cette dernière migration classe les refus définitifs Expo/APNs et ne renvoie plus un push aux appareils qui l'ont déjà accepté.
2. Déployer `notify-order` avec vérification JWT activée. L'ancienne charge utile `record` est remplacée par `event_id` ; la migration et la fonction doivent être livrées ensemble. Pendant leur décalage, les événements restent stockés et seront repris.
3. Vérifier `app_settings.edge_url`, `app_settings.service_key`, les secrets APNs et l'extension `pg_net`. Ne jamais placer ces secrets dans le bundle mobile.
4. Activer `pg_cron`, puis créer le job `noir-notification-retries` chaque minute avec `SELECT public.dispatch_order_notifications()`. Vérifier d'abord si ce job existe pour ne pas le dupliquer. Sans ce job, l'envoi immédiat fonctionne mais la reprise après interruption n'est pas garantie.
5. Construire et distribuer de nouveaux binaires iOS/Android : le paquet natif `expo-task-manager` et les modifications ActivityKit ne sont pas une simple mise à jour JavaScript. L'entrée du bundle est désormais `index.js`, qui déclare le gestionnaire avant Expo Router.
6. Suivre aussi [EMAIL_AUTH.md](../../EMAIL_AUTH.md) pour la confirmation d’inscription et le SMTP. Ajouter `chaddelivery://confirm-email` et `chaddelivery://reset-password` aux URL de redirection autorisées dans Supabase Auth. Le flux configuré est implicite ; le lien contient `type=recovery` et les deux jetons. Un modèle d'email personnalisé peut aussi utiliser `type=recovery&token_hash=…`. Un email réel doit être essayé sur appareil, application ouverte puis fermée. La clé PKCE `code` n'est pas acceptée par ce parcours implicite.
7. Configurer le vrai `EXPO_PUBLIC_SUPPORT_PHONE` avant le build.

## Vérifications sur appareils

- iOS : créer une commande, constater « En attente du restaurant », quitter l'app avant acceptation, vérifier les mises à jour APNs, la reprise après relancement, puis livraison et annulation. Le widget d'annulation affiche une croix et ne suggère plus une arrivée.
- Android : vérifier l'enregistrement `progress_version=1`, recevoir plusieurs phases en arrière-plan, vérifier qu'une seule notification de suivi reste affichée et que l'état final n'est plus persistant. Tester un push retardé et le changement de compte.
- Les anciens binaires Android conservent les notifications visibles classiques. Les nouveaux reçoivent une charge de données traitée par le gestionnaire de fond. Le système peut différer ou bloquer les messages, notamment après arrêt forcé ; aucune garantie de livraison absolue n'est annoncée.
- Réseau : interrompre Expo/APNs puis rétablir, vérifier les tentatives, les reçus et l'état final. Le modèle est au moins une livraison : un arrêt entre acceptation par le fournisseur et enregistrement local peut produire un doublon. Les statuts Android sont dédupliqués par version.

## Exploitation

Surveiller `order_notification_events` : ancienneté des lignes sans `completed_at`, `attempts`, `last_error`, et les lettres mortes (`failed_at IS NOT NULL`) ainsi que les événements terminés avec un `last_error` (refus définitif d'un appareil, par exemple `InvalidCredentials` quand FCM n'est pas configuré). Les reprises ont un délai croissant plafonné à une heure ; les événements échus ne sont pas supprimés automatiquement. La prise en charge est exclusive pendant deux minutes et les confirmations utilisent un identifiant de prise en charge unique.

Surveiller `order_push_receipts.error`. Les reçus sont recherchés après quinze minutes, puis pendant vingt-quatre heures. `DeviceNotRegistered` supprime le jeton concerné ; `MessageRateExceeded` remet l'événement en file. Les erreurs de configuration et les reçus absents restent visibles pour intervention. Un reçu `ok` signifie acceptation par le service de notification, pas lecture par le client.

Ne pas rejouer les scripts SQL historiques après ces migrations. Prévoir une rétention opérationnelle pour les événements terminés/reçus ; garder les événements encore en attente.

Documentation utilisée : [Expo notifications](https://docs.expo.dev/versions/latest/sdk/notifications/), [comportement en arrière-plan](https://docs.expo.dev/push-notifications/what-you-need-to-know/), [liens mobiles Supabase](https://supabase.com/docs/guides/auth/native-mobile-deep-linking).
