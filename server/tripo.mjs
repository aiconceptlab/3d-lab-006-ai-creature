import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, readdir, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { ProviderError } from './jev.mjs';
const BASE='https://openapi.tripo3d.ai/v3';
const stages={reference:'/generation/text-to-image',mesh:'/generation/image-to-model',check:'/animations/rig-check',rig:'/animations/rig',walk:'/animations/retarget'};
export class TripoJobs {
  constructor({key='',enabled=false,dir='.data/jobs',imageModel='chat_image_2.5_flare',meshModel='v3.1-20260211',fetchFn=fetch,finishFn=null}={}) {Object.assign(this,{key,enabled,dir,imageModel,meshModel,fetchFn,finishFn});this.jobs=new Map();this.pending=new Set();}
  get available(){return this.enabled&&!!this.key;}
  async load(){await mkdir(this.dir,{recursive:true});for(const name of await readdir(this.dir)){if(!/^[a-f0-9-]+\.json$/.test(name))continue;try{const job=JSON.parse(await readFile(join(this.dir,name),'utf8'));if(job.status==='processing')job.status='finish_pending';this.jobs.set(job.id,job);}catch{/* Ignore incomplete/unrelated records. */}}}
  async save(job){this.jobs.set(job.id,job);const file=join(this.dir,`${job.id}.json`);await writeFile(file+'.tmp',JSON.stringify(job));await rename(file+'.tmp',file);}
  async request(path,body) {
    if(!this.available)throw new ProviderError('Image-to-3D is not connected. The procedural pet creator is available.',503);
    let response;try{response=await this.fetchFn(BASE+path,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${this.key}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});}catch{throw new ProviderError('Tripo did not confirm the request. Do not resubmit a paid stage until its status is checked.',504);}
    if(response.status===401||response.status===403)throw new ProviderError('Tripo rejected the API key. Check the developer API key on the server.',502);
    if(!response.ok)throw new ProviderError('Tripo could not complete this stage. Check provider status and account access.');
    const value=await response.json();if(value.code!==0||!value.data)throw new ProviderError('Tripo returned an unsuccessful response.');return value.data;
  }
  async balance(){const data=await this.request('/account/balance');if(!Number.isFinite(data.balance)||data.balance<0)throw new ProviderError('Tripo did not return a valid API balance.',502);return {available:data.balance,frozen:data.frozen??0};}
  async requireCredits(minimum){const balance=await this.balance();if(balance.available<minimum)throw new ProviderError(`Tripo API balance is ${balance.available} credits. This stage needs approximately ${minimum} credits. Add developer API credits before continuing.`,402);}
  async start(brief,owner) {
    await this.requireCredits(10);
    const job={id:randomUUID(),owner,name:brief.name,description:brief.description,stage:'reference',status:'submitting',createdAt:Date.now(),taskId:null,referenceTaskId:null,meshTaskId:null,rigTaskId:null};
    await this.save(job);
    try {await this.submit(job);}catch(e){job.status='uncertain';job.error=e.message;await this.save(job);}
    return this.view(job);
  }
  async submit(job) {
    // Save submitting before the paid request. An interrupted submission is never auto-repeated.
    job.status='submitting';await this.save(job);
    const body=job.stage==='reference'?{model:this.imageModel,prompt:`Premium animated-film character concept: ${job.description}. An exceptionally appealing, expressive fictional four-legged companion, cohesive silhouette, sculpted layered fur clumps, rounded cheeks, large glossy eyes with clear catchlights, detailed physically based coat and soft paw pads. Full body, neutral standing pose, all four paws separated and visible, face aligned with the torso, three-quarter side view. Soft even studio lighting, clean pale background, restrained accent glow, no dramatic shadows baked into fur, no props, no text, no extra limbs. Designed as a coherent mobile 3D character.`,size:'1024x1024',quality:'medium',output_format:'png'}:
      job.stage==='mesh'?{input:job.referenceTaskId,...meshOptions(this.meshModel)}:
      job.stage==='check'?{input:job.meshTaskId}:
      job.stage==='rig'?{input:job.meshTaskId,model:'v2.5-20260210',rig_type:'quadruped',spec:'tripo',out_format:'glb'}:
      {input:job.rigTaskId,animation:'preset:quadruped:walk',out_format:'glb',bake_animation:true,animate_in_place:true};
    const task=await this.request(stages[job.stage],body);
    if(typeof task.task_id!=='string')throw new ProviderError('Tripo did not return a task ID.');
    job.taskId=task.task_id;job.status='running';job.lastPoll=0;delete job.error;await this.save(job);
  }
  async approve(id,owner) {const job=this.owned(id,owner);if(job.status!=='awaiting_approval')throw new ProviderError('This reference is not ready for approval.',409);await this.requireCredits(75);job.stage='mesh';try{await this.submit(job);}catch(e){job.status='uncertain';job.error=e.message;await this.save(job);throw e;}return this.view(job);}
  owned(id,owner){const job=this.jobs.get(id);if(!job||job.owner!==owner)throw new ProviderError('This generation was not found.',404);return job;}
  async poll(id,owner) {
    const job=this.owned(id,owner);
    if(job.status==='complete'&&validMedia(job.modelUrl)){job.rawModelUrl=job.modelUrl;delete job.modelUrl;job.stage='finish';job.status='finish_pending';await this.save(job);}
    if(job.status==='finish_pending'){this.finish(job);return this.view(job);}
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
        else {job.rawModelUrl=task.output?.model_url;if(!validMedia(job.rawModelUrl))throw new ProviderError('Animated model was missing.');job.stage='finish';job.status='finish_pending';}
      }
      job.progress=task.progress??0;await this.save(job);
    }catch(e){job.error=e.message;if(job.status==='submitting'){job.status='uncertain';}else if(e.status!==504){job.status='failed';}await this.save(job);}
    finally{this.pending.delete(id);}
    return this.view(job);
  }
  finish(job){
    if(this.pending.has('finish:'+job.id))return;
    this.pending.add('finish:'+job.id);job.status='processing';delete job.error;
    void (async()=>{try{await this.save(job);if(!this.finishFn)throw new Error('Local Blender finishing is not configured.');Object.assign(job,await this.finishFn(job));job.status='complete';job.progress=100;}catch(e){job.status='finish_failed';job.error=e.message;}finally{try{await this.save(job);}finally{this.pending.delete('finish:'+job.id);}}})().catch(()=>{job.status='finish_failed';job.error='Could not save the finished model. Check server storage; no automatic paid retry was made.';});
  }
  async retryFinish(id,owner){const job=this.owned(id,owner);if(job.status!=='finish_failed')throw new ProviderError('This model does not need a finishing retry.',409);job.status='finish_pending';await this.save(job);return this.poll(id,owner);}
  view(job){return {id:job.id,name:job.name,description:job.description,stage:job.stage,status:job.status,progress:job.progress??0,imageUrl:job.imageUrl,modelUrl:job.modelUrl,error:job.error,createdAt:job.createdAt,quality:job.quality};}
}
export function validMedia(value){try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&(/(^|\.)tripo3d\.(ai|com)$/.test(url.hostname));}catch{return false;}}
export function meshOptions(model='v3.1-20260211'){return {model,face_limit:model.startsWith('P1')?20000:40000,texture:true,pbr:true,texture_quality:'detailed',texture_version:'v3.5-20260815',delight:true};}
