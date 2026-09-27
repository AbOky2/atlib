# Naakul sur Android — Firebase, build et Google Play

État au 27 septembre 2026 : l'app compile pour Android sur EAS (SDK 57), la clé de signature est gérée par EAS
(keystore créée au premier build), le `versionCode` est incrémenté par EAS. Ce qui manque est **hors du code** et se
fait dans trois consoles. Dans l'ordre :

## 1. Firebase — indispensable aux notifications Android

Sans Firebase, l'app Android s'installe et fonctionne, mais aucune notification push n'arrive (l'app le tolère :
l'enregistrement du jeton échoue silencieusement et se réessaie).

1. https://console.firebase.google.com → **Ajouter un projet** → nom « Naakul » (Google Analytics : facultatif, non).
2. Dans le projet → icône Android → **Nom du package** `com.okimy.chaddelivery` → Enregistrer l'app →
   **Télécharger `google-services.json`**. Ignorer les étapes « ajouter le SDK » : Expo s'en charge.
3. Ce fichier n'est pas secret mais ne se commite pas. Le fournir à EAS comme **variable fichier** :
   ```sh
   eas env:create --environment production --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --visibility sensitive
   eas env:create --environment preview    --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --visibility sensitive
   ```
   `app.config.js` le branche automatiquement (`android.googleServicesFile`). Pour le contrôle local :
   `eas env:pull --environment production` puis `npm run release:check -- --strict --platform=android`.
4. **Clé serveur FCM V1** (ce qui permet à Supabase → Expo d'envoyer les pushs) : Firebase → Paramètres du projet →
   **Comptes de service** → « Générer une nouvelle clé privée » (fichier JSON, **secret**). Puis :
   ```sh
   eas credentials -p android
   ```
   → profil production → **Push Notifications: Manage your FCM V1 service account key** → « Set up » → chemin du JSON.
   Supprimer ensuite le JSON du disque. Ce point n'exige pas de nouveau build : EAS l'utilise côté serveur.

## 2. Build de production

```sh
eas build --platform android --profile production
```
Produit un **.aab** signé (Play App Signing). Compter 15 à 20 minutes. Le profil `preview` produit un **.apk**
installable directement sur un téléphone (autoriser « sources inconnues ») pour la recette.

## 3. Google Play Console — première publication

Compte développeur : https://play.google.com/console (25 $ une fois ; la vérification d'identité peut prendre
quelques jours — à lancer sans attendre).

1. **Créer l'application** : nom « Naakul », langue par défaut Français, Application, Gratuite.
2. **Fiche du Play Store** (Développer → Fiche principale) : textes de `store/LISTING.md` (section Google Play),
   icône `assets/icon.png`, image de présentation `store/feature-graphic.png`, captures `store/screenshots/android/`.
3. **Contenu de l'application** (menu de gauche), à compléter en entier :
   - Politique de confidentialité : `https://chad-delivery.expo.app/privacy.html`
   - Accès à l'application : « Tout ou partie des fonctionnalités est limité » → fournir `testadmin@test.td` / `test1234`
     avec la note : commande en espèces, un restaurant doit accepter (dashboard).
   - Annonces : non. Classification du contenu : questionnaire → tout « non » → Tout public.
   - Public cible : 18 ans et plus. Actualités : non. Application de suivi des contacts COVID : non.
   - Sécurité des données : réponses dans `store/LISTING.md`. Applications gouvernementales : non.
   - Fonctionnalités financières : non (pas de paiement dans l'app). Santé : non.
4. **Premier envoi, obligatoirement manuel** (Google refuse l'API tant qu'aucun bundle n'a été déposé à la main) :
   Tests → **Tests internes** → Créer une release → glisser le `.aab` téléchargé depuis EAS → nom de release
   « 1.0.0 (1) » → Enregistrer → Vérifier la release → Lancer le déploiement. Ajouter votre adresse Gmail comme
   testeur, ouvrir le lien d'adhésion, installer depuis le Play Store, et refaire la recette complète
   (inscription avec numéro, commande, acceptation côté restaurant, **notification**, annulation, suppression du compte).
5. **Production** : quand la recette est bonne, Production → Créer une release → « Ajouter depuis la bibliothèque »
   (le même bundle) → déploiement. Première revue Google : de quelques heures à quelques jours.

## 4. Envois suivants par la ligne de commande

Après le premier envoi manuel, `eas submit` peut prendre le relais :
1. Play Console → Paramètres → **Accès à l'API** → lier un projet Google Cloud → **Créer un compte de service** →
   lui donner le rôle « Administrateur de versions » sur l'app → générer une clé JSON (**secret**).
2. `eas credentials -p android` → **Google Service Account** → « Set up » → chemin du JSON (stocké chez EAS).
3. Ensuite, à chaque version :
   ```sh
   eas build --platform android --profile production
   eas submit --platform android --latest     # piste « internal », profil de eas.json
   ```
   puis promotion vers Production depuis la console.

## Points de vigilance

- Le `versionCode` vient d'EAS (`appVersionSource: remote`) : ne jamais le forcer dans `app.json`.
- La keystore de signature est chez EAS ; ne pas en créer une autre localement, sinon Play refusera les mises à jour.
- Testez sur un vrai téléphone Android : aucun émulateur n'est installé sur ce Mac.
