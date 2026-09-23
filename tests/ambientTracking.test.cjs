const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
function source(file, mocks) {
 const exports = {};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
  { exports, require: key => { assert.ok(key in mocks, key); return mocks[key]; }, console });
 return exports;
}
function android() {
 const memory = new Map([['private-data-owner','client']]);
 const scheduled = []; const removed = []; let task; let channelHook = async () => {};
 const notifications = { AndroidImportance: { HIGH: 4 }, SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' },
  setNotificationChannelAsync: () => channelHook(), scheduleNotificationAsync: async n => scheduled.push(n), cancelScheduledNotificationAsync: async id => removed.push(id), dismissNotificationAsync: async id => removed.push(id), registerTaskAsync: async () => {} };
 const module = source('src/lib/backgroundNotifications.ts', { 'react-native': { Platform: { OS: 'android' } }, 'expo-task-manager': { defineTask: (_, fn) => task = fn, isAvailableAsync: async () => true },
  'expo-notifications': notifications, './storage': { zustandStorage: { getItem: k => memory.get(k), setItem: (k,v) => memory.set(k,v) } }, './orderPush': require('../.test-build/lib/orderPush'), './orderStatus': require('../.test-build/lib/orderStatus') });
 return { ...module, memory, scheduled, removed, task, onChannel: fn => channelHook = fn };
}
const push = (status, minute, orderId = 'order') => ({ kind:'order-status', customerId:'client', orderId, status, updatedAt:`2026-09-06T10:${String(minute).padStart(2,'0')}:00Z`, statusTitle:status, statusBody:'Suivi' });
test('Android réel : les étapes remplacent un seul identifiant et la livraison termine le suivi persistant', async () => {
 const a = android();
 for (const [i,status] of ['PENDING','ACCEPTED','PREPARING','READY','OUT_FOR_DELIVERY','DELIVERED'].entries()) await a.applyOrderProgress(push(status,i));
 assert.equal(a.scheduled.length,6); assert.equal(new Set(a.scheduled.map(n=>n.identifier)).size,1);
 assert.equal(a.scheduled[0].content.sticky,true); assert.equal(a.scheduled[5].content.sticky,false); assert.equal(a.scheduled[5].content.autoDismiss,true);
 await a.applyOrderProgress(push('PREPARING',2)); await a.applyOrderProgress(push('DELIVERED',5)); await a.applyOrderProgress(push('READY',8));
 assert.equal(a.scheduled.length,6,'aucune réouverture ni ancien événement');
 await a.applyOrderProgress(push('PENDING',10,'order-2')); assert.equal(a.scheduled.length,7);
});
test('Android réel : le gestionnaire headless traite dataString et ferme une annulation', async () => {
 const a = android();
 await a.task({data:{data:{dataString:JSON.stringify(push('CANCELLED',1))}}});
 assert.equal(a.scheduled.length,1); assert.equal(a.scheduled[0].content.sticky,false);
 await a.task({data:{data:{dataString:'invalid'}}}); assert.equal(a.scheduled.length,1);
});
test('Android réel : le changement de compte pendant un appel natif empêche une notification privée', async () => {
 const a = android(); a.onChannel(async () => a.memory.set('private-data-owner','other'));
 await a.applyOrderProgress(push('PENDING',1)); assert.equal(a.scheduled.length,0);
});
test('Android réel : une erreur native ne bloque pas les tentatives suivantes', async () => {
 const a = android(); a.onChannel(async () => { throw new Error('native unavailable'); });
 await assert.rejects(a.applyOrderProgress(push('PENDING',1)));
 a.onChannel(async () => {}); await a.applyOrderProgress(push('PENDING',1)); assert.equal(a.scheduled.length,1);
});
test('les appuis Android restent actifs après remplacement de la notification persistante', async () => {
 let listener; const opened=[];
 const notifications = { addNotificationResponseReceivedListener: fn => { listener=fn; return {remove(){}}; }, getLastNotificationResponseAsync: async()=>null, clearLastNotificationResponseAsync(){} };
 const module = source('src/lib/notifications.ts', { 'react-native': { Platform:{OS:'android'} }, './palette': require('../.test-build/lib/palette'), 'expo-modules-core': { requireOptionalNativeModule:()=>({}) }, 'expo-notifications':notifications });
 const stop=module.onNotificationTap(data=>opened.push(data.orderId));
 const response=(orderId,updatedAt)=>({notification:{date:1,request:{identifier:'noir-order-progress',content:{data:{orderId,updatedAt}}}}});
 listener(response('order-1','1')); listener(response('order-1','1')); listener(response('order-1','2')); listener(response('order-2','3'));
 assert.deepEqual(opened,['order-1','order-1','order-2']); stop(); listener(response('order-3','4')); assert.equal(opened.length,3);
});
test('le pont iOS transmet chaque étape puis la clôture explicite livrée ou annulée', () => {
 const calls=[]; const native=Object.fromEntries(['startActivity','updateActivity','endActivity','endActivityWithFinalState'].map(key=>[key,(...args)=>calls.push([key,...args])]));
 const module=source('src/lib/liveActivity.ts',{'react-native':{Platform:{OS:'ios'}},'../../modules/live-activity':native,'./orderStatus':require('../.test-build/lib/orderStatus')});
 module.startDeliveryActivity('order','Restaurant');
 for(const status of ['PENDING','ACCEPTED','PREPARING','READY','OUT_FOR_DELIVERY']) module.updateDeliveryActivity(status,'12h00');
 module.endDeliveryActivity('DELIVERED'); module.endDeliveryActivity('CANCELLED');
 assert.equal(calls[0][0],'startActivity'); assert.equal(calls.filter(c=>c[0]==='updateActivity').length,5);
 assert.equal(calls[6][0],'endActivityWithFinalState'); assert.equal(calls[6][2],1);
 assert.equal(calls[7][0],'endActivityWithFinalState'); assert.match(calls[7][1],/annul/i);
});
test('l’heure affichée reste celle de N’Djamena quel que soit le fuseau du téléphone', () => {
 const {arrivalTimeLabel}=require('../.test-build/lib/eta');
 assert.equal(arrivalTimeLabel('2026-09-06T10:00:00Z',25),'11h25');
 assert.equal(arrivalTimeLabel('2026-09-06T23:50:00Z',25),'1h15');
 assert.equal(arrivalTimeLabel('2026-09-06T10:00:00Z',NaN),null);
});
