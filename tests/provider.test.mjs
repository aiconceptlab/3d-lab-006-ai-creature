import test from 'node:test';import assert from 'node:assert/strict';
import {Jev} from '../server/jev.mjs';import {choices,PRESETS,validateBrief,validateDesign,includedModel} from '../shared/design.mjs';
import {createCreature} from '../src/creature.js';import {Box3} from 'three';
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
test('Jev sends the documented typed choice contract and validates the full design',async()=>{
  let request;const jev=new Jev({key:'test-placeholder',fetchFn:async(url,options)=>{assert.equal(url,'https://api.typesafe.ai/v1/systemone');request=JSON.parse(options.body);return reply({model:'contract-fixture',answers:Object.fromEntries(Object.entries(choices).map(([key,items])=>[key,{type:'choice',choice:PRESETS[1].design[key],confidence:1,probabilities:Object.fromEntries(items.map(v=>[v,v===PRESETS[1].design[key]?1:0]))}]))});}});
  const result=await jev.design(validateBrief(PRESETS[1]));assert.deepEqual(result.design,PRESETS[1].design);assert.equal(result.source,'jev');assert.equal(request.model,'jev-latest');assert.equal(Object.keys(request.questions).length,8);
});
test('provider rejects unknown geometry and malformed probabilities instead of rendering them',async()=>{
  const jev=new Jev({key:'placeholder',fetchFn:async()=>reply({answers:{family:{type:'choice',choice:'dragon',confidence:1,probabilities:{dragon:1}}}})});
  await assert.rejects(jev.design(PRESETS[0]),/invalid decision/);
  assert.throws(()=>jev.validateAnswer({type:'choice',choice:'fox',confidence:.8,probabilities:{fox:.9,cat:.9,bunny:0}},choices.family),/probabilities/);
  assert.throws(()=>validateDesign({...PRESETS[0].design,ears:'executeCode'}));
});
test('auth and timeout errors are sanitised, not replaced with fabricated AI output',async()=>{
  const invalid=new Jev({key:'DO-NOT-LEAK',fetchFn:async()=>reply({secret:'DO-NOT-LEAK'},401)});
  await assert.rejects(invalid.design(PRESETS[0]),e=>e.status===502&&!e.message.includes('DO-NOT-LEAK'));
  const timeout=new Jev({key:'placeholder',fetchFn:async()=>{throw new Error('network');}});await assert.rejects(timeout.design(PRESETS[0]),e=>e.status===504);
});
test('missing key explicitly uses demo rules; required Jev refuses the same request',async()=>{
  assert.equal((await new Jev().design(PRESETS[1])).source,'local');await assert.rejects(new Jev({require:true}).design(PRESETS[0]),e=>e.status===503);
});
test('an invalid key stops subsequent network calls until the server is restarted',async()=>{
  let requests=0;const jev=new Jev({key:'placeholder',fetchFn:async()=>{requests++;return reply({},401);}});
  await assert.rejects(jev.design(PRESETS[0]));await assert.rejects(jev.design(PRESETS[0]));assert.equal(requests,1);
});
test('independent Jev AI keys reach their own endpoint and never follow redirects',async()=>{
  let destination,headers,redirect;
  const jev=new Jev({key:'hosted-placeholder',provider:'jev-ai',fetchFn:async(url,options)=>{destination=url;headers=options.headers;redirect=options.redirect;return reply({model:'fixture',answers:{}});}});
  await jev.evaluate('fixture',{});
  assert.equal(destination,'https://jev-ai.pro/api/v1/systemone');assert.equal(headers.Authorization,'Bearer hosted-placeholder');assert.equal(redirect,'error');assert.equal(jev.authenticated,true);
  assert.throws(()=>new Jev({provider:'unrecognised'}),/JEV_PROVIDER/);
  const empty=new Jev({key:'placeholder',provider:'jev-ai',fetchFn:async()=>reply({},402)});
  await assert.rejects(empty.evaluate('fixture',{}),e=>e.status===402&&e.message.includes('credits'));
});
test('reinterpreting an included sample preserves its detailed asset while custom briefs stay separate',()=>{
  const sample=PRESETS[1];
  assert.equal(includedModel({...sample.design,ears:'large'},sample.description),'/models/mochi-living.glb?v=expressions-1');
  assert.equal(includedModel(PRESETS[2].design),'/models/ember-living.glb?v=expressions-1');
  assert.equal(includedModel({...sample.design,coat:'moss'},'A moss bunny with short ears.'),undefined);
});
test('design changes affect geometry and every preset has animated limbs',()=>{
  const a=createCreature(PRESETS[0].design),b=createCreature(PRESETS[1].design);
  assert.notEqual(new Box3().setFromObject(a.group).max.y,new Box3().setFromObject(b.group).max.y);
  assert.ok(b.group.getObjectByName('PuffTail'));assert.ok(a.group.getObjectByName('TailLight'));
  a.animate(.1,.4,'chase');assert.notEqual(a.group.getObjectByName('FrontLeft').rotation.x,0);assert.equal(a.clips()[0].tracks.length,4);
  a.dispose();b.dispose();
});
