const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseOrderPush, shouldApplyOrderPush } = require('../.test-build/lib/orderPush');
const push = {kind:'order-status',orderId:'order',customerId:'A',status:'PREPARING',updatedAt:'2026-09-06T10:00:00Z',statusTitle:'En cuisine',statusBody:'Préparation'};
test('un push valide et récent du compte courant est accepté',()=>{
 assert.deepEqual(parseOrderPush(push),push); assert.ok(shouldApplyOrderPush(push,'A'));
});
test('les anciens push, doublons et données d’un autre compte sont ignorés',()=>{
 assert.equal(shouldApplyOrderPush(push,'B'),false);
 assert.equal(shouldApplyOrderPush(push,'A',{updatedAt:push.updatedAt,status:'PREPARING'}),false);
 assert.equal(shouldApplyOrderPush(push,'A',{updatedAt:'2026-09-06T11:00:00Z',status:'READY'}),false);
});
test('une commande terminée ne peut jamais redevenir une notification en cours',()=>{
 assert.equal(shouldApplyOrderPush(push,'A',{updatedAt:'2026-09-06T09:00:00Z',status:'CANCELLED'}),false);
});
test('les payloads incomplets ou mal formés ne sont pas présentés',()=>{
 for (const invalid of [null,{}, {...push,status:'unknown'}, {...push,updatedAt:'oops'}, {...push,customerId:undefined}]) assert.equal(parseOrderPush(invalid),null);
});
test('une nouvelle commande remplace la précédente, jamais l’inverse',()=>{
 const previous={orderId:'old',updatedAt:'2026-09-06T09:00:00Z',status:'DELIVERED'};
 assert.equal(shouldApplyOrderPush(push,'A',previous),true);
 assert.equal(shouldApplyOrderPush(push,'A',{...previous,updatedAt:'2026-09-06T11:00:00Z'}),false);
});
