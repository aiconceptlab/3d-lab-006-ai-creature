import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validMedia} from './tripo.mjs';
const ROOT=fileURLToPath(new URL('..',import.meta.url));
export const LIVING_CLIPS=['Idle','Walk','Trot','Look','Rest','Curious','Playful','Shy','Sleepy','Greet','Stretch','TurnLeft','TurnRight'];
function run(executable,args,timeout=300000){return new Promise((resolvePromise,reject)=>{
 const child=spawn(executable,args,{shell:false,windowsHide:true,cwd:ROOT,stdio:['ignore','pipe','pipe']});let log='';
 const timer=setTimeout(()=>{child.kill();reject(new Error('Local animation finishing timed out.'));},timeout);
 for(const stream of [child.stdout,child.stderr])stream.on('data',data=>{log=(log+data.toString()).slice(-4000);});
 child.on('error',()=>{clearTimeout(timer);reject(new Error('Blender could not start. Check BLENDER_PATH.'));});
 child.on('close',code=>{clearTimeout(timer);if(code===0)resolvePromise(log);else reject(new Error('The rig or face needs review in Blender. The original model is saved; no extra credits were spent.'));});
 });}
export async function findBlender(configured=''){
 const candidates=configured?[configured]:['blender',...(process.platform==='win32'?['C:/Program Files/Blender Foundation/Blender 4.5/blender.exe','C:/Program Files/Blender Foundation/Blender 5.0/blender.exe']:[])];
 for(const candidate of candidates){try{const version=await run(candidate,['--version'],10000);if(/Blender (4\.5|[5-9]\.)/.test(version))return candidate;}catch{}}
 return null;
}
export function embeddedGLB(data){
 if(data.length<28||data.readUInt32LE(0)!==0x46546c67||data.readUInt32LE(4)!==2||data.readUInt32LE(8)!==data.length)throw new Error('Invalid finished GLB.');
 const length=data.readUInt32LE(12);if(length>data.length-20)throw new Error('Invalid GLB metadata.');
 const doc=JSON.parse(data.subarray(20,20+length).toString());
 if(doc.buffers?.some(b=>b.uri)||doc.images?.some(i=>i.uri))throw new Error('The model must embed its resources.');
 return doc;
}
export function validateFinishedGLB(data){
 const doc=embeddedGLB(data);
 if(!doc.skins?.length||LIVING_CLIPS.some(name=>!doc.animations?.some(clip=>clip.name===name)))throw new Error('The complete living animation set is missing.');
 if(!doc.meshes?.some(mesh=>mesh.extras?.targetNames?.includes('JawOpen')))throw new Error('The animated jaw is missing.');
 return doc;
}
async function download(url,path,fetchFn){
 if(!validMedia(url))throw new Error('Invalid provider model URL.');
 const response=await fetchFn(url,{redirect:'error',signal:AbortSignal.timeout(60000)});
 if(!response.ok||!response.body)throw new Error('Could not retrieve the original model.');
 let bytes=0;const chunks=[];
 for await(const chunk of response.body){bytes+=chunk.length;if(bytes>50*1024*1024)throw new Error('The model exceeds the finishing size limit.');chunks.push(chunk);}
 const data=Buffer.concat(chunks);embeddedGLB(data);
 await writeFile(path,data);
}
export function createFinisher({blender,dir,fetchFn=fetch}){
 let queue=Promise.resolve();
 return job=>{
  const work=async()=>{
   if(!blender)throw new Error('Install Blender 4.5 LTS or newer and set BLENDER_PATH. Your model is saved; finishing uses no provider credits.');
   if(!/^[a-f0-9-]{36}$/.test(job.id))throw new Error('Invalid generation identifier.');
   const folder=join(dir,job.id);await mkdir(folder,{recursive:true});const source=join(folder,'original.glb'),output=join(folder,'living.glb'),reportPath=join(folder,'review.json');
   try{await stat(source);}catch{await download(job.rawModelUrl,source,fetchFn);}
   embeddedGLB(await readFile(source));
   await run(blender,['--background','--disable-autoexec','--python-exit-code','1','--python',resolve(ROOT,'scripts/animate-companions.py'),'--',source,output,reportPath,'--no-blend']);
   validateFinishedGLB(await readFile(output));
   const report=JSON.parse(await readFile(reportPath,'utf8'));
   return {modelUrl:`/api/generations/${job.id}/model.glb`,quality:{clips:report.clips.map(c=>c.clip),faceReviewRequired:report.facialRig.reviewRequired===true,facialCalibration:report.facialRig.calibration||'reviewed',blender:report.blender}};
  };
  const result=queue.then(work);queue=result.catch(()=>{});return result;
 };
}
