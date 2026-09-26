# Connexion Google et Apple — mise en service

Objectif : un client se connecte avec le compte que son téléphone a déjà, sans mot
de passe ni SMS payant. Le numéro de livraison reste saisi et contrôlé à la commande.

Le code est en place (`src/lib/socialAuth.ts`, boutons dans `app/login.tsx`). Les
boutons n'apparaissent que lorsque la configuration ci-dessous existe : pas de
bouton mort. Trois consoles sont à renseigner, puis un build natif.

## 1. Apple (iPhone) — obligatoire dès qu'un autre fournisseur est proposé

1. developer.apple.com → Certificates, Identifiers & Profiles → Identifiers →
   `com.okimy.chaddelivery` → cocher **Sign In with Apple** → Save.
2. Supabase → Authentication → Providers → **Apple** → Enabled. Dans
   « Authorized Client IDs », mettre `com.okimy.chaddelivery` (le flux natif
   n'a besoin ni de Services ID ni de clé secrète ; ceux-ci ne servent qu'au web).
3. `app.json` porte déjà `ios.usesAppleSignIn: true` ; EAS ajoute la capacité au
   profil de provisionnement lors du prochain build.

## 2. Google (Android et iPhone)

1. console.cloud.google.com → projet Naakul → APIs & Services → OAuth consent
   screen : type External, nom « Naakul », e-mail d'assistance, logo. Publier.
2. Credentials → Create credentials → OAuth client ID, trois fois :
   - **Web application** : aucune URI n'est nécessaire pour le flux natif.
     → `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
   - **iOS** : bundle `com.okimy.chaddelivery`.
     → `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` ; sa forme inversée (affichée par la
     console, `com.googleusercontent.apps.…`) → `GOOGLE_IOS_URL_SCHEME`
   - **Android** : package `com.okimy.chaddelivery` et l'empreinte SHA-1 de la
     clé de signature EAS (`eas credentials -p android`, section Keystore).
     Rien à copier dans l'app : Google fait le lien par le package et l'empreinte.
3. Supabase → Authentication → Providers → **Google** → Enabled. Client ID = le
   client **Web** ; cocher « Skip nonce checks » (le SDK natif iOS n'envoie pas
   de nonce). Le secret n'est pas requis pour le flux par jeton d'identité.
4. Renseigner les trois variables dans l'environnement EAS (`eas env:create`,
   profils preview et production) et dans `.env` en local.

## 3. Build et vérification

- `eas build --profile preview` (les deux modules sont natifs : un build est
  indispensable, un simple `expo start` ne suffit pas).
- Sur un iPhone : « Continuer avec Apple » ouvre la feuille système, la session
  s'ouvre, le nom apparaît sur le profil dès la première fois.
- Sur un Android : « Continuer avec Google » ouvre le sélecteur de comptes.
- Si Supabase répond « provider is not enabled », l'app affiche « Cette
  connexion n'est pas encore activée » : revenir à l'étape Providers.

## Ce que l'app fait, et ne fait pas

- Le jeton d'identité est vérifié par Supabase (signature, audience, nonce pour
  Apple). L'app ne fait que le relayer.
- Un compte e-mail existant avec la même adresse est fusionné automatiquement
  par Supabase quand l'e-mail est vérifié des deux côtés.
- Aucune donnée n'est demandée au-delà du nom et de l'e-mail. Le numéro reste
  demandé à la commande, là où il sert.
