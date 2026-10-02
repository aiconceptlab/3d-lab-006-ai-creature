import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../server.mjs';
await mkdir('artifacts',{recursive:true});
const dir=await mkdtemp(join(tmpdir(),'pets-generated-')),app=await createApp({env:{DATA_DIR:dir}});
await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[],results=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{let seed=17;Math.random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};});
  await page.goto('http://127.0.0.1:'+app.server.address().port);
  for(const name of ['Nova','Mochi','Ember']){
    await page.locator('[data-preset="'+name+'"]').click();
    await page.waitForFunction(n=>{const s=window.creatureLab?.snapshot();return s?.external&&s.pet.name===n;},name,{timeout:30000});
    const reactions=[['[data-mood="curious"]','Curious'],['[data-mood="playful"]','Playful'],['[data-mood="shy"]','Shy'],['[data-mood="sleepy"]','Sleepy'],['#greet-button','Greet'],['#stretch-button','Stretch'],['#pet-button','Curious']];
    for(const [selector,clip]of reactions){
      await page.locator(selector).click();await page.waitForFunction(c=>window.creatureLab.snapshot().asset.animation.clip===c,clip);
      const before=await page.evaluate(()=>window.creatureLab.pose().find(b=>b.name.endsWith('Head_2')).q);
      await page.waitForFunction(before=>window.creatureLab.pose().find(b=>b.name.endsWith('Head_2')).q.some((q,i)=>Math.abs(q-before[i])>.025),before,{timeout:3000});
      assert.equal((await page.evaluate(()=>window.creatureLab.snapshot())).expression,clip);
      assert.ok((await page.evaluate(()=>window.creatureLab.snapshot())).expressionRemaining>0,clip+' must survive the next AI decision');
      if(clip==='Greet')await page.locator('#viewport').screenshot({path:'artifacts/'+name.toLowerCase()+'-greeting-ui.png'});
    }
    await page.locator('#rest-button').click();
    const asset=await page.evaluate(()=>window.creatureLab.snapshot().asset),idle=await page.evaluate(()=>window.creatureLab.pose());
    assert.equal(asset.generated,true);assert.ok(asset.triangles>20000&&asset.triangles<=100000);
    assert.deepEqual([...asset.clips].sort(),['Curious','Greet','Idle','Look','Playful','Rest','Shy','Sleepy','Stretch','Trot','Walk']);assert.ok(idle.length>=20);
    await page.locator('#viewport').screenshot({path:'artifacts/'+name.toLowerCase()+'-generated-preview.png'});
    // A known far target makes movement/framing checks independent of idle randomness.
    await page.evaluate(()=>{const original=Math.random;let calls=0;Math.random=()=>{if(++calls<=2)return .9;Math.random=original;return original();};});
    await page.locator('#ball-button').click();
    await page.waitForFunction(before=>window.creatureLab.snapshot().asset.animation.clip==='Trot'&&['0_Left','0_Right','1_Left','1_Right'].every(leg=>window.creatureLab.pose().some((bone,i)=>bone.name.includes(leg+'_Limb_')&&bone.q.some((q,k)=>Math.abs(q-before[i].q[k])>.02))),idle,{timeout:10000});
    await page.locator('#viewport').screenshot({path:'artifacts/'+name.toLowerCase()+'-generated-walk.png'});
    await page.waitForFunction(()=>{const p=window.creatureLab.snapshot().position;return Math.hypot(p.x,p.z)>.35;});
    const framing=await page.evaluate(()=>window.creatureLab.framing());
    assert.ok(framing.every(([x,y,z])=>Math.abs(x)<.98&&Math.abs(y)<.98&&z>-1&&z<1),name+' stays in the preview while moving: '+JSON.stringify(framing));

    const pending=page.waitForEvent('download');await page.locator('#download-pet').click();const download=await pending;
    const dest='artifacts/'+name.toLowerCase()+'-generated-download.glb';await download.saveAs(dest);
    assert.deepEqual(await readFile(dest),await readFile('public/models/'+name.toLowerCase()+'-living.glb'));
    results.push({name,...asset,bones:idle.length,expressiveControls:true,headReactionsVisible:true,allFourLegsAnimated:true,trotSelectedForChase:true,originalGlbDownload:true,movingPetFramed:true});
  }
  await page.locator('#pet-name').fill('Fern');await page.locator('#pet-description').fill('A moss cat with green eyes, small ears and a fluffy tail. Shy and slender.');
  await page.locator('#demo-button').click();await page.waitForFunction(()=>window.creatureLab.snapshot().pet.name==='Fern');
  assert.equal((await page.evaluate(()=>window.creatureLab.snapshot())).external,false);
  await page.locator('[data-preset="Mochi"]').click();await page.waitForFunction(()=>window.creatureLab.snapshot().external);
  await page.locator('#demo-button').click();await page.waitForFunction(()=>window.creatureLab.snapshot().pet.source==='local'&&window.creatureLab.snapshot().external);
  await page.evaluate(()=>{const pets=JSON.parse(localStorage.getItem('creature-pets'));for(const p of pets)if(p.name==='Mochi')p.modelUrl='/models/mochi.glb';localStorage.setItem('creature-pets',JSON.stringify(pets));});
  await page.reload();await page.locator('.saved-card').filter({hasText:'Mochi'}).click();await page.waitForFunction(()=>window.creatureLab.snapshot().external);
  assert.equal((await page.evaluate(()=>window.creatureLab.snapshot())).pet.modelUrl,'/models/mochi-living.glb?v=expressions-1');
  await page.route('**/api/design',async route=>{const request=route.request().postDataJSON();await route.fulfill({json:{...request,design:{...((await import('../shared/design.mjs')).PRESETS[1].design),ears:'large'},source:'jev',note:'Fixture Jev interpretation'}});});
  await page.locator('[data-preset="Mochi"]').click();await page.locator('#create-button').click();await page.waitForFunction(()=>window.creatureLab.snapshot().pet.source==='jev'&&window.creatureLab.snapshot().external);
  assert.equal((await page.evaluate(()=>window.creatureLab.snapshot())).pet.modelUrl,'/models/mochi-living.glb?v=expressions-1');
  assert.deepEqual(errors,[]);
  const result={pets:results,proceduralCustomDesign:true,savedMochiUsesGeneratedModel:true,jevReinterpretationPreservesModel:true,reload:true,errors,physicalAR:false};
  await writeFile('artifacts/generated-check.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();await app.close();await rm(dir,{recursive:true,force:true});}
