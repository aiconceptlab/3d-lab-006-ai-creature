import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {randomBytes,createHash} from 'node:crypto';
import {ProviderError} from './jev.mjs';
import {validateBrief,validateDesign,currentModelUrl,localDesign} from '../shared/design.mjs';

const digest=token=>createHash('sha256').update(token).digest('hex');
export function httpsOrigin(value){
  try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&url.pathname==='/'&&!url.search&&!url.hash?url.origin:null;}catch{return null;}
}
// A phone capability grants one finished pet for an hour, never workshop ownership.
// Only token hashes persist. Revocation also invalidates a redeemed phone cookie.
export class MobileLinks{
  static async open(dir){await mkdir(dir,{recursive:true});const store=new MobileLinks(join(dir,'mobile-links.json'));try{const data=JSON.parse(await readFile(store.file,'utf8'));for(const entry of data)if(entry.expires>Date.now())store.links.set(entry.id,entry);}catch(e){if(e.code!=='ENOENT')throw e;}return store;}
  constructor(file){this.file=file;this.links=new Map();this.queue=Promise.resolve();}
  save(){this.queue=this.queue.catch(()=>{}).then(async()=>{for(const[id,entry]of this.links)if(entry.expires<=Date.now())this.links.delete(id);await writeFile(this.file+'.tmp',JSON.stringify([...this.links.values()]),{mode:0o600});await rename(this.file+'.tmp',this.file);});return this.queue;}
  async issue(input,owner,jobs,now=Date.now()){
    const brief=validateBrief(input),design=validateDesign(input.design),modelUrl=currentModelUrl(input.modelUrl);
    const match=typeof modelUrl==='string'&&modelUrl.match(/^\/api\/generations\/([a-f0-9-]{36})\/model\.glb$/);
    let pet={...brief,design,source:'local'};
    if(match){const job=jobs.owned(match[1],owner);if(job.status!=='complete')throw new ProviderError('Finish this companion before sending it to your phone.',409);pet={name:job.name,description:job.description,design:localDesign(job.description),source:'generated',modelUrl,jobId:job.id};}
    else if(modelUrl){if(!/^\/models\/(nova|mochi|ember)-living\.glb\?v=living-3$/.test(modelUrl))throw new ProviderError('This model cannot be shared.',400);pet={...pet,source:'sample',modelUrl};}
    for(const[id,entry]of this.links)if(entry.owner===owner||entry.expires<=now)this.links.delete(id);
    if(this.links.size>=500)throw new ProviderError('Mobile sharing is busy. Try again later.',429);
    const token=randomBytes(32).toString('hex'),id=digest(token),expires=now+3600000;
    this.links.set(id,{id,owner,pet,expires});await this.save();return {token,id,expires};
  }
  read(token,now=Date.now()){if(typeof token!=='string'||! /^[a-f0-9]{64}$/.test(token))return null;const entry=this.links.get(digest(token));return entry&&entry.expires>now?entry:null;}
  async revoke(id,owner){const entry=this.links.get(id);if(!entry||entry.owner!==owner)throw new ProviderError('This phone link was not found.',404);this.links.delete(id);await this.save();}
}
export async function mobileOrigin(dir,configured=''){
  if(configured)return httpsOrigin(configured);
  try{const status=JSON.parse(await readFile(join(dir,'mobile-tunnel.json'),'utf8'));if(!Number.isInteger(status.pid)||status.pid<1)return null;process.kill(status.pid,0);return httpsOrigin(status.url);}catch{return null;}
}
