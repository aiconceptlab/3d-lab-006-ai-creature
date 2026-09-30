import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {TripoJobs,validMedia} from '../server/tripo.mjs';
test('paid pipeline waits for reference approval and never duplicates ambiguous submissions',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'creature-tripo-'));let submissions=0,fail=false;
  const fetchFn=async(url,options)=>{if(options.method==='POST'){submissions++;if(fail)throw new Error('Unconfirmed paid request');return new Response(JSON.stringify({code:0,data:{task_id:'reference-1'}}));}return new Response(JSON.stringify({code:0,data:{status:'success',output:{generated_image_url:'https://cdn.tripo3d.ai/pet.png'}}}));};
  try{
    const jobs=new TripoJobs({dir,key:'placeholder',enabled:true,fetchFn});await jobs.load();const job=await jobs.start({name:'Nova',description:'A cream fox'},'owner');
    const result=await jobs.poll(job.id,'owner');assert.equal(result.status,'awaiting_approval');assert.equal(submissions,1);
    await assert.rejects(jobs.poll(job.id,'another-owner'),e=>e.status===404);
    fail=true;await assert.rejects(jobs.approve(job.id,'owner'));assert.equal(jobs.view(jobs.owned(job.id,'owner')).status,'uncertain');
    const restarted=new TripoJobs({dir,key:'placeholder',enabled:true,fetchFn});await restarted.load();assert.equal((await restarted.poll(job.id,'owner')).status,'uncertain');
    await assert.rejects(restarted.approve(job.id,'owner'),e=>e.status===409);assert.equal(submissions,2);
  }finally{await rm(dir,{recursive:true,force:true});}
});
test('asset URLs cannot smuggle credentials or arbitrary third-party downloads',()=>{
  assert.equal(validMedia('https://cdn.tripo3d.ai/pet.glb'),true);assert.equal(validMedia('https://tripo3d.ai.evil.invalid/a'),false);assert.equal(validMedia('https://secret@cdn.tripo3d.ai/pet.glb'),false);assert.equal(validMedia('file:///private'),false);
});
