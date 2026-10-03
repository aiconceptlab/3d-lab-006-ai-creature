// Production UI, real bundled rig and isolated phone session; no vendor calls.
import {chromium,devices} from 'playwright';import assert from 'node:assert/strict';
import {mkdtemp,rm,mkdir,copyFile} from 'node:fs/promises';import {join} from 'node:path';import {tmpdir} from 'node:os';
import {createApp} from '../server.mjs';import {PRESETS} from '../shared/design.mjs';
const dir=await mkdtemp(join(tmpdir(),'pet-phone-browser-'));
const app=await createApp({env:{DATA_DIR:dir,MOBILE_URL:'https://phone.example'},fetchFn:()=>{throw new Error('No provider requests allowed');}});
await Promise.all([new Promise(r=>app.server.listen(0,'127.0.0.1',r)),new Promise(r=>app.mobileServer.listen(0,'127.0.0.1',r))]);
const base='http://127.0.0.1:'+app.server.address().port,phone='http://127.0.0.1:'+app.mobileServer.address().port;
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});await mkdir('artifacts',{recursive:true});
try{
 const pc=await browser.newContext({viewport:{width:1440,height:1050}}),page=await pc.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/#create');await page.waitForFunction(()=>window.creatureLab?.snapshot().asset.clips.length===13);
 const owner=(await pc.request.post(base+'/api/session',{data:{}})).headers()['set-cookie'];
 const {Sessions}=await import('../server/sessions.mjs'),session=(await Sessions.open(dir)).read(owner.split(';')[0].slice(17));
 const id='00000000-0000-4000-8000-000000000006',job={id,owner:session.owner,name:'Phone Ember',description:PRESETS[2].description,status:'complete',createdAt:Date.now()};
 await app.jobs.save(job);await mkdir(join(dir,'jobs',id));await copyFile('public/models/ember-living.glb',join(dir,'jobs',id,'living.glb'));
 // Saved design loads through the real private API using the PC's owner cookie.
 await page.evaluate(pet=>localStorage.setItem('creature-pets',JSON.stringify([pet])),{...PRESETS[2],name:job.name,source:'generated',modelUrl:'/api/generations/'+id+'/model.glb'});
 await page.reload();await page.locator('.saved-card').filter({hasText:job.name}).click();await page.waitForFunction(()=>window.creatureLab?.snapshot().pet.name==='Phone Ember'&&window.creatureLab.snapshot().asset.clips.length===13);
 await page.locator('#send-phone').click();await page.locator('#phone-qr').waitFor({state:'visible'});assert.match(await page.locator('#phone-qr').getAttribute('src'),/^data:image\/png;base64,/);
 const url=await page.locator('#phone-link').getAttribute('href');assert.ok(url.startsWith('https://phone.example/#pet='));
 await page.screenshot({path:'artifacts/mobile-qr.png'});
 const mobile=await browser.newContext({...devices['iPhone 13']}),visitor=await mobile.newPage();visitor.on('pageerror',e=>errors.push(e.message));
 await visitor.goto(phone+'/'+new URL(url).hash);await visitor.waitForFunction(()=>window.creatureLab?.snapshot().pet.name==='Phone Ember'&&window.creatureLab.snapshot().asset.clips.length===13);
 assert.equal(new URL(visitor.url()).hash,'#create');assert.equal(await visitor.locator('.creator').isVisible(),false);
 assert.equal(await visitor.locator('#send-phone').isVisible(),false);assert.equal(await visitor.locator('#room-button').isEnabled(),true);
 assert.equal(await visitor.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
 await visitor.locator('#greet-button').click();await visitor.screenshot({path:'artifacts/mobile-pet.png'});
 await visitor.reload();await visitor.waitForFunction(()=>window.creatureLab?.snapshot().pet.name==='Phone Ember'&&window.creatureLab.snapshot().asset.clips.length===13);
 const forbidden=await mobile.request.post(phone+'/api/generations',{data:PRESETS[0]});assert.equal(forbidden.status(),403);
 await page.locator('#revoke-phone').click();assert.equal((await mobile.request.get(phone+'/api/mobile/pet')).status(),410);
 await visitor.reload();await visitor.locator('#room-note').filter({hasText:'Send this pet again'}).waitFor();
 assert.deepEqual(errors,[]);console.log('PASS: PC private generated pet → QR → independent iPhone session → 13 animations → refresh → revoke. No paid requests. Physical floor tracking requires phone testing.');
}finally{await browser.close();await app.close();await rm(dir,{recursive:true,force:true});}
