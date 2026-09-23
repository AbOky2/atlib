# Décision de lancement : email et mot de passe

Configuration actuelle : voir [EMAIL_AUTH.md](EMAIL_AUTH.md) pour les redirections et l’envoi des emails.

L’inscription et la connexion visibles utilisent uniquement email/mot de passe. `src/lib/authFeatures.ts` désactive aussi les actions SMS dans le store : aucun envoi ne peut être déclenché par ce parcours. Le numéro reste un contact de livraison.

Le parcours SMS décrit ci-dessous est conservé pour une future mise à jour ; il n’est pas activé. Le réactiver demandera de passer `PHONE_SIGN_IN_ENABLED` à `true`, configurer le fournisseur et tester l’association des comptes existants en conservant leurs identifiants et historiques. Ne pas ouvrir des comptes parallèles à partir des numéros de livraison non vérifiés.

---

# Compte par téléphone — Naakul

Le parcours principal permet l'inscription et la connexion avec un numéro tchadien normalisé en +235, suivi d'un code SMS à six chiffres. `shouldCreateUser: true` est explicite ; l'envoi du code ne connecte pas l'utilisateur. La session est utilisable après la vérification OTP. L'email reste disponible pour les comptes existants.

Le numéro confirmé vient de Supabase Auth (`phone` et `phone_confirmed_at`). Le contact de livraison est indépendant, modifiable et enregistré dans `user_metadata.delivery_phone` ; il n'est jamais qualifié de numéro d'identité vérifié. Le code ne collecte ni ne consulte aucun NNI. Le contrôle d'une SIM ne suffit pas à établir l'identité civile de son utilisateur.

## Activation distante, non effectuée

- Activer l'authentification par téléphone et les inscriptions dans Supabase Auth. Configurer un fournisseur SMS compatible, ses identifiants et l'expéditeur ; tester la réception réelle sur les réseaux utilisés au Tchad.
- Configurer des OTP à six chiffres, leur expiration et les limites de fréquence côté serveur. Le délai de renvoi de 60 secondes et le blocage des doubles clics dans l'app améliorent le parcours, mais ne remplacent pas la limitation serveur.
- Vérifier quotas, coûts et protections anti-abus du fournisseur/Supabase avant ouverture publique. Aucun fournisseur n'a été souscrit ni aucun SMS envoyé par ces travaux.
- Pour un compte existant créé par email, associer un numéro par un parcours de changement de téléphone vérifié sur ce même compte avant de basculer son mode de connexion. Ne pas fusionner des comptes à partir de `user_metadata.phone`, d'un nom ou d'un contact de livraison : ce ne sont pas des preuves de propriété.
- Tester : premier compte, reconnexion, code incorrect/expiré, renvoi, SMS non reçu, fermeture/réouverture, préremplissage du contact de livraison et affichage du numéro confirmé dans le profil.

Documentation : [connexion par téléphone](https://supabase.com/docs/guides/auth/phone-login), [création via OTP](https://supabase.com/docs/reference/javascript/auth-signinwithotp), [limites de fréquence](https://supabase.com/docs/guides/auth/rate-limits).

## Validation locale

97 tests réussis et TypeScript validé. Le test du store réel vérifie la normalisation, la création explicite via OTP, l'absence de connexion avant validation, le contrôle des six chiffres, les doubles clics et le délai de renvoi. Les tests SMS réels restent à effectuer après configuration du fournisseur.
