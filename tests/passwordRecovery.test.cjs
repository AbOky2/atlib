const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseRecoveryLink, passwordValidation } = require('../.test-build/lib/passwordRecovery');
test('un lien de récupération natif restitue le code PKCE', () => {
 assert.deepEqual(parseRecoveryLink('chaddelivery://reset-password?code=abcdef12-3456'), { kind:'code', code:'abcdef12-3456' });
});
test('les liens invalides, les sessions implicites et les connexions génériques sont refusés', () => {
 for(const url of ['invalid', 'chaddelivery://home?code=abcdef123456', 'chaddelivery://reset-password#type=recovery&access_token=x&refresh_token=y', 'chaddelivery://reset-password?type=recovery&token_hash=test', 'chaddelivery://reset-password?error=expired&code=abcdef123456', 'chaddelivery://reset-password']) assert.equal(parseRecoveryLink(url),null,url);
});
test('les mots de passe sont comparés exactement, espaces compris', () => {
 assert.equal(passwordValidation(' abcdefg ', ' abcdefg '),null);
 assert.ok(passwordValidation(' abcdefg ', 'abcdefg'));
 assert.ok(passwordValidation('short','short'));
});
