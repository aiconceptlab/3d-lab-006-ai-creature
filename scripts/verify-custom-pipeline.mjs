// Real local Blender + production UI; provider replies reuse an existing GLB.
// No credentials are loaded and no vendor requests/credits are used.
import {chromium} from 'playwright';import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm,writeFile} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {createApp} from '../server.mjs';
const dir=await mkdtemp(join(tmpdir(),'pet-custom-')),posts=[],tasks=new Map();
const raw=await readFile(process.env.CUSTOM_TEST_SOURCE||'.data/nova/walk.glb'),length=raw.readUInt32LE(12),doc=JSON.parse(raw.subarray(20,20+length).toString());
for(const mesh of doc.meshes)mesh.name='unreviewed-custom-mesh';for(const node of doc.nodes)if(node.mesh!==undefined)node.name='unreviewed-custom-mesh';
const text=Buffer.from(JSON.stringify(doc)),padding=Buffer.alloc((4-text.length%4)%4,32),json=Buffer.concat([text,padding]),header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(20+json.length+raw.length-(20+length),8);header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16);const fixture=Buffer.concat([header,json,raw.subarray(20+length)]);
const fetchFn=async(url,options={})=>{
 if(url==='https://cdn.tripo3d.ai/fixture.glb')return new Response(fixture);
 if(url.endsWith('/account/balance'))return Response.json({code:0,data:{balance:100}});
 if(options.method==='POST'){const stage=url.split('/').at(-1),id='fixture-'+posts.length;posts.push({stage,body:JSON.parse(options.body)});tasks.set(id,stage);return Response.json({code:0,data:{task_id:id}});}
 const stage=tasks.get(url.split('/').at(-1));if(!stage)throw new Error('Unexpected network call');
 const output=stage==='text-to-image'?{generated_image_url:'https://cdn.tripo3d.ai/reference.png'}:stage==='rig-check'?{riggable:true,rig_type:'quadruped'}:stage==='retarget'?{model_url:'https://cdn.tripo3d.ai/fixture.glb'}:{};
 return Response.json({code:0,data:{status:'success',progress:100,output}});
};
const app=await createApp({env:{DATA_DIR:dir,ENABLE_TRIPO:'1',TRIPO_API_KEY:'fixture-not-a-real-key',BLENDER_PATH:process.env.BLENDER_PATH||'../../work/tools/blender-4.5.9-windows-x64/blender.exe'},fetchFn});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://cdn.tripo3d.ai/reference.png',route=>route.fulfill({contentType:'image/png',path:'public/nova-reference.png'}));
 await page.goto('http://127.0.0.1:'+app.server.address().port+'/#create');await page.waitForFunction(()=>window.creatureLab?.snapshot().external);
 await page.locator('#pet-name').fill('Luma');await page.locator('#pet-description').fill('A small cream kitten with teal eyes and teal paws, a fluffy tail and a curious personality.');await page.locator('#create-button').click();
 await page.locator('#approve-reference').waitFor({state:'visible'});assert.equal(posts.length,1);assert.match(posts[0].body.prompt,/animated-film/);assert.equal((await page.evaluate(()=>window.creatureLab.snapshot())).pet.name,'Nova');
 await page.locator('#approve-reference').click();await page.locator('#use-model').waitFor({state:'visible',timeout:180000});assert.equal(posts.length,5);
 await page.locator('#use-model').click();await page.waitForFunction(()=>{const s=window.creatureLab.snapshot();return s.external&&s.pet.name==='Luma'&&s.pet.modelUrl?.startsWith('/api/');});
 let state=await page.evaluate(()=>window.creatureLab.snapshot());assert.equal(state.asset.clips.length,13);assert.match(await page.locator('#generation-status').textContent(),/estimated/);
 await page.locator('[data-mood="sleepy"]').click();await page.waitForFunction(()=>window.creatureLab.snapshot().asset.animation.mouth.jaw>.55,null,{timeout:6000});await page.locator('#viewport').screenshot({path:'artifacts/custom-pipeline-yawn.png'});
 await page.locator('#rest-button').click();const before=await page.evaluate(()=>window.creatureLab.snapshot().yaw);const bounds=await page.locator('#studio').boundingBox();await page.mouse.move(bounds.x+bounds.width*.6,bounds.y+bounds.height*.35);await page.mouse.down();await page.mouse.move(bounds.x+bounds.width*.2,bounds.y+bounds.height*.35,{steps:12});await page.mouse.up();assert.equal((await page.evaluate(()=>window.creatureLab.snapshot())).yaw,before);
 await page.evaluate(()=>{const original=Math.random;let calls=0;Math.random=()=>{if(++calls<=2)return .9;Math.random=original;return original();};});await page.locator('#ball-button').click();await page.waitForFunction(()=>window.creatureLab.snapshot().asset.animation.clip==='TurnLeft');const paws=await page.evaluate(()=>window.creatureLab.pose().filter(b=>b.name.endsWith('Limb_2')).map(b=>b.world));await page.waitForTimeout(250);const after=await page.evaluate(()=>window.creatureLab.pose().filter(b=>b.name.endsWith('Limb_2')).map(b=>b.world));assert.ok(after.some((p,i)=>Math.hypot(...p.map((n,j)=>n-paws[i][j]))>.005));
 await page.locator('#viewport').screenshot({path:'artifacts/custom-pipeline-turn.png'});await page.waitForFunction(()=>window.creatureLab.snapshot().asset.animation.clip==='Trot');
 await page.locator('#rest-button').click();const downloadPromise=page.waitForEvent('download');await page.locator('#download-pet').click();const download=await downloadPromise;await download.saveAs('artifacts/custom-pipeline-download.glb');
 assert.deepEqual(errors,[]);assert.equal(posts.length,5);await page.reload();await page.locator('.saved-card').filter({hasText:'Luma'}).click();await page.waitForFunction(()=>window.creatureLab.snapshot().external&&window.creatureLab.snapshot().pet.name==='Luma');
 await page.screenshot({path:'artifacts/custom-pipeline-app.png',fullPage:true});await writeFile('artifacts/custom-pipeline-checks.json',JSON.stringify({realBlender:true,unknownFaceCalibration:true,completeClips:13,referenceApproval:true,privateAssetDownload:true,saveReload:true,orbitDoesNotRotateBody:true,turnPawsMove:true,vendorSubmissionsMocked:5,paidCalls:0,errors},null,2));console.log('Custom pipeline passed: real Blender, unknown face, 13 clips, approval, turns, camera independence, download and persistence; 0 paid calls.');
}finally{await browser.close();await app.close();await rm(dir,{recursive:true,force:true});}
