// Generates legal/privacy.html from src/lib/legal.ts (compiled by `tsc -p tsconfig.test.json`).
// Usage: npm run legal:build  — run with the production environment loaded so the
// publisher and contact are real, never placeholders.
const fs = require('node:fs');
const path = require('node:path');
const { PRIVACY_POLICY, PRIVACY_UPDATED_AT, LEGAL_PUBLISHER, LEGAL_EMAIL } = require('../.test-build/lib/legal');
const { BRAND } = require('../.test-build/lib/brand');

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function render() {
    const sections = PRIVACY_POLICY.map((s) => [
        `<section>`,
        `<h2>${escape(s.title)}</h2>`,
        ...s.paragraphs.map((p) => `<p>${escape(p)}</p>`),
        s.bullets && s.bullets.length ? `<ul>${s.bullets.map((b) => `<li>${escape(b)}</li>`).join('')}</ul>` : '',
        `</section>`,
    ].join('\n')).join('\n');
    const contact = LEGAL_EMAIL ? `<a href="mailto:${escape(LEGAL_EMAIL)}">${escape(LEGAL_EMAIL)}</a>` : `l'assistance dans l'application (Profil → Aide)`;
    return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(BRAND)} — Politique de confidentialité</title>
<meta name="description" content="Données collectées par ${escape(BRAND)}, usages, partage, conservation et suppression du compte.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Manrope:wght@700;800&display=swap" rel="stylesheet">
<style>
  :root { --ink:#1c1b1b; --ink-muted:#5f5e5e; --ink-faint:#706c68; --bg:#fcf9f8; --hairline:#e7e3e1; --accent:#FF5733; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font:16px/1.6 Inter, system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { max-width:720px; margin:0 auto; padding:48px 24px 96px; }
  .brand { display:flex; align-items:baseline; gap:4px; font:800 30px/1 Manrope, Inter, sans-serif; letter-spacing:-0.02em; }
  .brand i { width:8px; height:8px; border-radius:50%; background:var(--accent); display:inline-block; }
  h1 { font:800 40px/1.1 Manrope, Inter, sans-serif; letter-spacing:-0.02em; margin:32px 0 8px; }
  .updated { color:var(--ink-faint); font-size:13px; letter-spacing:0.08em; text-transform:uppercase; margin:0 0 40px; }
  h2 { font:700 22px/1.25 Manrope, Inter, sans-serif; letter-spacing:-0.01em; margin:40px 0 12px; }
  p, li { color:var(--ink-muted); margin:0 0 12px; }
  ul { padding-left:20px; margin:0 0 12px; }
  li { margin-bottom:8px; }
  a { color:#C73B19; }
  hr { border:0; border-top:1px solid var(--hairline); margin:48px 0 24px; }
  footer { color:var(--ink-faint); font-size:13px; }
</style>
</head>
<body>
<main>
  <div class="brand">${escape(BRAND)}<i></i></div>
  <h1>Politique de confidentialité</h1>
  <p class="updated">Mise à jour le ${escape(PRIVACY_UPDATED_AT)}</p>
${sections}
  <hr>
  <footer>
    <p><strong>Supprimer votre compte</strong> : dans l'application, ouvrez Profil → Supprimer mon compte. Sans accès à l'application, écrivez à ${contact} depuis l'adresse email du compte.</p>
    <p>${LEGAL_PUBLISHER ? escape(LEGAL_PUBLISHER) : `Éditeur de ${escape(BRAND)}`} · N'Djamena, Tchad</p>
  </footer>
</main>
</body>
</html>
`;
}

module.exports = { render };

if (require.main === module) {
    const out = path.resolve(__dirname, '..', 'legal', 'privacy.html');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, render());
    const missing = [!LEGAL_PUBLISHER && 'EXPO_PUBLIC_LEGAL_PUBLISHER', !LEGAL_EMAIL && 'EXPO_PUBLIC_LEGAL_EMAIL'].filter(Boolean);
    console.log(`legal/privacy.html généré${missing.length ? ` — À CONFIGURER avant publication : ${missing.join(', ')}` : ''}.`);
}
