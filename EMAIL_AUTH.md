# Lancement avec email et mot de passe

Le code local utilise Supabase Auth avec email/mot de passe. Les SMS restent désactivés. L’inscription transmet `chaddelivery://confirm-email` comme destination ; l’écran de confirmation échange les identifiants, vérifie la confirmation de l’adresse et propose de continuer. Le mot de passe oublié utilise `chaddelivery://reset-password`.

## Réglages à appliquer dans Supabase

Ces réglages distants n’ont pas été effectués par les corrections locales.

1. Dans Authentication, activer le fournisseur Email, les inscriptions et la confirmation de l’email. Configurer un minimum de huit caractères pour les nouveaux mots de passe.
2. Dans URL Configuration, ajouter exactement `chaddelivery://confirm-email` et `chaddelivery://reset-password` aux Redirect URLs.
3. Conserver `{{ .ConfirmationURL }}` dans les modèles de confirmation d’inscription et de récupération : Supabase valide le lien puis redirige vers la destination fournie par l’application. Le client utilise le flux implicite ; les liens avec uniquement `code` (PKCE) ne sont pas pris en charge.
4. Configurer un SMTP pour envoyer les emails aux utilisateurs publics : hôte, port, identifiant, mot de passe et adresse d’expédition, uniquement côté Supabase. Le serveur intégré de Supabase est réservé aux essais et n’envoie qu’aux adresses autorisées de l’équipe. Vérifier le domaine d’envoi et les limites de fréquence avec le fournisseur choisi.

Sources : [redirections mobiles Supabase](https://supabase.com/docs/guides/auth/native-mobile-deep-linking) et [configuration SMTP](https://supabase.com/docs/guides/auth/auth-smtp), consultées le 6 septembre 2026.

## Vérification avant ouverture publique

Utiliser une version native installée avec le schéma `chaddelivery`, et non Expo Go. Créer un compte de test, ouvrir l’email sur le même téléphone, vérifier la confirmation et la session, puis se déconnecter et se reconnecter. Refaire l’ouverture avec l’application fermée. Vérifier un lien expiré/déjà utilisé ainsi que le parcours mot de passe oublié et la connexion avec le nouveau mot de passe. Ne jamais copier les jetons des liens dans les journaux ou captures.

Les tests locaux couvrent le routage, les types de liens refusés, l’échange Supabase simulé et la destination transmise par l’inscription. La réception réelle des emails et l’ouverture sur appareil restent à vérifier après configuration distante.


## Flux PKCE (23 septembre 2026)

Le client Supabase est configuré avec `flowType: 'pkce'`. Les liens de confirmation et de récupération
arrivent sous la forme `chaddelivery://confirm-email?code=…` / `chaddelivery://reset-password?code=…` et sont
échangés par `exchangeCodeForSession`. Les anciens liens implicites (`#access_token=…`) et `token_hash` sont
refusés : un lien forgé ne peut plus installer une session étrangère sur le téléphone d’un client. Contrepartie
assumée : le lien doit être ouvert sur l’appareil qui a fait la demande ; l’adresse est confirmée côté serveur
quoi qu’il arrive, et l’écran indique de se connecter par mot de passe si l’échange échoue.
