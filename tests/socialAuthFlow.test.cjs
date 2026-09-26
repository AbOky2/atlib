const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// Le store vu depuis les boutons Google / Apple : une fermeture de la feuille
// système ne montre rien, une indisponibilité s'explique, une réussite ouvre
// la session et garde le nom qu'Apple ne redonnera plus.
function mount(outcome, updateUser) {
 const calls=[];
 const features={PHONE_SIGN_IN_ENABLED:false};
 const auth={updateUser:async(args)=>{calls.push(['updateUser',args]);return updateUser(args);}};
 const storage={getItem:()=> 'A',setItem:()=>{},removeItem:()=>{}};
 const store={setState:()=>{}};
 const mocks={'../data/account':{ACCOUNT_ERRORS:{},getAccountDeletionBlocker:async()=>null,deleteMyAccount:async()=>{}},'../lib/authFeatures':features,
  '../lib/socialAuth':{signInWithProvider:async(provider)=>{calls.push(['social',provider]);return typeof outcome==='function'?outcome():outcome;}},
  zustand:require('zustand'),'expo-linking':{createURL:()=>''},'../lib/supabase':{supabase:{auth}},'@supabase/supabase-js':{},
  '../lib/liveActivity':{endDeliveryActivity:()=>{}},'../lib/notifications':{clearOrderProgress:async()=>{}},
  '../lib/queryClient':{queryClient:{clear:()=>{}}},'../lib/storage':{zustandStorage:storage},
  './cartStore':{useCartStore:store},'./addressStore':{useAddressStore:store},'./favoritesStore':{useFavoritesStore:store},'./notificationStore':{useNotificationStore:store},
  '../lib/phone':require('../.test-build/lib/phone'),'../lib/phoneAuth':require('../.test-build/lib/phoneAuth')};
 const exports={}; const js=ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname,'../src/store/authStore.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(js,{exports,require:name=>{assert.ok(name in mocks,name);return mocks[name];},console,Date});
 return {get:exports.useAuthStore.getState,calls};
}

test('fermer la feuille système ne laisse ni erreur ni chargement', async()=>{
 const {get}=mount({status:'cancelled'});
 assert.equal(await get().signInWithProvider('google'),'cancelled');
 assert.equal(get().error,null); assert.equal(get().loading,false); assert.equal(get().isAuthenticated,false);
});

test('un fournisseur indisponible ou refusé par Supabase s’explique en français', async()=>{
 const a=mount({status:'unavailable'});
 assert.equal(await a.get().signInWithProvider('apple'),'error');
 assert.match(a.get().error,/Apple n’est pas disponible/);
 const b=mount({status:'error',message:'Unsupported provider: provider is not enabled'});
 assert.equal(await b.get().signInWithProvider('google'),'error');
 assert.match(b.get().error,/pas encore activée/);
});

test('une réussite ouvre la session et conserve le nom donné une seule fois par Apple', async()=>{
 const user={id:'U1',email:'a@b.td',user_metadata:{}};
 const session={access_token:'t',user};
 const {get,calls}=mount({status:'ok',session,fullName:'Amina Issa'},async({data})=>({data:{user:{...user,user_metadata:{full_name:data.full_name}}},error:null}));
 assert.equal(await get().signInWithProvider('apple'),'ok');
 assert.equal(get().isAuthenticated,true);
 assert.equal(get().user.user_metadata.full_name,'Amina Issa');
 assert.deepEqual(calls.map(c=>c[0]),['social','updateUser']);
});

test('un nom déjà connu n’est pas réécrit', async()=>{
 const user={id:'U1',email:'a@b.td',user_metadata:{full_name:'Déjà Là'}};
 const {get,calls}=mount({status:'ok',session:{access_token:'t',user},fullName:'Autre Nom'},async()=>{throw new Error('ne doit pas être appelé');});
 assert.equal(await get().signInWithProvider('google'),'ok');
 assert.equal(get().user.user_metadata.full_name,'Déjà Là');
 assert.deepEqual(calls.map(c=>c[0]),['social']);
});
