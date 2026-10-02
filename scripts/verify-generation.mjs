// Exercise the production UI and actual job API; all provider replies are fixtures.
import {chromium} from 'playwright';import assert from 'node:assert/strict';import {mkdtemp,rm,mkdir} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {createApp} from '../server.mjs';import {localDesign} from '../shared/design.mjs';
const dir=await mkdtemp(join(tmpdir(),'pet-progress-')),posts=[],tasks=new Map();let ready=false,designs=0;
const fetchFn=async(url,options={})=>{
 if(url.endsWith('/account/balance'))return Response.json({code:0,data:{balance:100}});
 if(options.method==='POST'){const stage=url.split('/').at(-1),id='fixture-'+posts.length;posts.push(stage);tasks.set(id,stage);return Response.json({code:0,data:{task_id:id}});}
 const stage=tasks.get(url.split('/').at(-1));assert.equal(stage,'text-to-image');return Response.json({code:0,data:ready?{status:'success',progress:100,output:{generated_image_url:'https://cdn.tripo3d.ai/reference.png'}}:{status:'running',progress:37}});
};
const jev={key:'fixture',provider:'jev-ai',design:async brief=>{designs++;return {design:localDesign(brief.description),source:'jev',note:'Fixture design'};},decide:async()=>({action:'look',source:'local',note:'Fixture behaviour',confidence:null})};
const app=await createApp({env:{DATA_DIR:dir,ENABLE_TRIPO:'1',TRIPO_API_KEY:'fixture'},jev,fetchFn,finishFn:async()=>({})});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port;
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});await mkdir('artifacts',{recursive:true});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1050}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await context.route('https://cdn.tripo3d.ai/reference.png',route=>route.fulfill({contentType:'image/png',path:'public/nova-reference.png'}));
 await page.goto(base+'/#create');await page.waitForFunction(()=>document.getElementById('creation-note').textContent.includes('credits')||!document.getElementById('tripo-start').disabled);
 await page.locator('#pet-name').fill('Luma');await page.locator('#pet-description').fill('A tiny cream kitten with mint eyes and round ears, very curious.');await page.locator('#create-button').click();
 await page.locator('#generation-title').filter({hasText:'Creating Luma'}).waitFor({state:'visible'});await page.locator('#generation-percent').filter({hasText:'37%'}).waitFor();assert.equal(posts.length,1);assert.equal(designs,1);
 const id=await page.evaluate(()=>localStorage.getItem('creature-generation'));assert.ok(id);assert.equal(await page.locator('#approve-reference').isVisible(),false);
 // Closing details must not hide the ongoing status; editing a new brief must not replace Luma.
 await page.locator('#upgrade summary').click();assert.equal(await page.locator('#generation-card').isVisible(),true);await page.locator('#pet-name').fill('Other');await page.locator('#pet-description').fill('A red dragon with little gold wings and a sleepy personality.');await page.locator('#create-button').click();assert.equal(designs,1);assert.equal(posts.length,1);assert.match(await page.locator('#generation-title').textContent(),/Luma/);assert.equal(await page.locator('#upgrade').getAttribute('open'),'');
 const brief=await page.evaluate(()=>JSON.parse(localStorage.getItem('creature-generation-brief')));assert.equal(brief.brief.name,'Luma');
 await page.reload();await page.locator('#generation-percent').filter({hasText:'37%'}).waitFor();assert.equal(await page.locator('#pet-name').inputValue(),'Luma');assert.equal(posts.length,1);
 await page.locator('#generation-card').screenshot({path:'artifacts/generation-progress-running.png'});
 // A lost GET must retry without posting; the id is already persisted.
 let failures=0;await page.route('**/api/generations/'+id,async route=>{if(!failures++){await route.abort();}else await route.continue();});await page.locator('#generation-resume').click();await page.locator('#generation-note').filter({hasText:'reconnecting'}).waitFor();assert.equal(posts.length,1);await page.locator('#generation-percent').filter({hasText:'37%'}).waitFor();await page.waitForFunction(()=>!document.getElementById('generation-note').textContent.includes('reconnecting'),null,{timeout:15000});
 ready=true;await page.locator('#approve-reference').waitFor({state:'visible',timeout:12000});assert.match(await page.locator('#generation-title').textContent(),/artwork is ready/);assert.equal(await page.locator('#generation-card').getAttribute('data-busy'),'false');assert.equal(posts.length,1);
 await page.reload();await page.locator('#approve-reference').waitFor({state:'visible'});assert.equal(await page.locator('#reference-image').isVisible(),true);assert.equal(posts.length,1);
 await page.locator('#generation-card').screenshot({path:'artifacts/generation-progress-approval.png'});
 // Recover from the owner session even when browser job storage was lost.
 await page.evaluate(()=>{for(const key of ['creature-generation','creature-generation-state','creature-generation-brief'])localStorage.removeItem(key);});await page.reload();await page.locator('#approve-reference').waitFor({state:'visible'});assert.equal(await page.evaluate(()=>localStorage.getItem('creature-generation')),id);assert.equal(posts.length,1);
 const second=await context.newPage();await second.goto(base+'/#create');await second.locator('#approve-reference').waitFor({state:'visible'});await second.locator('#create-button').click();assert.equal(posts.length,1);assert.equal(designs,1);
 const stranger=await browser.newContext(),strangerPage=await stranger.newPage();await strangerPage.goto(base);await strangerPage.waitForFunction(()=>!document.getElementById('tripo-start').disabled);assert.equal(await strangerPage.locator('#generation-card').isVisible(),false);const denied=await strangerPage.request.get(base+'/api/generations/'+id);assert.equal(denied.status(),404);await stranger.close();
 // Only explicit artwork approval is allowed to submit the model build.
 await page.locator('#approve-reference').click();await page.locator('#generation-title').filter({hasText:'Building Luma'}).waitFor();assert.equal(posts.length,2);assert.equal(designs,1);await page.locator('#create-button').click();assert.equal(posts.length,2);
 await page.setViewportSize({width:390,height:844});await page.locator('#generation-card').scrollIntoViewIfNeeded();assert.equal(await page.locator('#generation-card').isVisible(),true);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);await page.screenshot({path:'artifacts/generation-progress-mobile.png'});
 assert.deepEqual(errors,[]);console.log('Generation UI passed: visible stage progress, approval, reload, lost-storage recovery, interrupted GET retry, original brief, two tabs, owner privacy and mobile; 0 paid calls.');
}finally{await browser.close();await app.close();await rm(dir,{recursive:true,force:true});}
