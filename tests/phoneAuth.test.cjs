const {test} = require('node:test');
const assert = require('node:assert/strict');
const {isValidSmsCode,verifiedAccountPhone,smsResendSeconds} = require('../.test-build/lib/phoneAuth');
test('le code SMS contient exactement six chiffres',()=>{
 for(const value of ['123456',' 012345 ']) assert.ok(isValidSmsCode(value));
 for(const value of ['1234','1234567','123a56','']) assert.equal(isValidSmsCode(value),false);
});
test('un numéro éditable dans les métadonnées n’est pas une identité vérifiée',()=>{
 assert.equal(verifiedAccountPhone({user_metadata:{phone:'+23566123456'}}),null);
 assert.equal(verifiedAccountPhone({phone:'+23566123456'}),null);
 assert.equal(verifiedAccountPhone({phone:'+23566123456',phone_confirmed_at:'2026-09-06T10:00:00Z'}),'+23566123456');
});
test('le compte à rebours de renvoi ne devient jamais négatif',()=>{
 assert.equal(smsResendSeconds(61000,1000),60);
 assert.equal(smsResendSeconds(61000,60999),1);
 assert.equal(smsResendSeconds(61000,62000),0);
});
