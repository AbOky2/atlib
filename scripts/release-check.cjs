// Local configuration check only: no build, upload, API call or secret output.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const app = require('../app.json').expo;
const config = require('../app.config.js')({ config: app });
const eas = require('../eas.json');
const pkg = require('../package.json');
const strict = process.argv.includes('--strict');
const platformArg = process.argv.find(a => a.startsWith('--platform='));
const platform = platformArg?.split('=')[1] ?? 'all';
let failures = 0;
function check(ok, message, pending = false) {
 console.log(`${ok ? 'OK' : pending && !strict ? 'À CONFIGURER' : 'ÉCHEC'} — ${message}`);
 if (!ok && (!pending || strict)) failures++;
}
check(['ios','android','all'].includes(platform), 'Plateforme ios, android ou all');
check(pkg.main === 'index.js', 'Entrée déclarant les tâches de notification');
check(app.scheme === 'chaddelivery', 'Liens de confirmation, récupération et suivi');
check(app.extra?.eas?.projectId === 'faf27282-9135-45c0-a820-0c8d3ea053f0', 'Projet EAS Naakul');
check(app.ios?.bundleIdentifier === app.android?.package, 'Identifiants natifs cohérents');
check(app.ios?.infoPlist?.NSSupportsLiveActivities === true && app.plugins.includes('@bacons/apple-targets'), 'Live Activities et extension widget déclarées');
check(eas.cli.appVersionSource === 'remote' && eas.build.production.autoIncrement === true, 'Versions de build gérées par EAS');
check(eas.build.production.environment === 'production' && eas.build.production.distribution === 'store', 'Profil de distribution production');
check(fs.existsSync(path.join(root, 'supabase/migrations/202609060001_notification_outbox.sql')), 'Migration locale de notifications présente (déploiement distant à vérifier)');
const support = (process.env.EXPO_PUBLIC_SUPPORT_PHONE ?? '').replace(/[^0-9]/g, '');
check(fs.existsSync(path.join(root, 'legal/privacy.html')), 'Page de confidentialité générée (npm run legal:build)');
check(!!(process.env.EXPO_PUBLIC_LEGAL_PUBLISHER ?? '').trim() && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(process.env.EXPO_PUBLIC_LEGAL_EMAIL ?? ''), 'Éditeur et email de contact de la politique de confidentialité', true);
check(fs.existsSync(path.join(root, 'supabase/migrations/202609220001_account_deletion.sql')) && fs.existsSync(path.join(root, 'supabase/functions/delete-account/index.ts')), 'Suppression de compte : migration et fonction présentes (déploiement distant à vérifier)');
check(/^235[0-9]{8}$/.test(support), 'Numéro de support production valide', true);
if (platform !== 'ios') {
 const file = config.android.googleServicesFile;
 let matches = false;
 if (file) {
  try {
   const firebase = JSON.parse(fs.readFileSync(path.resolve(root,file),'utf8'));
   matches = !firebase.private_key && firebase.client?.some(c => c.client_info?.android_client_info?.package_name === app.android.package);
  } catch { /* A file variable is available on EAS only after environment setup. */ }
 }
 check(matches, 'Firebase client configuré pour le package Android', true);
}
console.log('Ce contrôle ne valide ni les secrets distants, ni la recette sur appareils, ni les exigences des stores.');
process.exitCode = failures ? 1 : 0;
