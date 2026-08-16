const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

/**
 * Le garde-fou du design system.
 *
 * Ce projet a dérivé trois fois de la même façon : quelqu'un écrit une valeur à
 * la main plutôt que d'utiliser le jeton, personne ne le voit, et six mois plus
 * tard il existe 23 tailles de texte et 74 `#1c1b1b` en dur. Une convention ne
 * tient pas toute seule — il faut qu'elle échoue quand on l'enfreint.
 *
 * Ces tests lisent les sources et refusent ce qui sort du système. Ils tournent
 * avec `npm test`, donc avant chaque commit et dans n'importe quelle CI.
 *
 * ⚠️ Un garde-fou fragile est pire qu'aucun : il donne une fausse assurance.
 * On ne parse donc JAMAIS la structure JSX (les flèches `=>` cassent toute regex
 * naïve). On n'inspecte que le contenu des attributs `className="…"`, qui est
 * une chaîne littérale et se lit de façon fiable.
 */

const ROOTS = ['app', 'src'];
const IGNORED = ['database.types.ts', 'CategoryIcon.tsx'];

function sourceFiles() {
    const out = [];
    const walk = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (/\.tsx?$/.test(entry.name) && !IGNORED.includes(entry.name)) out.push(full);
        }
    };
    ROOTS.forEach((r) => fs.existsSync(r) && walk(r));
    return out;
}

/** Toutes les chaînes de classes du projet, avec leur origine. */
function classStrings() {
    const found = [];
    for (const file of sourceFiles()) {
        const src = fs.readFileSync(file, 'utf8');
        for (const m of src.matchAll(/className="([^"]*)"/g)) {
            found.push({ file, classes: m[1] });
        }
        // Les gabarits `className={`…`}` comptent aussi.
        for (const m of src.matchAll(/className=\{`([^`]*)`\}/g)) {
            found.push({ file, classes: m[1] });
        }
    }
    return found;
}

const report = (offenders) =>
    offenders.slice(0, 12).map((o) => `  ${o.file} → « ${o.what} »`).join('\n');

// ---------------------------------------------------------------------------

test('aucune taille de texte hors de l\'échelle typographique', () => {
    const ALLOWED = new Set(['display', 'h1', 'h2', 'h3', 'bodylg', 'body', 'label', 'caption', 'eyebrow']);
    const offenders = [];
    for (const { file, classes } of classStrings()) {
        for (const m of classes.matchAll(/\btext-(\[[^\]]+\]|[a-z0-9]+)\b/g)) {
            const value = m[1];
            // `text-<couleur>` et `text-center` ne sont pas des tailles.
            if (ALLOWED.has(value)) continue;
            if (/^\[\d+px\]$/.test(value) || /^(xs|sm|base|lg|xl|[2-9]xl)$/.test(value)) {
                offenders.push({ file, what: m[0] });
            }
        }
    }
    assert.equal(offenders.length, 0,
        `Taille de texte hors système — utilisez un rôle (text-body, text-h2…) :\n${report(offenders)}`);
});

test('aucun rayon hors du langage de coins', () => {
    const ALLOWED = new Set(['none', 'chip', 'card', 'panel', 'sheet', 'full']);
    const offenders = [];
    for (const { file, classes } of classStrings()) {
        for (const m of classes.matchAll(/\brounded(?:-[trbl]{1,2})?-(\[[^\]]+\]|[a-z0-9]+)\b/g)) {
            if (!ALLOWED.has(m[1])) offenders.push({ file, what: m[0] });
        }
    }
    assert.equal(offenders.length, 0,
        `Rayon hors système — utilisez chip/card/panel/sheet/full :\n${report(offenders)}`);
});

test('aucune couleur écrite en dur dans une classe', () => {
    const offenders = [];
    for (const { file, classes } of classStrings()) {
        for (const m of classes.matchAll(/\b(?:bg|text|border)-\[#[0-9a-fA-F]{3,8}\]/g)) {
            offenders.push({ file, what: m[0] });
        }
    }
    assert.equal(offenders.length, 0,
        `Couleur en dur — ajoutez un jeton dans tailwind.config.js :\n${report(offenders)}`);
});

test('la palette JS et les jetons Tailwind ne divergent pas', () => {
    // Les icônes prennent des couleurs en valeur, pas en classe : les deux
    // sources doivent rester alignées, sinon un même gris existe en deux teintes.
    const tw = fs.readFileSync('tailwind.config.js', 'utf8');
    const palette = fs.readFileSync('src/lib/palette.ts', 'utf8');
    for (const [name, key] of [['ink', 'ink'], ['accent', 'accent'], ['hairline', 'hairline']]) {
        const inTw = tw.match(new RegExp(`["']?${name}["']?:\\s*["'](#[0-9a-fA-F]{6})["']`));
        const inJs = palette.match(new RegExp(`\\b${key}:\\s*['"](#[0-9a-fA-F]{6})['"]`));
        assert.ok(inTw && inJs, `jeton « ${name} » absent d'une des deux sources`);
        assert.equal(inJs[1].toLowerCase(), inTw[1].toLowerCase(),
            `« ${name} » vaut ${inJs[1]} en JS et ${inTw[1]} en Tailwind`);
    }
});

test('les écrans ne parlent pas directement au transport Supabase', () => {
    const offenders = sourceFiles()
        .filter((f) => f.startsWith('app' + path.sep))
        .filter((f) => /from ['"].*lib\/supabase['"]/.test(fs.readFileSync(f, 'utf8')))
        .map((f) => ({ file: f, what: 'import de lib/supabase' }));
    assert.equal(offenders.length, 0,
        `Un écran doit passer par src/data ou par un store :\n${report(offenders)}`);
});
