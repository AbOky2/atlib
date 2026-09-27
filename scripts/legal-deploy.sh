#!/bin/zsh
# Publie legal/privacy.html sur EAS Hosting (https://chad-delivery.expo.app/privacy.html).
# À lancer après `npm run legal:build`. Les domaines supabase.co servent le HTML en
# text/plain (anti-XSS) : ni Storage ni les fonctions Edge ne peuvent afficher la page.
set -e
cd "$(dirname "$0")/.."
rm -rf legal-site && mkdir -p legal-site
cp legal/privacy.html legal-site/privacy.html
cp legal/privacy.html legal-site/index.html
cp legal/supprimer-compte.html legal-site/supprimer-compte.html
npx -y eas-cli@latest deploy --export-dir legal-site --prod --non-interactive
rm -rf legal-site
