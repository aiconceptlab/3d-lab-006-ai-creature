// Render the actual browser assets from the side, with deterministic clip times.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {createServer} from 'vite';
const html=`<!doctype html><html><meta charset="utf-8"><style>body{margin:0;background:#111e22;color:#eaf5ee;font:20px system-ui}header{padding:20px 30px;display:flex;justify-content:space-between}#stage{height:580px}small{color:#97b7b0;font-size:13px}</style><header><b id="title">Companion animation review</b><small>Actual included 3D model · Blender animations</small></header><div id="stage"></div><script type="module">
import {Studio} from '/src/view.js';import {loadCreatureAsset,createImportedCreature} from '/src/imported-creature.js';import {PRESETS} from '/shared/design.mjs';
const studio=new Studio(document.querySelector('#stage'),PRESETS[0].design);studio.pause();
studio.camera.position.set(.65,.53,1.5);studio.controls.target.set(0,.27,0);studio.controls.update();
let pet;window.review={async load(name){const asset=await loadCreatureAsset('/models/'+name+'-living.glb');pet=createImportedCreature(asset);studio.useCreature(pet);window.review.sample('Idle',0);},sample(clip,time){pet.mixer.stopAllAction();const a=pet.mixer.clipAction(pet.clips().find(c=>c.name===clip));a.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).play();a.time=time;pet.mixer.update(0);studio.pet.group.updateMatrixWorld(true);studio.renderer.render(studio.scene,studio.camera);document.querySelector('#title').textContent=clip;},async play(clip,speed,seconds,name){studio.camera.position.set(speed?1.15:.65,.53,speed?.75:1.5);studio.controls.target.set(0,.27,0);studio.controls.update();pet.group.position.set(0,0,0);document.querySelector('#title').textContent=name+' · '+clip;let last=performance.now(),end=last+seconds*1000;await new Promise(resolve=>{function frame(now){const dt=Math.min(.05,(now-last)/1000);pet.animate(dt,speed,'idle',clip);if(speed){pet.group.position.z+=speed*dt;studio.camera.position.z+=speed*dt;studio.controls.target.z+=speed*dt;studio.controls.update();}last=now;studio.renderer.render(studio.scene,studio.camera);if(now<end)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});}};window.ready=true;
</script></html>`;
await mkdir('artifacts/animation-review',{recursive:true});const app=await createServer({server:{port:0,host:'127.0.0.1'}});await app.listen();
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});
try{
  const context=await browser.newContext({viewport:{width:960,height:650},recordVideo:{dir:'artifacts/animation-review',size:{width:960,height:650}}}),page=await context.newPage();
  page.on('pageerror',e=>console.error(e.message));
  page.on('console',m=>{if(m.type()==='error')console.error(m.text());});
  page.on('requestfailed',r=>console.error(r.url()+' '+r.failure()?.errorText));
  await page.route('**/animation-review',route=>route.fulfill({contentType:'text/html',body:html}));await page.goto('http://127.0.0.1:'+app.httpServer.address().port+'/animation-review');await page.waitForFunction(()=>window.ready);
  const canvas=createCanvas(1440,840),ctx=canvas.getContext('2d');ctx.fillStyle='#111e22';ctx.fillRect(0,0,1440,840);
  for(const [row,name] of ['nova','mochi','ember'].entries()){
    await page.evaluate(name=>window.review.load(name),name);
    for(const [column,clip] of ['Curious','Playful','Shy','Sleepy','Greet','Stretch'].entries()){
      await page.evaluate(clip=>window.review.sample(clip,clip==='Curious'?1.8:clip==='Sleepy'?3:2),clip);
      const bytes=await page.locator('#stage').screenshot();await writeFile('artifacts/animation-review/'+name+'-'+clip.toLowerCase()+'.png',bytes);ctx.drawImage(await loadImage(bytes),column*240,row*280,240,235);
    }
    // Static clip sampling changes mixer state; use a fresh runtime so the
    // recorded labels and transitions reflect the normal application's state.
    await page.evaluate(name=>window.review.load(name),name);
    for(const [clip,speed,seconds] of [['Walk',.1,5],['Trot',.2,5],['Curious',0,5],['Playful',0,4],['Shy',0,5],['Sleepy',0,6],['Greet',0,4],['Stretch',0,5]])await page.evaluate(args=>window.review.play(...args),[clip,speed,seconds,name]);
  }
  await writeFile('artifacts/animation-review/contact-sheet.png',canvas.toBuffer('image/png'));
  const video=page.video();await context.close();await video.saveAs('artifacts/animation-review/living-companions.webm');console.log('Actual animation review saved: artifacts/animation-review/living-companions.webm');
}finally{await browser.close();await app.close();}
