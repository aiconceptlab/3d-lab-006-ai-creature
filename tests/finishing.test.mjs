import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile,mkdir} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {setTimeout as delay} from 'node:timers/promises';
import {TripoJobs} from '../server/tripo.mjs';import {validateFinishedGLB,LIVING_CLIPS} from '../server/finish.mjs';import {createApp} from '../server.mjs';
const id='11111111-1111-4111-8111-111111111111';
test('a vendor walk cannot be released without the full living animation set',async()=>{
 for(const name of ['nova','mochi','ember']){const doc=validateFinishedGLB(await readFile('public/models/'+name+'-living.glb'));assert.equal(doc.animations.length,13);}
 assert.throws(()=>validateFinishedGLB(Buffer.from('invalid')));
});
test('finishing failures and server restarts retry locally without another provider charge',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'pet-finishing-'));let attempts=0,network=0;
 const options={dir,key:'placeholder',enabled:true,fetchFn:async()=>{network++;throw new Error('No paid calls allowed');},finishFn:async job=>{attempts++;if(attempts===1)throw new Error('Review this rig');return {modelUrl:`/api/generations/${job.id}/model.glb`,quality:{clips:LIVING_CLIPS,faceReviewRequired:true}};}};
 const wait=async jobs=>{for(let i=0;i<100&&jobs.owned(id,'owner').status==='processing';i++)await delay(10);return jobs.view(jobs.owned(id,'owner'));};
 try{
  const jobs=new TripoJobs(options);await jobs.load();await jobs.save({id,owner:'owner',status:'complete',modelUrl:'https://cdn.tripo3d.ai/raw.glb'});
  assert.equal((await jobs.poll(id,'owner')).status,'processing');assert.equal((await wait(jobs)).status,'finish_failed');assert.equal(jobs.view(jobs.owned(id,'owner')).modelUrl,undefined);
  await assert.rejects(jobs.retryFinish(id,'stranger'),e=>e.status===404);
  await jobs.retryFinish(id,'owner');assert.equal((await wait(jobs)).status,'complete');assert.equal(attempts,2);assert.equal(network,0);
  const saved=jobs.owned(id,'owner');saved.status='processing';await jobs.save(saved);
  const restarted=new TripoJobs(options);await restarted.load();assert.equal(restarted.owned(id,'owner').status,'finish_pending');await restarted.poll(id,'owner');assert.equal((await wait(restarted)).status,'complete');assert.equal(network,0);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('finished models remain private to their authenticated owner',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'pet-private-model-')),app=await createApp({env:{DATA_DIR:dir}});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port;
 try{
  const login=()=>fetch(base+'/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  const first=(await login()).headers.get('set-cookie').split(';')[0],second=(await login()).headers.get('set-cookie').split(';')[0];
  const {Sessions}=await import('../server/sessions.mjs');const sessions=await Sessions.open(dir,'');const owner=sessions.read(first.slice(17)).owner;
  await mkdir(join(dir,'jobs',id));const data=await readFile('public/models/nova-living.glb');await writeFile(join(dir,'jobs',id,'living.glb'),data);await app.jobs.save({id,owner,status:'complete',modelUrl:`/api/generations/${id}/model.glb`});
  const path='/api/generations/'+id+'/model.glb';assert.equal((await fetch(base+path)).status,401);assert.equal((await fetch(base+path,{headers:{cookie:second}})).status,404);
  const response=await fetch(base+path,{headers:{cookie:first}});assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');assert.deepEqual(Buffer.from(await response.arrayBuffer()),data);
 }finally{await app.close();await rm(dir,{recursive:true,force:true});}
});
