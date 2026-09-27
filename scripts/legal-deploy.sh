#!/bin/zsh
# Publie legal/privacy.html sur EAS Hosting (https://chad-delivery.expo.app/privacy.html).
# À lancer après `npm run legal:build`. Les domaines supabase.co servent le HTML en
# text/plain (anti-XSS) : ni Storage ni les fonctions Edge ne peuvent afficher la page.
set -e
cd "$(dirname "$0")/.."
rm -rf legal-site && mkdir -p legal-site
cp legal/privacy.html legal-site/privacy.html
cat > legal-site/index.html <<'HTML'
<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Naakul — Documents</title>
<style>body{margin:0;background:#fcf9f8;color:#1c1b1b;font:16px/1.6 Inter,system-ui,sans-serif}main{max-width:720px;margin:0 auto;padding:48px 24px}h1{font:800 30px/1.1 Manrope,Inter,sans-serif;letter-spacing:-.02em}a{color:#C73B19}li{margin-bottom:8px}</style></head>
<body><main><h1>Naakul<span style="color:#FF5733">.</span></h1><p>Livraison de repas à N’Djamena.</p><ul><li><a href="privacy.html">Politique de confidentialité</a></li><li><a href="supprimer-compte.html">Supprimer votre compte</a></li></ul></main></body></html>
HTML
cp legal/supprimer-compte.html legal-site/supprimer-compte.html
npx -y eas-cli@latest deploy --export-dir legal-site --prod --non-interactive
rm -rf legal-site
