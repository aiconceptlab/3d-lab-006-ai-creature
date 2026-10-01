// Operator workflow: one paid stage per invocation, with durable task IDs.
// Never writes the API key or provider asset URLs to console output.
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {resolve} from 'node:path';
import {meshOptions,validMedia} from '../server/tripo.mjs';
const base='https://openapi.tripo3d.ai/v3',folder=resolve(process.env.DATA_DIR||'.data','nova'),file=resolve(folder,'pipeline.json');
const stage=process.argv[2]||'status';
if(!['status','mesh','check','rig','walk'].includes(stage))throw new Error('Use status, mesh, check, rig --approve-mesh, or walk.');
if(!process.env.TRIPO_API_KEY)throw new Error('Set TRIPO_API_KEY in the local .env file.');
async function api(path,body,form=false){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+process.env.TRIPO_API_KEY,...(form?{}:{'Content-Type':'application/json'})},body:body?(form?body:JSON.stringify(body)):undefined,signal:AbortSignal.timeout(30000)});let d;try{d=await r.json();}catch{throw new Error('Tripo returned an unreadable response.');}if(!r.ok||d.code!==0||!d.data)throw new Error(`Tripo request failed (HTTP ${r.status}, code ${d.code}). Check the provider dashboard before retrying a paid request.`);return d.data;}
await mkdir(folder,{recursive:true});let job={};try{job=JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
const save=async()=>{await writeFile(file+'.tmp',JSON.stringify(job,null,2));await rename(file+'.tmp',file);};
async function poll(name){const record=job[name];if(!record?.taskId)throw new Error('No task ID is available; inspect the provider dashboard before any resubmission.');const task=await api('/tasks/'+encodeURIComponent(record.taskId));record.status=task.status;record.progress=task.progress;record.credits=task.credits_consumed;record.output=task.output;await save();console.log(JSON.stringify({stage:name,status:record.status,progress:record.progress,credits:record.credits}));if(task.status==='success'&&['mesh','walk'].includes(name)){const url=task.output?.model_url;if(!validMedia(url))throw new Error('Provider returned an unexpected asset URL; inspect the dashboard.');const r=await fetch(url,{signal:AbortSignal.timeout(60000)});if(!r.ok)throw new Error('Model download failed; the task remains saved.');const data=Buffer.from(await r.arrayBuffer());if(data.length>50*1024*1024||data.subarray(0,4).toString()!=='glTF')throw new Error('Model is not an acceptable GLB.');await writeFile(resolve(folder,name+'.glb'),data);console.log(`Saved .data/nova/${name}.glb`);}return task;}
const balance=await api('/account/balance');console.log(JSON.stringify({apiCredits:balance.balance,frozen:balance.frozen}));
if(stage==='status'){for(const name of ['mesh','check','rig','walk'])if(job[name]?.taskId&&job[name]?.status!=='success')await poll(name);}
else if(job[stage]){await poll(stage);}
else{
 const required={mesh:40,check:0,rig:25,walk:10}[stage];if(!(balance.balance>=required))throw new Error(`Insufficient Tripo API credits: ${balance.balance} available; approximately ${required} needed for ${stage}. No generation submitted.`);
 let body,path;
 if(stage==='mesh'){const reference=await readFile('public/nova-reference.png');const form=new FormData();form.append('file',new Blob([reference],{type:'image/png'}),'nova-reference.png');const uploaded=await api('/files',form,true);if(typeof uploaded.file_token!=='string')throw new Error('Upload token missing.');path='/generation/image-to-model';body={input:uploaded.file_token,...meshOptions()};}
 else if(stage==='check'){if(job.mesh?.status!=='success')throw new Error('Mesh has not completed.');path='/animations/rig-check';body={input:job.mesh.taskId};}
 else if(stage==='rig'){if(!process.argv.includes('--approve-mesh'))throw new Error('Inspect the saved mesh first, then use rig --approve-mesh.');if(job.mesh?.status!=='success')throw new Error('Mesh has not completed.');if(job.check?.status!=='success'||!job.check.output?.riggable||job.check.output?.rig_type!=='quadruped')throw new Error('Run check and verify a successful quadruped result before rigging.');path='/animations/rig';body={input:job.mesh.taskId,model:'v2.5-20260210',rig_type:'quadruped',spec:'tripo',out_format:'glb'};}
 else {if(job.rig?.status!=='success')throw new Error('Rig has not completed.');path='/animations/retarget';body={input:job.rig.taskId,animation:'preset:quadruped:walk',out_format:'glb',bake_animation:true,animate_in_place:true};}
 // Persist before submission. A lost response must be reconciled in the dashboard.
 job[stage]={status:'submitting',submittedAt:new Date().toISOString(),settings:body};await save();
 const task=await api(path,body);if(typeof task.task_id!=='string')throw new Error('Task ID missing; reconcile the paid request in the provider dashboard.');job[stage].taskId=task.task_id;job[stage].status='running';await save();console.log(JSON.stringify({stage,status:'running',taskId:task.task_id}));
}
