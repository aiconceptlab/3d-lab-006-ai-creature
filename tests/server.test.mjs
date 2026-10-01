import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {createApp,createRateLimiter} from '../server.mjs';import {Sessions} from '../server/sessions.mjs';
import http from 'node:http';
test('development serves compiled dependency modules while keeping environment and private data hidden',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'creature-development-'));
  const app=await createApp({development:true,env:{DATA_DIR:dir}});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
  const base='http://127.0.0.1:'+app.server.address().port;
  try{
    const module=await fetch(base+'/src/imported-creature.js');assert.equal(module.status,200);
    const source=await module.text(),urls=[...source.matchAll(/['"](\/node_modules\/\.vite\/deps\/[^'"]+)['"]/g)].map(m=>m[1]);
    assert.ok(urls.length>=3);for(const url of urls)assert.equal((await fetch(base+url)).status,200);
    for(const url of ['/.env','/.data/session-secret','/node_modules/.vite/deps/.env'])assert.equal((await fetch(base+url)).status,404);
  }finally{await app.close();await rm(dir,{recursive:true,force:true});}
});
test('sessions survive a restart but reject tampering, expiry and access-code changes',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'creature-session-'));try{
    const a=await Sessions.open(dir,'door');const {token,session}=a.issue();const b=await Sessions.open(dir,'door');
    assert.equal(b.read(token).owner,session.owner);assert.equal(b.read(token+'x'),null);assert.equal(b.read(token,session.expires+1),null);
    assert.equal((await Sessions.open(dir,'new-door')).read(token),null);
  }finally{await rm(dir,{recursive:true,force:true});}
});
test('API requires a session, rejects cross-origin and oversized input, never serves secrets',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'creature-api-'));const app=await createApp({env:{DATA_DIR:dir,ACCESS_CODE:'test-door'},fetchFn:()=>{throw new Error('No network expected');}});
  await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${app.server.address().port}`;
  const post=(path,body,headers={})=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
  try{
    assert.equal((await post('/api/design',{name:'Nova',description:'A cream fox with a curled tail.'})).status,401);
    assert.equal((await post('/api/session',{code:'wrong'})).status,401);
    const login=await post('/api/session',{code:'test-door'});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];
    const design=await post('/api/design',{name:'Mochi',description:'A sleepy lilac bunny with long ears and mint paws.'},{cookie});assert.equal(design.status,200);assert.equal((await design.json()).source,'local');
    assert.equal((await post('/api/design',{name:'Bad',description:'short'},{cookie})).status,400);
    assert.equal((await post('/api/design',{}, {cookie,Origin:'https://evil.invalid'})).status,403);
    assert.equal((await post('/api/design',{description:'a'.repeat(20000)},{cookie})).status,413);
    assert.equal((await fetch(base+'/.env')).status,404);
    assert.equal((await fetch(base+'/.data/session-secret')).status,404);
    assert.equal((await post('/api/generations',{name:'Nova',description:'A tiny cream fox with glowing paws.'},{cookie})).status,503);
    assert.equal((await fetch(base+'/api/generations/00000000-0000-0000-0000-000000000000',{headers:{cookie}})).status,404);
  }finally{await app.close();await rm(dir,{recursive:true,force:true});}
});
test('rate limits expire and paid access is protected on public hosts',async()=>{
  let now=100;const rate=createRateLimiter(()=>now);rate('client',1,1000);assert.throws(()=>rate('client',1,1000),e=>e.status===429);now=1200;rate('client',1,1000);
  const dir=await mkdtemp(join(tmpdir(),'creature-public-'));const app=await createApp({env:{DATA_DIR:dir},jev:{key:'placeholder'}});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
  try{const status=await new Promise((resolve,reject)=>http.get({hostname:'127.0.0.1',port:app.server.address().port,path:'/api/config',headers:{Host:'public.example'}},res=>{res.resume();resolve(res.statusCode);}).on('error',reject));assert.equal(status,200);}finally{await app.close();await rm(dir,{recursive:true,force:true});}
});

test('LAN preview and local actions work without exposing configured provider credits',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'creature-lan-'));let calls=0;
  const app=await createApp({env:{DATA_DIR:dir,TRIPO_API_KEY:'placeholder',ENABLE_TRIPO:'1'},jev:{key:'placeholder',design:()=>{calls++;throw new Error('Must not call provider');},decide:()=>{calls++;throw new Error('Must not call provider');}}});
  await new Promise(r=>app.server.listen(0,'0.0.0.0',r));
  const request=(path,body,cookie='')=>new Promise((resolve,reject)=>{const req=http.request({hostname:'127.0.0.1',port:app.server.address().port,path,method:body?'POST':'GET',headers:{Host:'192.168.1.99','Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})}},res=>{let text='';res.on('data',d=>text+=d);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:JSON.parse(text)}));});req.on('error',reject);req.end(body?JSON.stringify(body):undefined);});
  try{
    const config=await request('/api/config');assert.equal(config.status,200);assert.equal(config.body.jev,false);assert.equal(config.body.tripo,false);
    const login=await request('/api/session',{});const cookie=login.headers['set-cookie'][0].split(';')[0];
    const design=await request('/api/design',{name:'Bun',description:'A lilac bunny with long ears.'},cookie);assert.equal(design.status,200);assert.equal(design.body.source,'local');
    assert.equal((await request('/api/generations',{name:'Bun',description:'A lilac bunny with long ears.'},cookie)).status,503);
    assert.equal((await request('/api/tripo/balance',undefined,cookie)).status,503);
    assert.equal(calls,0);
  }finally{await app.close();await rm(dir,{recursive:true,force:true});}
});
