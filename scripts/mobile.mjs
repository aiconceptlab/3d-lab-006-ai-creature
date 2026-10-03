import {spawn,spawnSync} from 'node:child_process';
import {readFile,writeFile,mkdir,chmod,unlink,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const ROOT=fileURLToPath(new URL('..',import.meta.url));
const dir=resolve(ROOT,process.env.DATA_DIR||'.data'),port=Number(process.env.MOBILE_PORT||3020);
const statusFile=join(dir,'mobile-tunnel.json'),release='2026.9.3';
const assets={
  'win32-x64':['cloudflared-windows-amd64.exe','f096265ec2fcbe9bb6e2d64268db167ced3fcbb83d894bdb9e2fcdb26f2ea7e2'],
  'linux-x64':['cloudflared-linux-amd64','77e26d8d900e0b8469f416239d14b5f296525fdf79fee6f511ef55609e3fbac2'],
  'linux-arm64':['cloudflared-linux-arm64','aaeb2d7d0da3614634c7e03ab13487a1522c2e79165ed2929cfe23d5e95b326d'],
  'darwin-x64':['cloudflared-darwin-amd64.tgz','d1155d0837487f261183b15c1eab6c4ebcad9dc49b94675f1524c3564cea3977'],
  'darwin-arm64':['cloudflared-darwin-arm64.tgz','587c2cfb1c230fe36c7fa7727da78be459dae028cabe8c001291999350f07095'],
};
const delay=ms=>new Promise(r=>setTimeout(r,ms));
let app=null,tunnel=null,stopping=false;
async function stop(){if(stopping)return;stopping=true;tunnel?.kill();app?.kill();try{const status=JSON.parse(await readFile(statusFile,'utf8'));if(status.pid===tunnel?.pid)await unlink(statusFile);}catch{}}
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{stop().then(()=>process.exit(0));});
async function binary(){
  if(process.env.CLOUDFLARED_PATH){const probe=spawnSync(process.env.CLOUDFLARED_PATH,['--version']);if(probe.status!==0)throw new Error('CLOUDFLARED_PATH could not run. Use the official cloudflared executable.');return process.env.CLOUDFLARED_PATH;}
  const asset=assets[process.platform+'-'+process.arch];
  if(!asset)throw new Error('Install official cloudflared and set CLOUDFLARED_PATH for this operating system.');
  const tools=join(dir,'tools','cloudflared-'+release);await mkdir(tools,{recursive:true});
  const archive=join(tools,asset[0]);let bytes;
  try{bytes=await readFile(archive);}catch{}
  if(!bytes||createHash('sha256').update(bytes).digest('hex')!==asset[1]){
    console.log('Downloading the official, checksum-verified Cloudflare phone connector…');
    const response=await fetch('https://github.com/cloudflare/cloudflared/releases/download/'+release+'/'+asset[0],{signal:AbortSignal.timeout(180000)});
    if(!response.ok)throw new Error('Could not download cloudflared. Check internet access.');bytes=Buffer.from(await response.arrayBuffer());
    if(createHash('sha256').update(bytes).digest('hex')!==asset[1])throw new Error('Cloudflared checksum did not match. Nothing was executed.');
    await writeFile(archive,bytes,{mode:0o700});
  }
  if(asset[0].endsWith('.tgz')){const result=spawnSync('tar',['-xzf',archive,'-C',tools,'cloudflared']);if(result.status!==0)throw new Error('Could not unpack cloudflared. Install it and set CLOUDFLARED_PATH.');return join(tools,'cloudflared');}
  if(process.platform!=='win32')await chmod(archive,0o700);return archive;
}
async function ready(){try{const response=await fetch('http://127.0.0.1:'+port+'/api/config',{signal:AbortSignal.timeout(2000)});if(!response.ok)return false;const config=await response.json();if(!config.mobileOnly)throw new Error('That port is not the protected mobile listener. Check MOBILE_PORT.');if(config.development)throw new Error('Stop npm run dev, build with npm run build, then start npm run mobile. Phone sharing needs the production build.');return true;}catch(e){if(e.message.includes('protected mobile')||e.message.includes('production build'))throw e;return false;}}
try{
  if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Set MOBILE_PORT to an available port from 1024 to 65535.');
  await mkdir(dir,{recursive:true});
  let previous;try{previous=JSON.parse(await readFile(statusFile,'utf8'));process.kill(previous.pid,0);}catch{previous=null;}
  if(previous)throw new Error('A secure phone link is already running. Use Send this pet to my phone in the app.');
  const executable=await binary();
  if(!await ready()){
    if(!(await stat(join(ROOT,'dist/index.html')).catch(()=>null)))throw new Error('Build once with npm run build before starting the phone link.');
    console.log('Starting the companion workshop…');app=spawn(process.execPath,['--env-file-if-exists=.env','server.mjs'],{cwd:ROOT,stdio:['ignore','inherit','inherit'],windowsHide:true});
    app.on('error',e=>console.error(e.message));
    for(let i=0;i<30&&!await ready();i++){if(app.exitCode!==null)throw new Error('The workshop could not start. Check ports 3019 and '+port+'.');await delay(500);}
    if(!await ready())throw new Error('The protected phone listener could not start.');
  }
  // Tunnel ONLY the read-only mobile listener, never the paid workshop port.
  const emptyConfig=join(dir,'mobile-cloudflared.yml');await writeFile(emptyConfig,'loglevel: info\n');
  tunnel=spawn(executable,['--no-autoupdate','tunnel','--config',emptyConfig,'--protocol','http2','--url','http://127.0.0.1:'+port],{cwd:ROOT,windowsHide:true,stdio:['ignore','pipe','pipe']});
  let published=false,buffer='';
  const output=chunk=>{buffer=(buffer+chunk.toString()).slice(-8000);const match=buffer.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);if(match&&!published){published=true;writeFile(statusFile,JSON.stringify({url:match[0],pid:tunnel.pid}),{mode:0o600}).then(()=>console.log('\nSecure phone link: '+match[0]+'\nOn your computer, click Send this pet to my phone and scan the QR code.\nKeep this terminal and the computer running. Ctrl+C stops sharing.')).catch(e=>{console.error(e.message);stop();});}if(/ERR|failed/i.test(chunk.toString()))console.error(chunk.toString().trim());};
  tunnel.stdout.on('data',output);tunnel.stderr.on('data',output);
  tunnel.on('error',e=>{console.error('Phone connector: '+e.message);stop().then(()=>process.exit(1));});
  tunnel.on('exit',code=>{if(!stopping){console.log('Secure phone link stopped.');stop().then(()=>process.exit(code||0));}});
}catch(e){console.error(e.message);await stop();process.exitCode=1;}
