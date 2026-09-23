# Préparation de la sortie Naakul — 8 septembre 2026, mise à jour le 23 septembre 2026

## État de validation

Le propriétaire confirme que le suivi fonctionne sur son iPhone. Cet essai est enregistré comme validation utilisateur iOS ; le numéro du binaire et les scénarios précis n’ont pas été fournis. La recette Android reste ouverte.

Vérifications locales : 120 tests réussis, TypeScript mobile et dashboard sans erreur, lint dashboard sans erreur (quatre avertissements images préexistants). Les vérifications précédentes ont aussi validé les transactions SQL sur une fixture jetable, le typecheck du widget Swift et les exports JavaScript natifs. Ces résultats ne certifient pas le schéma Supabase distant ni les credentials de production.

Le compte EAS connecté a été vérifié en lecture seule : `okimy`, projet `@okimy/chad-delivery`, ID `faf27282-9135-45c0-a820-0c8d3ea053f0`. Les trois derniers builds consultés sont des builds iOS internes du profil development ; aucun nouveau build ni aucune soumission n’a été lancé pendant cette préparation.

## Configuration préparée

- `eas.json` : versions de build distantes avec incrémentation automatique, environnements explicitement définis, Node 22.13.1 et production pour les stores ; Android produit un app-bundle.
- `app.config.js` conserve app.json et accepte le fichier Firebase client via `GOOGLE_SERVICES_JSON`, variable de type fichier dans EAS.
- `.env.example` décrit le support public et le fichier Firebase. Les clés APNs, Supabase service-role et FCM de compte de service restent exclusivement côté serveur ou dans EAS Credentials.
- `npm run release:verify` exécute tests, TypeScript et contrôle local de configuration. Ce mode signale les paramètres absents sans bloquer le travail local.
- `npm run release:check -- --strict --platform=ios` bloque si les paramètres locaux iOS requis sont absents ; utiliser `--platform=android` pour inclure Firebase. Exécuter avec l’environnement de production chargé. Ce contrôle ne valide pas les exigences des stores ni les services distants.

## Points à fermer avant publication publique

