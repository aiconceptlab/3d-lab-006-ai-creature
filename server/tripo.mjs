import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, readdir, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { ProviderError } from './jev.mjs';
const BASE='https://openapi.tripo3d.ai/v3';
const stages={reference:'/generation/text-to-image',mesh:'/generation/image-to-model',check:'/animations/rig-check',rig:'/animations/rig',walk:'/animations/retarget'};
export class TripoJobs {
  constructor({key='',enabled=false,dir='.data/jobs',imageModel='chat_image_2.5_flare',meshModel='P1-20260311',fetchFn=fetch}={}) {Object.assign(this,{key,enabled,dir,imageModel,meshModel,fetchFn});this.jobs=new Map();this.pending=new Set();}
  get available(){return this.enabled&&!!this.key;}
  async load(){await mkdir(this.dir,{recursive:true});for(const name of await readdir(this.dir)){if(!/^[a-f0-9-]+\.json$/.test(name))continue;try{const job=JSON.parse(await readFile(join(this.dir,name),'utf8'));this.jobs.set(job.id,job);}catch{/* Ignore incomplete/unrelated records. */}}}
  async save(job){this.jobs.set(job.id,job);const file=join(this.dir,`${job.id}.json`);await writeFile(file+'.tmp',JSON.stringify(job));await rename(file+'.tmp',file);}
  async request(path,body) {
    if(!this.available)throw new ProviderError('Image-to-3D is not connected. The procedural pet creator is available.',503);
    let response;try{response=await this.fetchFn(BASE+path,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${this.key}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});}catch{throw new ProviderError('Tripo did not confirm the request. Do not resubmit a paid stage until its status is checked.',504);}
    if(!response.ok)throw new ProviderError('Tripo could not complete this stage. Check provider status and account access.');
    const value=await response.json();if(value.code!==0||!value.data)throw new ProviderError('Tripo returned an unsuccessful response.');return value.data;
  }
  async start(brief,owner) {
    const job={id:randomUUID(),owner,name:brief.name,description:brief.description,stage:'reference',status:'submitting',createdAt:Date.now(),taskId:null,referenceTaskId:null,meshTaskId:null,rigTaskId:null};
    await this.save(job);
    try {await this.submit(job);}catch(e){job.status='uncertain';job.error=e.message;await this.save(job);throw e;}
    return this.view(job);
  }
  async submit(job) {
    // Save submitting before the paid request. An interrupted submission is never auto-repeated.
    job.status='submitting';await this.save(job);
    const body=job.stage==='reference'?{model:this.imageModel,prompt:`One fictional four-legged pet: ${job.description}. Full body, neutral standing pose, all four paws separated and visible, clean plain background, no props, no text, no extra limbs.`,size:'1024x1024',quality:'medium',output_format:'png'}:
      job.stage==='mesh'?{input:job.referenceTaskId,model:this.meshModel,face_limit:8000,texture:true,pbr:true}:
      job.stage==='check'?{input:job.meshTaskId}:
      job.stage==='rig'?{input:job.meshTaskId,model:'v2.5-20260210',rig_type:'quadruped',spec:'tripo',out_format:'glb'}:
      {input:job.rigTaskId,animation:'preset:quadruped:walk',out_format:'glb',bake_animation:true,animate_in_place:true};
    const task=await this.request(stages[job.stage],body);
    if(typeof task.task_id!=='string')throw new ProviderError('Tripo did not return a task ID.');
    job.taskId=task.task_id;job.status='running';job.lastPoll=0;delete job.error;await this.save(job);
  }
  async approve(id,owner) {const job=this.owned(id,owner);if(job.status!=='awaiting_approval')throw new ProviderError('This reference is not ready for approval.',409);job.stage='mesh';try{await this.submit(job);}catch(e){job.status='uncertain';job.error=e.message;await this.save(job);throw e;}return this.view(job);}
  owned(id,owner){const job=this.jobs.get(id);if(!job||job.owner!==owner)throw new ProviderError('This generation was not found.',404);return job;}
  async poll(id,owner) {
    const job=this.owned(id,owner);
    if(job.status!=='running'||Date.now()-(job.lastPoll||0)<2500||this.pending.has(id))return this.view(job);
    this.pending.add(id);job.lastPoll=Date.now();
    try {
      const task=await this.request(`/tasks/${encodeURIComponent(job.taskId)}`);
      if(['failed','cancelled','canceled'].includes(task.status)){job.status='failed';job.error='The provider could not complete this stage. No automatic retry was submitted.';}
      else if(task.status==='success') {
        if(job.stage==='reference') {job.referenceTaskId=job.taskId;job.imageUrl=task.output?.generated_image_url;job.status='awaiting_approval';if(!validMedia(job.imageUrl))throw new ProviderError('Reference image was missing.');}
        else if(job.stage==='mesh'){job.meshTaskId=job.taskId;job.stage='check';await this.submit(job);}
        else if(job.stage==='check'){if(!task.output?.riggable||task.output.rig_type!=='quadruped')throw new ProviderError('This mesh does not support the required four-legged rig. The reference remains saved.');job.stage='rig';await this.submit(job);}
        else if(job.stage==='rig'){job.rigTaskId=job.taskId;job.stage='walk';await this.submit(job);}
        else {job.modelUrl=task.output?.model_url;job.status='complete';if(!validMedia(job.modelUrl))throw new ProviderError('Animated model was missing.');}
      }
      job.progress=task.progress??0;await this.save(job);
    }catch(e){job.error=e.message;if(job.status==='submitting'){job.status='uncertain';}else if(e.status!==504){job.status='failed';}await this.save(job);}
    finally{this.pending.delete(id);}
    return this.view(job);
  }
  view(job){return {id:job.id,name:job.name,stage:job.stage,status:job.status,progress:job.progress??0,imageUrl:job.imageUrl,modelUrl:job.modelUrl,error:job.error,createdAt:job.createdAt};}
}
export function validMedia(value){try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&(/(^|\.)tripo3d\.(ai|com)$/.test(url.hostname));}catch{return false;}}
