import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { launchAddresses } from './server/network.mjs';
import { Jev, ProviderError } from './server/jev.mjs';
import { TripoJobs } from './server/tripo.mjs';
import { Sessions } from './server/sessions.mjs';
import { validateBrief, localDesign } from './shared/design.mjs';
import { ACTIONS, fallbackDecision } from './shared/motion.mjs';
const ROOT=fileURLToPath(new URL('.',import.meta.url));
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.wasm':'application/wasm','.glb':'model/gltf-binary','.mp4':'video/mp4','.woff2':'font/woff2'};
export function validateState(input) {
  if(!input||typeof input!=='object')throw new ProviderError('Invalid pet state.',400);
  const {energy,action,secondsInAction,follow,ball,tracking,personality,personVisible,distanceToPhone}=input;
  if(!Number.isFinite(energy)||energy<0||energy>100||!ACTIONS.includes(action)||!Number.isFinite(secondsInAction)||secondsInAction<0||secondsInAction>36000||typeof follow!=='boolean'||typeof ball!=='boolean'||!['normal','lost'].includes(tracking)||!['curious','playful','shy','sleepy'].includes(personality)||typeof personVisible!=='boolean'||!Number.isFinite(distanceToPhone)||distanceToPhone<0||distanceToPhone>1000)throw new ProviderError('Invalid pet state.',400);
  return {energy,action,secondsInAction,follow,ball,tracking,personality,personVisible,distanceToPhone};
}
export function createRateLimiter(now=Date.now) {
  const buckets=new Map();return (key,limit,windowMs)=>{const time=now();let bucket=buckets.get(key);if(!bucket||bucket.end<time){bucket={count:0,end:time+windowMs};if(buckets.size>2000){for(const[k,v]of buckets)if(v.end<time)buckets.delete(k);if(buckets.size>2000)throw new ProviderError('Server is busy. Try later.',429);}buckets.set(key,bucket);}if(++bucket.count>limit)throw new ProviderError('Too many requests. Please wait a moment.',429);};
}
export async function readJson(req) {if(!String(req.headers['content-type']||'').startsWith('application/json'))throw new ProviderError('Use a JSON request.',415);let bytes=0;const chunks=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>16384)throw new ProviderError('Request is too large.',413);chunks.push(chunk);}try{return JSON.parse(Buffer.concat(chunks).toString());}catch{throw new ProviderError('Invalid JSON.',400);}}
function equalSecret(a,b){const ha=createHash('sha256').update(String(a)).digest(),hb=createHash('sha256').update(String(b)).digest();return timingSafeEqual(ha,hb);}
export async function createApp({env=process.env,jev,fetchFn=fetch,development=false}={}) {
  const code=env.ACCESS_CODE||'',requireJev=env.REQUIRE_JEV==='1';
  const provider=env.JEV_PROVIDER||'typesafe';
  jev??=new Jev({key:provider==='jev-ai'?env.JEV_AI_API_KEY:env.TYPESAFE_API_KEY,provider,model:env.JEV_MODEL||'jev-latest',timeout:Number(env.JEV_TIMEOUT_MS)||3500,require:requireJev,fetchFn});
  const jobs=new TripoJobs({key:env.TRIPO_API_KEY,enabled:env.ENABLE_TRIPO==='1',dir:resolve(ROOT,env.DATA_DIR||'.data','jobs'),imageModel:env.TRIPO_IMAGE_MODEL||'chat_image_2.5_flare',meshModel:env.TRIPO_MESH_MODEL||'v3.1-20260211',fetchFn});await jobs.load();
  const sessions=await Sessions.open(resolve(ROOT,env.DATA_DIR||'.data'),code),rate=createRateLimiter();
  let vite=null;if(development){const {createServer}=await import('vite');vite=await createServer({root:ROOT,server:{middlewareMode:true,host:'127.0.0.1'},appType:'spa'});}
  function send(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
  const handler=async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Permissions-Policy','camera=(self), microphone=(), accelerometer=(self), gyroscope=(self), magnetometer=(self)');
    const secure=String(req.headers['x-forwarded-proto']||'')==='https';
    try {
      const url=new URL(req.url,'http://localhost');
      if(decodeURIComponent(url.pathname).split('/').some(p=>p.startsWith('.'))){res.writeHead(404);return res.end('Not found');}
      if(url.pathname.startsWith('/api/')) {
        const origin=req.headers.origin;
        if(origin&&new URL(origin).host!==req.headers.host)throw new ProviderError('This request came from another website.',403);
        const ip=req.socket.remoteAddress||'unknown';rate('ip:'+ip,360,60000);
        const localHost=/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(req.headers.host||'')&&['127.0.0.1','::1','::ffff:127.0.0.1'].includes(ip);
        const providerAccess=!!code||localHost;
        const cookies=String(req.headers.cookie||'').split(';').map(x=>x.trim());
        const cookie=cookies.find(x=>x.startsWith('creature_session='))?.slice(17);
        const session=sessions.read(cookie);
        const authorised=!!session;
        if(req.method==='GET'&&url.pathname==='/api/config')return send(res,200,{authRequired:!!code,authorised,jev:providerAccess&&!!jev.key,jevProvider:jev.provider||provider,jevStatus:!providerAccess||!jev.key?'unavailable':jev.authRejected?'rejected':jev.authenticated?'authenticated':'configured',requireJev,tripo:providerAccess&&jobs.available,designMode:providerAccess&&jev.key?'jev':'local'});
        if(req.method==='POST'&&url.pathname==='/api/session'){
          rate('login:'+ip,8,60000);const body=await readJson(req);if(code&&!equalSecret(body.code||'',code))throw new ProviderError('That access code did not match.',401);
          const {token}=sessions.issue();
          res.setHeader('Set-Cookie',`creature_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400${secure?'; Secure':''}`);return send(res,200,{ok:true});
        }
        if(!authorised)throw new ProviderError('Enter the access code to continue.',401);
        if(url.pathname.startsWith('/api/tripo/')||url.pathname.startsWith('/api/generations')){if(!providerAccess)throw new ProviderError('Set ACCESS_CODE on the server before sharing live AI access.',503);}
        if(req.method==='GET'&&url.pathname==='/api/tripo/balance'){rate('balance:'+session.owner,12,60000);return send(res,200,await jobs.balance());}
        if(req.method==='POST'&&url.pathname==='/api/design'){
          rate('design:'+session.owner,15,3600000);const input=await readJson(req),brief=validateBrief(input);if(!providerAccess&&requireJev)throw new ProviderError('Set ACCESS_CODE on the server before sharing live AI access.',503);if(input.mode==='local'&&requireJev)throw new ProviderError('This workshop requires Jev creation.',403);const result=input.mode==='local'||!providerAccess?{design:localDesign(brief.description),source:'local',note:'Local design demo · no AI request made'}:await jev.design(brief);return send(res,200,{...brief,...result});
        }
        if(req.method==='POST'&&url.pathname==='/api/decision'){
          rate('decision:'+session.owner,75,60000);const state=validateState(await readJson(req));
          if(!providerAccess){if(requireJev)throw new ProviderError('Set ACCESS_CODE on the server before sharing live AI access.',503);return send(res,200,{...fallbackDecision(state),note:'Local behaviour · no AI request made'});}
          try{return send(res,200,await jev.decide(state));}catch(e){if(requireJev)throw e;return send(res,200,{...fallbackDecision(state),note:'Local fallback · Jev unavailable'});}
        }
        if(req.method==='POST'&&url.pathname==='/api/generations') {rate('generation:'+session.owner,3,3600000);if(!jobs.available)throw new ProviderError('Image-to-3D is not connected.',503);return send(res,202,await jobs.start(validateBrief(await readJson(req)),session.owner));}
        const match=url.pathname.match(/^\/api\/generations\/([a-f0-9-]{36})(\/approve)?$/);
        if(match){if(req.method==='GET'&&!match[2])return send(res,200,await jobs.poll(match[1],session.owner));if(req.method==='POST'&&match[2]){await readJson(req);return send(res,200,await jobs.approve(match[1],session.owner));}}
        throw new ProviderError('This endpoint was not found.',404);
      }
      if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
      if(vite&&url.pathname.startsWith('/xr/')) {
        const engineRoot=resolve(ROOT,'node_modules/@8thwall/engine-binary/dist');
        const engineFile=resolve(engineRoot,decodeURIComponent(url.pathname.slice(4)));
        if(!engineFile.startsWith(engineRoot+sep)){res.writeHead(403);return res.end();}
        try{const data=await readFile(engineFile);res.writeHead(200,{'Content-Type':MIME[extname(engineFile)]||'application/octet-stream'});return res.end(req.method==='HEAD'?undefined:data);}catch{res.writeHead(404);return res.end('Not found');}
      }
      if(vite){return vite.middlewares(req,res,()=>{res.writeHead(404);res.end('Not found');});}
      const path=decodeURIComponent(url.pathname);
      const base=resolve(ROOT,'dist');let file=resolve(base,'.'+path);
      if(!file.startsWith(base+sep)&&file!==base){res.writeHead(403);return res.end();}
      try{if(!(await stat(file)).isFile())file=resolve(base,'index.html');}catch{if(extname(path)){res.writeHead(404);return res.end('Not found');}file=resolve(base,'index.html');}
      const data=await readFile(file);res.writeHead(200,{'Content-Type':MIME[extname(file)]||'application/octet-stream','Cache-Control':file.endsWith('index.html')?'no-cache':'public, max-age=3600'});res.end(req.method==='HEAD'?undefined:data);
    }catch(e){if(!res.headersSent)send(res,e.status||400,{error:e.message||'Something went wrong.'});else res.end();}
  };
  const server=http.createServer(handler);return {server,close:async()=>{await vite?.close();server.closeAllConnections();await new Promise(r=>server.listening?server.close(r):r());},jobs};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  let built=false;try{built=(await stat(resolve(ROOT,'dist/index.html'))).isFile();}catch{}
  const app=await createApp({development:process.argv.includes('--dev')||!built});const port=Number(process.env.PORT)||3019;const host=process.env.HOST||'0.0.0.0';
  app.server.listen(port,host,()=>{console.log('AI Creature — 3D LAB // 006');for(const address of launchAddresses(host,port))console.log(`${address.label}: ${address.url}`);if(!process.env.ACCESS_CODE&&(process.env.TYPESAFE_API_KEY||process.env.JEV_AI_API_KEY||process.env.ENABLE_TRIPO==='1'))console.log('LAN: included pets + local behaviour. Set ACCESS_CODE to share provider actions.');});
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await app.close();process.exit();});
}