1. **Support et confidentialité** : fournir le vrai numéro WhatsApp du support ; configurer `EXPO_PUBLIC_SUPPORT_PHONE` dans EAS production. Fournir la politique de confidentialité publique et la rendre accessible dans l’app et les fiches stores. Ne pas publier des coordonnées fictives.
2. **Suppression du compte** : aucun parcours n’a été trouvé dans le code. Apple exige un moyen d’initier la suppression dans les apps qui permettent de créer un compte. Concevoir et implémenter le traitement, y compris le sort des données de commande qui doivent éventuellement être conservées, avant la soumission publique. [Exigence Apple](https://developer.apple.com/support/offering-account-deletion-in-your-app/).
3. **Backend** : appliquer et vérifier les migrations sur le projet cible, l’auth email et SMTP, les deux liens de redirection, `pg_net`, le job de reprise, les secrets APNs et les reçus. Lire [EMAIL_AUTH.md](EMAIL_AUTH.md) et [le runbook backend](supabase/migrations/DEPLOIEMENT_NOTIFICATIONS.md). Les migrations locales ne prouvent pas leur déploiement.
4. **Android** : fournir la configuration Firebase client correspondant à `com.okimy.chaddelivery` via la variable fichier `GOOGLE_SERVICES_JSON`, et configurer séparément le compte de service FCM V1 dans EAS Credentials. Le fichier client n’est pas la clé privée de compte de service. Tester l’app installée et les notifications avant une sortie Android. [Instructions Expo](https://docs.expo.dev/push-notifications/fcm-credentials/).
5. **Ajouts acceptés précédemment** : le renvoi de l’email de confirmation et le motif de refus client restent à implémenter ; ils ne sont pas inclus dans cette préparation EAS.
6. **Binaire candidat** : installer le build store/TestFlight et refaire inscription, commande cash, réception restaurant, suivi verrouillé, livraison, annulation et reconnexion. Les credentials APNs production doivent correspondre à ce binaire ; le succès d’un build de développement ne les valide pas.

## Ordre recommandé pour la livraison

1. Fermer les points applicatifs et de configuration ci-dessus. Sauvegarder et vérifier le backend ; déployer les migrations et la fonction compatible avant l’application qui en dépend. Ne pas rejouer les anciens scripts SQL après les migrations.
2. Exécuter `npm run release:verify`, puis le contrôle strict de la plateforme ciblée. Le support n’est actuellement pas défini dans l’environnement local ; le mode strict le signale volontairement.
3. Revoir et sauvegarder les modifications Git avant la livraison. Aucun commit de sortie n’a été créé automatiquement ; le répertoire contient l’ensemble des corrections des passes précédentes.
4. Vérifier les versions déjà utilisées dans les stores avant le premier build avec la source remote. Si nécessaire, synchroniser la dernière version avec `eas build:version:set` plutôt que repartir d’un numéro arbitraire. [Versionnement EAS](https://docs.expo.dev/build-reference/app-versions/).
5. Construire le candidat iOS :

```sh
eas build --platform ios --profile production
```

6. Après succès, soumettre **l’identifiant exact du build revu**, via `eas submit --platform ios --id IDENTIFIANT_DU_BUILD`, pour traitement App Store Connect/TestFlight. Ne pas utiliser `--latest` si plusieurs builds ont été créés. Préparer la fiche, les captures, les déclarations de données et les accès de revue avant la soumission App Review. La publication publique est une étape distincte.
7. Construire Android avec `eas build --platform android --profile production`, seulement après configuration Firebase et recette Android ; commencer par une piste de test Play Console.

Le CLI installé est 16.17.4 ; il annonce une version plus récente. Aucune installation globale n’a été modifiée. Si le service exige un CLI récent pour SDK 56, mettre à jour le CLI avant de construire, sans changer simultanément les dépendances applicatives validées.

Les modifications natives de notifications et ActivityKit nécessitent un nouveau binaire. Elles ne se distribuent pas uniquement par mise à jour JavaScript.

## Après ouverture

Surveiller les commandes PENDING non prises en charge, les événements de notification non terminés et les erreurs de reçus Expo. Vérifier le contact support et garder un moyen de fermer la prise de nouvelles commandes en cas d’incident. Conserver la migration d’intégrité même si un retour à une précédente interface devient nécessaire.


## Mise à jour du 23 septembre 2026 — revue finale

L’application s’appelle désormais **Naakul** (« manger », arabe tchadien). Les identifiants techniques
(`slug`, `bundleIdentifier`, `scheme chaddelivery`, projet EAS, stockage local) n’ont pas changé.

### Nouveautés à déployer, dans cet ordre

1. Migrations SQL, après les précédentes : `202609220001_account_deletion.sql`, `202609230001_order_lifecycle.sql`,
   `202609230002_access_hardening.sql`. Rejouables localement avec `npm run test:sql`. `supabase/verify_remote.sql`
   vérifie leur présence sur le projet distant.
2. Edge Functions : `supabase functions deploy notify-order` (motif d’annulation, heure d’arrivée basée sur
   l’acceptation) et `supabase functions deploy delete-account` (suppression de compte, JWT vérifié).
3. Supabase Auth : le client utilise désormais le flux **PKCE**. Les URL de redirection restent
   `chaddelivery://confirm-email` et `chaddelivery://reset-password` ; le modèle d’email standard
   (`{{ .ConfirmationURL }}`) convient. Un lien ne s’ouvre que sur le téléphone qui l’a demandé : c’est voulu
   (protection contre la fixation de session), et l’écran l’explique.
4. Variables d’environnement EAS production : `EXPO_PUBLIC_SUPPORT_PHONE`, `EXPO_PUBLIC_LEGAL_PUBLISHER`,
   `EXPO_PUBLIC_LEGAL_EMAIL` (optionnel : `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`).
   Puis `npm run legal:build` avec cet environnement chargé et héberger `legal/privacy.html` (URL exigée par
   les deux stores — voir `legal/README.md`).
5. Nouveau binaire natif : icônes et splash Naakul, icône de notification Android, `supportsTablet: false`,
   langue de développement `fr`. `npx expo export` passe ; la recette sur appareils reste à faire.

### Ce que couvre maintenant l’app

- Suppression de compte dans Profil → Confidentialité (refusée tant qu’une commande est en cours ; les
  commandes passées sont conservées anonymisées).
- Politique de confidentialité lisible dans l’app et générée en page hébergeable depuis la même source.
- Motif d’annulation choisi par le restaurant (mobile et web), transmis au client par push et affiché dans le suivi.
- Le client confirme la réception d’une livraison ; les commandes fantômes sont clôturées par `expire_stale_orders`
  (20 min sans confirmation, 12 h sans clôture) planifiée par la migration si `pg_cron` est actif.
- Dashboard web : alerte sonore + notification navigateur + compteur d’onglet à chaque nouvelle commande.

### Reste hors du code

- Recette sur iPhone et Android (aucun simulateur disponible pendant cette passe).
- Rapport de crash (Sentry ou équivalent) : à ajouter avec un rebuild natif et un DSN.
- Comptes de démonstration pour la revue Apple/Google, avec un restaurant qui répond.
