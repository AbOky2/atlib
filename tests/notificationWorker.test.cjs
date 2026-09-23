const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function worker({ claim = [], record = null, activityToken = null, tokenError = null, configured = false, rows = {}, tickets = null, apns = { outcome: 'sent' } } = {}) {
 let handler; const calls = []; const requests=[];
 const admin = {
  rpc: async (...args) => { calls.push(['rpc', ...args]); return {data:claim,error:null}; },
  from(table) {
   let reading = false;
   const q = { select(){reading=true;return q;}, eq(){return q;}, in(){return q;}, or(){return q;}, maybeSingle:async()=>({data:activityToken,error:tokenError}), single:async()=>({data:record,error:null}),
    update(patch){calls.push(['update',table,patch]);return q;},
    upsert(rows){calls.push(['upsert',table,rows]);return q;},
    delete(){calls.push(['delete',table]);return q;},
    then(resolve){return Promise.resolve({data:reading?rows[table]??[]:null,error:null}).then(resolve);} };
   return q;
  },
 };
 const exports={};
 const source=fs.readFileSync(path.join(__dirname,'../supabase/functions/notify-order/index.ts'),'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(js+'\nexports.sendPush = sendPush; exports.updateLiveActivity = updateLiveActivity;', {exports,require(name){
  if(name.includes('supabase-js'))return {createClient:()=>admin};
  return {apnsConfigured:()=>configured,pushLiveActivity:async()=>apns};
 }, Deno:{env:{get:()=> 'server-secret'},serve:fn=>handler=fn},Response,Date,console:{...console,error(){}},
 fetch:async(url,options)=>{const batch=JSON.parse(options.body);requests.push(batch);return {ok:true,json:async()=>({data:batch.map((message,i)=>tickets?tickets(message,i):{status:'ok',id:'ticket-'+i})})};}
 });
 return {handler,calls,requests,sendPush:exports.sendPush,updateLiveActivity:exports.updateLiveActivity};
}
const req = (payload,authorization='Bearer server-secret') => ({method:'POST',headers:new Headers({authorization}),json:async()=>payload});
test('un JWT client ne peut pas déclencher la fonction de notifications',async()=>{
 const w=worker(); assert.equal((await w.handler(req({},'Bearer customer-token'))).status,401); assert.equal(w.calls.length,0);
});
test('un événement déjà pris en charge ne produit aucun nouvel envoi',async()=>{
 const w=worker(); assert.equal((await w.handler(req({event_id:'event'}))).status,200); assert.equal(w.calls.length,1);
});
test('un statut dépassé est clôturé sans push',async()=>{
 const w=worker({claim:[{id:'event',claim_id:'lease',order_id:'order',event_type:'UPDATE',status:'PREPARING',order_updated_at:'2026-09-06T10:00:00Z'}],record:{id:'order',status:'DELIVERED',updated_at:'2026-09-06T10:10:00Z'}});
 assert.equal((await w.handler(req({event_id:'event'}))).status,200);
 assert.equal(w.requests.length,0); assert.ok(w.calls.find(c=>c[0]==='update' && c[2].completed_at));
});
test('Android compatible reçoit des données seules, les anciens binaires gardent le push visible',async()=>{
 const w=worker(); await w.sendPush([{token:'new',platform:'android',progress_version:1},{token:'old',platform:'android',progress_version:0},{token:'ios',platform:'ios',progress_version:0}], 'Prête','Attente de départ',{kind:'order-status',orderId:'order'},'order-updates','event');
 const [modern,old,ios]=w.requests[0]; assert.equal(modern.title,undefined); assert.equal(modern.body,undefined); assert.equal(modern.data.statusTitle,'Prête');
 assert.equal(old.title,'Prête'); assert.equal(ios.title,'Prête'); assert.equal(w.calls.find(c=>c[0]==='upsert')[2].length,3);
});

test('une configuration APNs absente avec activité existante reste une erreur réessayable',async()=>{
 const w=worker({activityToken:{token:'test-token'}});
 await assert.rejects(w.updateLiveActivity({id:'order'},{}),/APNs configuration missing/);
});
test('une erreur de lecture du jeton ne doit pas être acquittée comme une mise à jour réussie',async()=>{
 const w=worker({tokenError:new Error('database unavailable')});
 await assert.rejects(w.updateLiveActivity({id:'order'},{}),/database unavailable/);
});

const ios={token:'ios',platform:'ios',progress_version:0};
const brokenAndroid={token:'android-broken',platform:'android',progress_version:0};
const invalidCredentials=message=>message.to==='android-broken'?{status:'error',details:{error:'InvalidCredentials'}}:{status:'ok',id:'ticket-'+message.to};
const newOrderEvent={id:'event',claim_id:'lease',order_id:'order',event_type:'INSERT',status:'PENDING',order_updated_at:'2026-09-14T10:00:00Z',push_sent:false,activity_sent:false};

test('un appareil au rejet définitif n’empoisonne pas l’événement : terminé, cause visible',async()=>{
 const w=worker({claim:[newOrderEvent],record:{id:'order',status:'PENDING',restaurant_id:'resto',updated_at:'2026-09-14T10:00:00Z'},
  rows:{profiles:[{id:'staff'}],push_tokens:[ios,brokenAndroid]},tickets:invalidCredentials});
 assert.equal((await w.handler(req({event_id:'event'}))).status,200);
 const done=w.calls.find(c=>c[0]==='update'&&c[2].completed_at);
 assert.ok(done,'l’événement doit être clôturé au lieu d’être réessayé indéfiniment');
 assert.match(done[2].last_error,/InvalidCredentials/);
});
test('une reprise ne renvoie pas le push aux appareils qui l’ont déjà accepté',async()=>{
 const w=worker({rows:{order_push_receipts:[{token:'ios'}]}});
 await w.sendPush([ios,{token:'android',platform:'android',progress_version:0}],'Prête','Attente',{kind:'order-status',orderId:'order'},'order-updates','event');
 assert.deepEqual(w.requests[0].map(m=>m.to),['android']);
});
test('un jeton Live Activity révoqué par Apple est supprimé sans réessai',async()=>{
 const w=worker({configured:true,activityToken:{token:'gone-token'},apns:{outcome:'gone',reason:'Unregistered'}});
 await w.updateLiveActivity({id:'order',status:'PREPARING'},{title:'En cuisine',progress:0.45});
 assert.ok(w.calls.find(c=>c[0]==='delete'&&c[1]==='live_activity_tokens'));
});
test('une panne APNs transitoire reste réessayable',async()=>{
 const w=worker({configured:true,activityToken:{token:'token'},apns:{outcome:'retry',reason:'HTTP 503'}});
 await assert.rejects(w.updateLiveActivity({id:'order',status:'PREPARING'},{title:'En cuisine',progress:0.45}),/503/);
});
