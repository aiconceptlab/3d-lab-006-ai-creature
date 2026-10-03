import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm,mkdir,writeFile} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {createApp} from '../server.mjs';import {Sessions} from '../server/sessions.mjs';import {MobileLinks,httpsOrigin} from '../server/mobile.mjs';import {PRESETS} from '../shared/design.mjs';

test('phone links grant exactly one pet, survive restart, expire, rotate and revoke',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'pet-phone-'));try{
  const store=await MobileLinks.open(dir),jobs={owned:()=>{throw new Error('Forbidden');}},pet=PRESETS[0];
  assert.equal(httpsOrigin('http://phone.example'),null);assert.equal(httpsOrigin('https://user:pass@phone.example'),null);assert.equal(httpsOrigin('https://phone.example/path'),null);
  const a=await store.issue(pet,'owner',jobs),restored=await MobileLinks.open(dir);
  assert.equal(restored.read(a.token).pet.name,'Nova');assert.equal(restored.read(a.token+'x'),null);assert.equal(restored.read(a.token,a.expires),null);
  const text=await (await import('node:fs/promises')).readFile(store.file,'utf8');assert.ok(!text.includes(a.token));
  await assert.rejects(store.issue({...pet,modelUrl:'https://evil.example/model.glb'},'owner',jobs));
  await assert.rejects(store.revoke(a.id,'stranger'),e=>e.status===404);
  const b=await store.issue(pet,'owner',jobs);assert.equal(store.read(a.token),null);await store.revoke(b.id,'owner');assert.equal(store.read(b.token),null);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('mobile listener cannot spend credits, log in, enumerate jobs or steal another model',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'pet-mobile-api-'));let paid=0;
 const app=await createApp({env:{DATA_DIR:dir,ACCESS_CODE:'owner-code',MOBILE_URL:'https://phone.example'},jev:{key:'fixture',design:()=>{paid++;throw new Error('Paid');},decide:()=>{paid++;throw new Error('Paid');}},fetchFn:()=>{paid++;throw new Error('Paid');}});
 await Promise.all([new Promise(r=>app.server.listen(0,'127.0.0.1',r)),new Promise(r=>app.mobileServer.listen(0,'127.0.0.1',r))]);
 const base='http://127.0.0.1:'+app.server.address().port,phone='http://127.0.0.1:'+app.mobileServer.address().port;
 const post=(base,path,body,cookie='',extra={})=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',cookie,...extra},body:JSON.stringify(body)});
 try{
  const login=await post(base,'/api/session',{code:'owner-code'}),cookie=login.headers.get('set-cookie').split(';')[0];
  const owner=(await Sessions.open(dir,'owner-code')).read(cookie.slice(17)).owner;
  const id='00000000-0000-4000-8000-000000000001',job={id,owner,name:'My Ember',description:PRESETS[2].description,status:'complete',createdAt:Date.now()};
  await app.jobs.save(job);await mkdir(join(dir,'jobs',id));await writeFile(join(dir,'jobs',id,'living.glb'),'test-private-model');
  const pet={...PRESETS[2],name:job.name,modelUrl:'/api/generations/'+id+'/model.glb'};
  const config=await (await fetch(phone+'/api/config',{headers:{cookie}})).json();assert.equal(config.mobileOnly,true);assert.equal(config.jev,false);assert.equal(config.tripo,false);
  for(const path of ['/api/session','/api/design','/api/generations','/api/mobile-links','/api/generations/'+id+'/approve'])assert.equal((await post(phone,path,{...pet,code:'owner-code'},cookie,{'x-forwarded-proto':'https'})).status,403);
  assert.equal((await fetch(phone+'/api/generations',{headers:{cookie}})).status,403);
  assert.equal((await fetch(phone+pet.modelUrl,{headers:{cookie}})).status,403);
  const strangerLogin=await post(base,'/api/session',{code:'owner-code'}),stranger=strangerLogin.headers.get('set-cookie').split(';')[0];
  assert.equal((await post(base,'/api/mobile-links',pet,stranger)).status,404);
  const share=await (await post(base,'/api/mobile-links',pet,cookie)).json(),token=new URL(share.url).hash.slice(5);
  assert.equal((await post(phone,'/api/mobile/redeem',{token},'',{Origin:'https://evil.example'})).status,403);
  assert.equal((await post(phone,'/api/mobile/redeem',{token:token.slice(0,-1)+'z'})).status,410);
  const redeem=await post(phone,'/api/mobile/redeem',{token},'',{'x-forwarded-proto':'https'});assert.equal(redeem.status,200);assert.match(redeem.headers.get('set-cookie'),/HttpOnly.*SameSite=Strict.*Secure/);
  const phoneCookie=redeem.headers.get('set-cookie').split(';')[0];assert.equal((await (await fetch(phone+'/api/mobile/pet',{headers:{cookie:phoneCookie}})).json()).pet.name,job.name);
  assert.equal(await (await fetch(phone+pet.modelUrl,{headers:{cookie:phoneCookie}})).text(),'test-private-model');
  assert.equal((await fetch(phone+'/api/generations/00000000-0000-4000-8000-000000000002/model.glb',{headers:{cookie:phoneCookie}})).status,403);
  const state={energy:82,action:'Idle',secondsInAction:2,follow:false,ball:false,tracking:'normal',personality:'curious',personVisible:false,distanceToPhone:1};
  // Use a valid action from the actual movement contract.
  state.action=(await import('../shared/motion.mjs')).ACTIONS[0];assert.equal((await post(phone,'/api/decision',state,phoneCookie)).status,200);
  assert.equal((await post(base,'/api/mobile-links/'+share.id+'/revoke',{},cookie)).status,200);
  assert.equal((await fetch(phone+pet.modelUrl,{headers:{cookie:phoneCookie}})).status,403);
  assert.equal((await fetch(phone+'/api/mobile/pet',{headers:{cookie:phoneCookie}})).status,410);
  assert.equal((await fetch(phone+'/.env')).status,404);assert.equal((await fetch(phone+'/.data/mobile-links.json')).status,404);assert.equal(paid,0);
 }finally{await app.close();await rm(dir,{recursive:true,force:true});}
});
