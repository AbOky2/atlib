const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
test('le parcours réel normalise le téléphone, crée par OTP et bloque les renvois/doubles clics',async()=>{
 const calls=[]; let release;
 const features={PHONE_SIGN_IN_ENABLED:false};
 const user={id:'A',phone:'23566123456',phone_confirmed_at:'2026-09-06T10:00:00Z',user_metadata:{full_name:'Test'}};
 const auth={signUp:async args=>{calls.push(['signup',args]);return {data:{session:null,user},error:null};},signInWithOtp:args=>{calls.push(['send',args]);return new Promise(r=>release=r);},
  verifyOtp:async args=>{calls.push(['verify',args]);return {data:{user,session:{user}},error:null};},
  updateUser:async()=>({data:{user},error:null})};
 const storage={getItem:()=> 'A',setItem:()=>{},removeItem:()=>{}};
 const store={setState:()=>{}};
 const mocks={'../data/account':{ACCOUNT_ERRORS:{DELETE_FAILED:'DELETE_FAILED'},getAccountDeletionBlocker:async()=>null,deleteMyAccount:async()=>{}},'../lib/authFeatures':features,zustand:require('zustand'),'expo-linking':{createURL:(route,{scheme})=>`${scheme}://${route}`},'../lib/supabase':{supabase:{auth}},'@supabase/supabase-js':{},
 '../lib/liveActivity':{endDeliveryActivity:()=>{}},'../lib/notifications':{clearOrderProgress:async()=>{}},
 '../lib/queryClient':{queryClient:{clear:()=>{}}},'../lib/storage':{zustandStorage:storage},
 './cartStore':{useCartStore:store},'./addressStore':{useAddressStore:store},'./favoritesStore':{useFavoritesStore:store},'./notificationStore':{useNotificationStore:store},
 '../lib/phone':require('../.test-build/lib/phone'),'../lib/phoneAuth':require('../.test-build/lib/phoneAuth')};
 const exports={}; const js=ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname,'../src/store/authStore.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(js,{exports,require:name=>{assert.ok(name in mocks,name);return mocks[name];},console,Date});
 const get=exports.useAuthStore.getState;
 assert.equal(await get().requestPhoneCode('66 12 34 56'),'error');
 assert.equal(await get().verifyPhoneCode('66 12 34 56','123456'),'error');
 assert.equal(calls.length,0, 'aucun appel SMS dans la version email uniquement');
 assert.equal(await get().signUp('test@example.com','password8','Test'),'confirm-email');
 assert.equal(get().isAuthenticated,false);
 assert.equal(calls[0][1].options.emailRedirectTo,'chaddelivery://confirm-email');
 assert.equal(calls[0][1].options.data.full_name,'Test');
 calls.length=0;
 features.PHONE_SIGN_IN_ENABLED=true;
 const first=get().requestPhoneCode('66 12 34 56');
 assert.equal(await get().requestPhoneCode('66 12 34 56'),'error'); assert.equal(calls.length,1);
 assert.equal(calls[0][1].phone,'+23566123456'); assert.equal(calls[0][1].options.shouldCreateUser,true);
 release({error:null}); assert.equal(await first,'code-sent'); assert.equal(get().isAuthenticated,false);
 assert.equal(await get().requestPhoneCode('66 12 34 56'),'error'); assert.equal(calls.length,1);
 assert.equal(await get().verifyPhoneCode('66 12 34 56','1234'),'error'); assert.equal(calls.length,1);
 assert.equal(await get().verifyPhoneCode('66 12 34 56','123456'),'ok'); assert.equal(get().isAuthenticated,true);
 assert.equal(calls[1][1].type,'sms'); assert.equal(calls[1][1].token,'123456');
});
