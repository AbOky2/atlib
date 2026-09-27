# Pages légales

`privacy.html` est généré depuis `src/lib/legal.ts` par `npm run legal:build` ; le test
`tests/legal.test.cjs` échoue si le fichier hébergé dérive de la source lue dans l'app.

## Avant de publier

1. Renseigner dans l'environnement EAS **production** :
   - `EXPO_PUBLIC_LEGAL_PUBLISHER` — raison sociale de l'éditeur (telle qu'elle figurera sur les fiches).
   - `EXPO_PUBLIC_LEGAL_EMAIL` — adresse de contact pour les demandes liées aux données.
2. Regénérer la page avec cet environnement chargé : `npm run legal:build`.
3. Héberger `legal/privacy.html` à une URL publique et stable (GitHub Pages, Netlify, le site de
   l'entreprise). Cette URL est obligatoire dans :
   - App Store Connect → Informations de l'app → URL de la politique de confidentialité ;
   - Play Console → Contenu de l'application → Politique de confidentialité ;
   - Play Console → Suppression de compte → URL : la même page décrit le parcours en bas.
4. Faire relire le texte par un conseil juridique : il décrit fidèlement ce que fait le code,
   pas les obligations propres à la structure qui exploite le service.

## Hébergement retenu (27 septembre 2026)

Supabase Storage sert les objets HTML en `text/plain` sur son domaine par défaut (protection anti-XSS) : la page
n'y est pas lisible. Elle est donc servie par la fonction Edge publique `privacy`, générée par `npm run legal:build`
(`supabase/functions/privacy/index.ts`) et déployée avec `--no-verify-jwt` :

https://myonaycuggsbielvdzjc.supabase.co/functions/v1/privacy

À chaque modification de `src/lib/legal.ts` : `npm run legal:build`, puis redéployer la fonction.
