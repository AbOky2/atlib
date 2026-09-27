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
| URL marketing | facultative ; laisser vide |
| URL de confidentialité | https://chad-delivery.expo.app/privacy.html (EAS Hosting ; republier avec `npm run legal:deploy` après `npm run legal:build`) |
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

## App Store — localisation anglaise (si la fiche garde « English (U.S.) »)

App Store Connect exige ces champs dans la langue principale de la fiche. Si celle-ci reste l'anglais, coller :

**Name** (30) : `Naakul`

**Subtitle** (30) : `Food delivery in N'Djamena`

**Promotional text** (170) :
`N'Djamena's best tables, delivered to your door. Order in a few taps, pay cash on delivery, follow your order live.`

**Keywords** (100) :
`food,delivery,restaurant,ndjamena,chad,order,burger,pizza,grill,meals,dinner,lunch,takeaway`

**Support URL** : `https://wa.me/23566123456`

**Marketing URL** : leave empty. **Privacy Policy URL** : `https://chad-delivery.expo.app/privacy.html`

**Description** (4000) :

```
Naakul — "to eat", in Chadian Arabic — is food delivery designed for N'Djamena.

Pick a restaurant, build your order, and get it delivered to your door. No bank card needed: you pay cash when your order arrives, and you tell us in advance which note you'll pay with so the restaurant brings your change.

WHAT YOU'LL FIND IN NAAKUL
• N'Djamena's restaurants, with their menus, prices and photos.
• Cuisines to find what you want fast: local dishes, grills, pizzas, burgers.
• An address described the way people do here: the neighbourhood, then a precise landmark (gate, shop, wall colour).
• An estimated delivery time based on your neighbourhood.
• Order tracking step by step: accepted, cooking, ready, on its way, delivered. On iPhone, the arrival time shows on the Lock Screen and in the Dynamic Island.
• A notification at every step.
• Cancel for free until the restaurant accepts.
• Your addresses and favourite restaurants, saved for next time.

SIMPLE AND HONEST
• An account with your email and phone number — the number the restaurant calls on arrival.
• No online payment, no card details.
• No ads, no cross-app tracking.
• Delete your account from within the app.

Naakul is a local service in N'Djamena. Questions? Support answers on WhatsApp from Profile → Help.
```

**What's New** (4000) :
`First release of Naakul: order from N'Djamena's restaurants, pay cash on delivery and follow your order live.`

**Review notes** : same as the French notes, in English if preferred:
```
Test account: testadmin@test.td / test1234 (already confirmed).
Naakul is a cash-on-delivery food delivery service in N'Djamena, Chad: no in-app purchases, no online payment.
Flow: open a restaurant, add a dish, Commander, pick a neighbourhood and describe the delivery point, Vers le paiement, Envoyer au restaurant. Tracking shows progress; an order not accepted within 20 minutes is cancelled automatically, and the customer can cancel while it is pending.
Account deletion: Profil → Confidentialité → Supprimer mon compte.
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

**Suppression de compte** (Contenu de l'application → Suppression de compte) : méthodes de création de compte =
cocher uniquement « Nom d'utilisateur et mot de passe » (e-mail + mot de passe ; ne pas cocher « autres méthodes »
ni OAuth). URL de suppression : `https://chad-delivery.expo.app/supprimer-compte.html`. Aux questions suivantes :
la suppression du compte supprime aussi les données associées ; certaines données sont conservées (commandes
anonymisées pour la comptabilité des restaurants) ; les utilisateurs peuvent demander la suppression de données
sans supprimer le compte (par e-mail).

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
