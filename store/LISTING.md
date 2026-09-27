# Fiches App Store et Google Play — Naakul

Textes prêts à coller, préparés le 27 septembre 2026. Les longueurs respectent les limites de chaque store.
Les captures sont dans `store/screenshots/ios-6.9` (1320 × 2868), `store/screenshots/ios-6.5` (1284 × 2778) et `store/screenshots/android`
(1080 × 2160). Elles sont composées par `scripts/store/compose.swift` à partir de captures brutes du simulateur
iPhone 17 Pro Max (barre d'état figée à 9:41 ; sur Android, la barre d'état est rognée pour rester neutre :
l'interface est identique sur les deux plateformes). Pour les refaire : capturer les écrans, puis
`swift scripts/store/compose.swift <Manrope ExtraBold.ttf> <capture.png> <sortie.png> 1320 2868 "<titre>"`
(ajouter `186` en dernier argument pour rogner la barre d'état).

## Identité commune

| Champ | Valeur |
|---|---|
| Nom | Naakul |
| Éditeur / Copyright | © 2026 ISSA OKI SOUMAINE ABDRAMANE |
| Catégorie | Nourriture et boissons (App Store : Food & Drink ; Play : Alimentation et boissons) |
| URL d'assistance | https://wa.me/23566123456 |
| URL marketing | facultative ; laisser vide, ou l'adresse où `legal/privacy.html` est hébergée |
| URL de confidentialité | l'adresse où `legal/privacy.html` est hébergée (obligatoire sur les deux stores) |
| Compte de revue | `testadmin@test.td` / `test1234` — catalogue de démonstration, commandes en espèces, un restaurant doit accepter pendant l'examen (dashboard) |
| Classification | 4+ / Tout public : aucun contenu sensible, aucun achat intégré, paiement en espèces à la livraison |

## App Store (App Store Connect)

**Nom** (30 max) : `Naakul`

**Sous-titre** (30 max) : `Livraison de repas à N'Djamena`

**Texte promotionnel** (170 max, modifiable sans nouvelle version) :
`Les meilleures tables de N'Djamena livrées chez vous. Commandez en quelques gestes, payez en espèces à la réception, suivez votre commande en direct.`

**Mots-clés** (100 max, séparés par des virgules, sans espaces) :
`livraison,repas,restaurant,ndjamena,tchad,manger,commande,burger,pizza,grillades,plats,cuisine`

**Description** (4000 max) :

```
Naakul — « manger », en arabe tchadien — c'est la livraison de repas pensée pour N'Djamena.

Choisissez un restaurant, composez votre commande, et recevez-la chez vous. Pas de carte bancaire : vous réglez en espèces à la réception, et vous indiquez à l'avance avec quel billet vous paierez pour que le restaurant prépare votre monnaie.

CE QUE VOUS TROUVEZ DANS NAAKUL
• Les restaurants de N'Djamena, avec leur carte, leurs prix et leurs photos.
• Des cuisines pour trouver vite : plats locaux, grillades, pizzas, burgers.
• Une adresse décrite comme on le fait ici : le quartier, puis un repère précis (portail, commerce, couleur du mur).
• Un temps de livraison estimé selon votre quartier.
• Le suivi de votre commande étape par étape : acceptée, en cuisine, prête, en route, livrée. Sur iPhone, l'heure d'arrivée s'affiche sur l'écran verrouillé et dans la Dynamic Island.
• Des notifications à chaque étape.
• L'annulation tant que le restaurant n'a pas accepté.
• Vos adresses et vos restaurants favoris, enregistrés pour la prochaine fois.

SIMPLE ET HONNÊTE
• Un compte avec votre e-mail et votre numéro de téléphone : c'est le numéro que le restaurant appelle à l'arrivée.
• Aucun paiement en ligne, aucune donnée bancaire.
• Aucune publicité, aucun suivi entre applications.
• La suppression de votre compte se fait depuis l'application.

Naakul est un service local, à N'Djamena. Une question ? L'assistance vous répond sur WhatsApp depuis Profil → Aide.
```

**Nouveautés de cette version** (4000 max) :
`Première version de Naakul : commandez auprès des restaurants de N'Djamena, payez en espèces à la livraison et suivez votre commande en direct.`

**Captures d'écran** : deux emplacements dans App Store Connect → Distribution → version → Aperçus et captures.
- « Écran de 6,9 pouces » (obligatoire) : `store/screenshots/ios-6.9/` (1320 × 2868).
- « Écran de 6,5 pouces » (facultatif, sinon Apple réutilise les 6,9) : `store/screenshots/ios-6.5/` (1284 × 2778).
Chaque dossier reçoit ses propres fichiers : un fichier glissé dans le mauvais emplacement est refusé pour ses dimensions.

**Confidentialité de l'app (App Privacy)** — données collectées, liées à l'identité, non utilisées pour le suivi :
- Coordonnées : nom, adresse e-mail, numéro de téléphone, adresse physique (adresse de livraison) — fonctionnalité de l'app.
- Achats : historique des commandes — fonctionnalité de l'app.
- Identifiants : identifiant utilisateur — fonctionnalité de l'app.
- Diagnostic : aucun (pas de rapport de crash tant que Sentry n'est pas ajouté).
Aucune donnée n'est utilisée pour la publicité ni partagée avec des tiers à des fins de suivi.

**Notes pour l'examen** :
```
Compte de test : testadmin@test.td / test1234 (déjà confirmé).
L'app est un service de livraison de repas à N'Djamena (Tchad). Le paiement se fait en espèces à la réception : aucun achat intégré, aucun paiement en ligne.
Parcours : ouvrir un restaurant, ajouter un plat, Commander, choisir un quartier et décrire le point de livraison, Vers le paiement, Envoyer au restaurant. Le suivi affiche la progression ; une commande non acceptée sous 20 minutes est annulée automatiquement, et le client peut l'annuler lui-même tant qu'elle est en attente.
La suppression du compte est dans Profil → Confidentialité → Supprimer mon compte.
```

## Google Play (Play Console)

**Nom de l'application** (30 max) : `Naakul`

**Description courte** (80 max) :
`Repas livrés à N'Djamena. Payez en espèces à la réception, suivez en direct.`

**Description complète** (4000 max) : reprendre la description App Store ci-dessus, en remplaçant la phrase sur la Dynamic Island par : « Vous recevez une notification à chaque étape. »

**Catégorie** : Alimentation et boissons. **Type** : Application.

**Adresse e-mail de contact** : la même que `EXPO_PUBLIC_LEGAL_EMAIL`. **Site web** : facultatif.

**Captures d'écran téléphone** : 2 minimum, 8 maximum, format 9:16 conseillé, ratio maximal 2:1 — dossier `store/screenshots/android/` (1080 × 2160).
**Icône** : `assets/icon.png` (512 × 512 exigés : la console redimensionne le 1024). **Image de présentation** (1024 × 500, obligatoire) : `store/feature-graphic.png`.

**Sécurité des données** (questionnaire) :
- Collecte : nom, e-mail, numéro de téléphone, adresse (livraison), historique d'achats (commandes), identifiant utilisateur. Toutes chiffrées en transit, suppression possible depuis l'app.
- Finalité : fonctionnalité de l'application et gestion du compte. Aucune publicité, aucun partage avec des tiers, aucune donnée de localisation GPS.
- Les données sont traitées par Supabase (hébergeur du service) pour le compte de l'éditeur.

**Questionnaire de classification** : aucune violence, aucun contenu sexuel, aucune substance, aucun jeu d'argent, aucune interaction sociale entre utilisateurs, aucune localisation partagée → classification « Tout public ».

**Public cible** : 18 ans et plus (commande et paiement à la livraison), l'app ne s'adresse pas aux enfants.

**Notes pour l'examen** : mêmes notes que pour Apple, avec le compte `testadmin@test.td`.

## Textes des captures (les mêmes sur les deux stores)

1. Accueil — « Les tables de N'Djamena, livrées chez vous »
2. Fiche restaurant — « La carte, les prix, sans surprise »
3. Fiche plat — « Personnalisez chaque plat »
4. Récapitulatif — « Payez en espèces à la réception »
5. Suivi — « Suivez votre commande en direct »
