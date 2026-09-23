const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseEmailConfirmationLink: parse } = require('../.test-build/lib/emailConfirmation');

test('la confirmation native accepte uniquement le code PKCE de sa propre route', () => {
    assert.deepEqual(parse('chaddelivery://confirm-email?code=abcdef12-3456'), { kind: 'code', code: 'abcdef12-3456' });
    assert.deepEqual(parse('chaddelivery://confirm-email/?code=abcdef123456#'), { kind: 'code', code: 'abcdef123456' });
});
test('un lien forgé avec une session, un token hash, une erreur ou une autre route est refusé', () => {
    for (const url of [
        'invalid', 'https://example.com/confirm-email?code=abcdef123456',
        'chaddelivery://reset-password?code=abcdef123456',
        'chaddelivery://confirm-email#type=signup&access_token=a&refresh_token=b',
        'chaddelivery://confirm-email?type=signup&token_hash=a',
        'chaddelivery://confirm-email?code=abcdef123456&error=access_denied',
        'chaddelivery://confirm-email?code=abcdef123456#error=expired',
        'chaddelivery://confirm-email?code=short',
        'chaddelivery://confirm-email?code=<script>alert(1)</script>',
    ]) assert.equal(parse(url), null, url);
});

test('le service échange le code avec le mécanisme PKCE de Supabase', async () => {
    const fs = require('node:fs');
    const vm = require('node:vm');
    const ts = require('typescript');
    const calls = [];
    const result = { data: { session: { user: { id: 'a' } } }, error: null };
    const auth = { exchangeCodeForSession: async (code) => { calls.push(code); return result; } };
    const exports = {};
    const code = ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname, '../src/data/emailConfirmation.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
    vm.runInNewContext(code, { exports, require: name => { assert.equal(name, '../lib/supabase'); return { supabase: { auth } }; } });
    assert.equal(await exports.confirmEmail({ kind: 'code', code: 'abcdef123456' }), result);
    assert.deepEqual(calls, ['abcdef123456']);
});
