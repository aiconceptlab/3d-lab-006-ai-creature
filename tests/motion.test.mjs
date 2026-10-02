import test from 'node:test';
import assert from 'node:assert/strict';
import {PetMotion,findPath,segmentSafe,DEFAULT_AREA,distance,allowedActions,fallbackDecision} from '../shared/motion.mjs';

test('a requested mood holds a stationary pose, cancels travel and invalidates stale decisions',()=>{
  const pet=new PetMotion();pet.setBall({x:1,z:0});pet.update(.05);const before={...pet.position},epoch=pet.requestEpoch;
  assert.equal(pet.setMood('shy'),true);assert.equal(pet.expression,'Shy');assert.equal(pet.ball,null);assert.equal(pet.follow,false);assert.ok(pet.requestEpoch>epoch);
  for(let i=0;i<80;i++)pet.update(.05);
  assert.deepEqual(pet.position,before);assert.equal(pet.speed,0);assert.equal(pet.expression,'Shy');assert.ok(pet.expressionRemaining>.9);
  assert.equal(pet.react('unknown'),false);assert.equal(pet.setMood('unknown'),false);
  pet.setBall({x:-1,z:0});assert.equal(pet.expression,null);assert.equal(pet.expressionRemaining,0);
});

test('idle companions vary their poses, and tracking loss freezes a held reaction',()=>{
  const pet=new PetMotion();for(let i=0;i<50;i++)pet.update(.05);assert.equal(pet.expression,'Curious');
  const held=pet.expressionRemaining;pet.tracking='lost';for(let i=0;i<60;i++)pet.update(.05);assert.equal(pet.expressionRemaining,held);assert.equal(pet.react('Greet'),false);
  pet.tracking='normal';for(let i=0;i<160;i++)pet.update(.05);assert.equal(pet.expression,'Greet');
});

test('long exploration pauses to emote; a user ball command still takes priority',()=>{
  const pet=new PetMotion({random:()=>.95});pet.lifeTime=12;pet.setAction('explore');for(let i=0;i<20&&!pet.expression;i++)pet.update(.05);
  assert.equal(pet.expression,'Curious');assert.equal(pet.speed,0);assert.equal(pet.action,'look');
  pet.setBall({x:-1,z:0});for(let i=0;i<20;i++)pet.update(.05);assert.equal(pet.action,'chase');assert.equal(pet.expression,null);assert.ok(pet.speed>0);
});

test('route skirts a blocking zone; every segment and arrival stay safe',()=>{
  const start={x:-.8,z:0},goal={x:.8,z:0},obstacles=[{x:0,z:0,w:.5,d:.8}];
  const route=findPath(start,goal,DEFAULT_AREA,obstacles);assert.ok(route.length>2);
  let previous=start;for(const p of route){assert.ok(segmentSafe(previous,p,DEFAULT_AREA,obstacles));previous=p;}
  assert.deepEqual(route.at(-1),goal);
});
test('blocked, out-of-area and unreachable targets do not produce a path',()=>{
  assert.equal(findPath({x:0,z:0},{x:2,z:0}).length,0);
  assert.equal(findPath({x:-.8,z:0},{x:.8,z:0},DEFAULT_AREA,[{x:0,z:0,w:.4,d:4}]).length,0);
});
test('virtual fetch reaches the ball, clears it and finishes looking',()=>{
  const pet=new PetMotion();assert.ok(pet.setBall({x:.6,z:.4}));
  for(let i=0;i<100;i++)pet.update(.05);
  assert.equal(pet.ball,null);assert.equal(pet.action,'look');assert.ok(distance(pet.position,{x:.6,z:.4})<.1);
});
test('tracking loss freezes travel and invalidates movement permission',()=>{
  const pet=new PetMotion();pet.setBall({x:1,z:0});pet.update(.05);pet.tracking='lost';const before={...pet.position};
  for(let i=0;i<30;i++)pet.update(.05);
  assert.deepEqual(pet.position,before);assert.deepEqual(allowedActions(pet.snapshot()),['idle']);assert.equal(pet.speed,0);
});
test('follow approaches the moving phone with stand-off distance',()=>{
  const pet=new PetMotion();pet.follow=true;pet.viewer={x:1,z:0};pet.setAction('follow');
  for(let i=0;i<150;i++)pet.update(.05);
  assert.ok(distance(pet.position,pet.viewer)>=.48&&distance(pet.position,pet.viewer)<.58);
  pet.viewer={x:-1,z:0};for(let i=0;i<200;i++)pet.update(.05);
  assert.ok(pet.position.x<0);
});
test('low energy stops movement even while a provider is unavailable',()=>{
  const pet=new PetMotion();pet.setBall({x:1,z:0});pet.energy=7;pet.update(.05);
  assert.equal(pet.action,'rest');assert.ok(pet.energy>7);assert.equal(pet.speed,0);
  assert.equal(fallbackDecision(pet.snapshot()).action,'rest');
});
test('manual actions advance the epoch; exclusions cannot cover the pet',()=>{
  const pet=new PetMotion(),epoch=pet.requestEpoch;assert.equal(pet.addObstacle({x:0,z:0,w:.4,d:.4}),false);
  pet.setBall({x:.8,z:.6});assert.ok(pet.requestEpoch>epoch);
  assert.ok(pet.addObstacle({x:.8,z:.6,w:.4,d:.4}));assert.equal(pet.ball,null);
});

test('sharp direction changes turn before travelling and never strafe',()=>{
 const pet=new PetMotion();pet.setBall({x:0,z:-1});const start={...pet.position};pet.update(.05);assert.deepEqual(pet.position,start);
 let travelled=0;for(let i=0;i<160;i++){const before={...pet.position};pet.update(.05);const dx=pet.position.x-before.x,dz=pet.position.z-before.z;if(Math.hypot(dx,dz)>.00001){const heading=Math.atan2(dx,dz),error=Math.atan2(Math.sin(heading-pet.yaw),Math.cos(heading-pet.yaw));assert.ok(Math.abs(error)<.35);travelled+=Math.hypot(dx,dz);}}assert.ok(travelled>.8);
});
