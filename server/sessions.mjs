import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomBytes, createHmac, timingSafeEqual } from 'node:crypto';

// Signed, expiring session cookies keep generation ownership across restarts.
// The signing secret is local server data, never a browser-accessible asset.
export class Sessions {
  static async open(dir, accessCode='') {
    await mkdir(dir,{recursive:true});
    const file=join(dir,'session-secret');
    try {await writeFile(file,randomBytes(32),{flag:'wx',mode:0o600});} catch(e) {if(e.code!=='EEXIST')throw e;}
    const key=await readFile(file);
    if(key.length!==32)throw new Error('Invalid local session secret.');
    return new Sessions(createHmac('sha256',key).update(accessCode).digest());
  }
  constructor(key){this.key=key;}
  sign(payload){return createHmac('sha256',this.key).update(payload).digest('base64url');}
  issue(now=Date.now()) {
    const session={owner:randomBytes(16).toString('hex'),expires:now+86400000};
    const payload=Buffer.from(JSON.stringify(session)).toString('base64url');
    return {token:payload+'.'+this.sign(payload),session};
  }
  read(token,now=Date.now()) {
    if(typeof token!=='string'||token.length>512)return null;
    const [payload,signature,...extra]=token.split('.');if(extra.length||!payload||!signature)return null;
    const a=Buffer.from(signature),b=Buffer.from(this.sign(payload));
    if(a.length!==b.length||!timingSafeEqual(a,b))return null;
    try {const value=JSON.parse(Buffer.from(payload,'base64url').toString());
      return /^[a-f0-9]{32}$/.test(value.owner)&&Number.isFinite(value.expires)&&value.expires>now&&value.expires<=now+86400000?value:null;
    }catch{return null;}
  }
}
