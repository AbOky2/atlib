# Validation du suivi iOS et Android — 7 septembre 2026

## Complément du 8 septembre 2026

Le propriétaire a testé sur son iPhone et rapporte un fonctionnement parfait. Validation utilisateur iOS enregistrée ; version du binaire et détail des scénarios non fournis. La recette Android et le nouveau binaire store restent à vérifier. Voir PRODUCTION.md.

## Verdict de la passe locale du 7 septembre

Les vérifications locales passent. Le fonctionnement sur appareil réel, application verrouillée ou arrêtée, n’est pas encore certifié. Aucun appareil connecté ni runtime de simulateur utilisable n’a été détecté lors de cette passe ; l’outil Android adb n’est pas disponible au chemin SDK habituel. Aucun envoi réel APNs/Expo/FCM n’a été effectué.

Les deux ajouts autorisés (renvoi de confirmation email et motif de refus) restent à effectuer après cette priorité de validation du suivi.

## Défauts corrigés pendant cette passe

- Le module Expo Notifications est recherché via `requireOptionalNativeModule`, comme les modules Expo installés, au lieu de dépendre uniquement des registres React Native.
- Les réponses aux appuis sur une notification sont distinguées par version, commande et date ; l’identifiant Android unique de remplacement ne bloque plus les appuis suivants.
- La notification Android transporte la version et le propriétaire avec la référence de commande.
- Le suivi utilise l’ETA enregistrée côté serveur. L’heure est calculée dans le fuseau de N’Djamena (UTC+1), comme le worker APNs, au lieu du fuseau du téléphone.
- Une erreur de lecture du jeton Live Activity ou une configuration APNs absente avec jeton existant n’est plus acquittée silencieusement : le worker échoue pour permettre une reprise.

## Preuves locales

- 120 tests JavaScript réussis, aucun échec.
- Les nouveaux tests chargent les vrais gestionnaires JS et le pont iOS, avec les appels natifs et réseau simulés. Ils vérifient : cycle complet Android, identifiant de remplacement stable, fin livrée/annulée, événements anciens/dupliqués, nouvelle commande, traitement headless `dataString`, changement de compte pendant un appel natif, reprise après erreur et appuis successifs.
- Le transport APNs réel est testé avec une clé EC éphémère créée uniquement pour le test et un transport HTTP simulé : signature JWT, hôte sandbox, sujet Live Activity, version serveur, événement de fin et refus temporaire.
- TypeScript mobile : réussi.
- Widget Swift/Dynamic Island : `swiftc -typecheck` réussi avec SDK iPhoneSimulator et cible iOS 16.2 ; ce n’est pas un rendu dans un simulateur.
- Module Expo Swift : analyse syntaxique réussie ; compilation complète avec les dépendances Expo et signature non effectuée.
- Exports JavaScript iOS et Android : réussis ; ils ne remplacent pas des binaires natifs installés.

## Recette native nécessaire

Préparer un iPhone compatible Dynamic Island sous iOS 16.2 ou ultérieur et un téléphone Android avec services Google. Installer les binaires natifs correspondants, avec l’extension widget, les notifications et la tâche d’arrière-plan. Expo Go ne valide pas ce parcours.

Vérifier d’abord l’environnement de recette : migrations/outbox, tâche planifiée, fonction `notify-order`, credentials Expo/FCM et APNs. Le bundle APNs doit correspondre à celui du binaire ; choisir sandbox ou production selon sa signature. Voir `supabase/migrations/DEPLOIEMENT_NOTIFICATIONS.md`. Ne pas placer de clés serveur dans l’application.

| Scénario sur chaque appareil | Résultat attendu |
|---|---|
| Commander puis verrouiller pendant PENDING | Suivi créé, indiquant l’attente du restaurant |
| Accepter, préparer, prête, départ, livraison depuis le restaurant | Statuts cohérents ; une seule activité/notification de suivi ; fin explicite |
| Refuser/annuler pendant PENDING | Annulation visible, aucun affichage suggérant une livraison en cours |
| Réouvrir puis verrouiller à chaque étape | Pas de duplication ni retour à un ancien état |
| Appuyer sur le suivi après plusieurs étapes puis sur une autre commande | Bonne référence ouverte à chaque fois |
| Couper le réseau puis le rétablir | Reprise du statut serveur ; aucune commande supplémentaire |
| Déconnexion/changement de compte | Ancien suivi retiré ; aucune donnée de l’ancien compte affichée |
| Notifications/Live Activities désactivées | Suivi dans l’app toujours utilisable |
| Téléphone réglé sur un autre fuseau | Même heure estimée de N’Djamena dans l’app et sur le suivi |

Tester séparément l’application en arrière-plan, arrêtée normalement et forcée à l’arrêt. Le système peut différer ou empêcher le traitement en arrière-plan, notamment avec certaines restrictions Android : aucun test local ne permet de promettre une réception inconditionnelle.

Références : [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/), [Live Activities et APNs — Apple](https://developer.apple.com/documentation/activitykit/starting-and-updating-live-activities-with-activitykit-push-notifications). La détection des modules a également été vérifiée dans les sources Expo Notifications installées du projet.
