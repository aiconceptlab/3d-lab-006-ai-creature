import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {RoomSession} from '../src/ar.js';import {NOVA} from '../shared/design.mjs';import {PetMotion} from '../shared/motion.mjs';
test('room adapter uses floor placement, freezes on tracking loss, resets and stops stream',async()=>{
  const oldNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator');
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{userAgent:'Android',mediaDevices:{getUserMedia(){}}}});globalThis.isSecureContext=true;
  let modules,stopped=0,trackStopped=0,recentered=0,frames=0;const listeners=new Map();
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(50,.5,.1,20);camera.position.set(0,1,1);camera.lookAt(0,0,0);camera.updateMatrixWorld();
  const XR8={GlTextureRenderer:{pipelineModule:()=>({})},Threejs:{pipelineModule:()=>({}),xrScene:()=>({scene,camera,renderer:{shadowMap:{}}})},XrController:{pipelineModule:()=>({}),recenter:()=>recentered++},XrConfig:{device:()=>({ANY:'any'})},addCameraPipelineModules:value=>modules=value,clearCameraPipelineModules:()=>{},stop:()=>stopped++,run:async()=>{modules.at(-1).onAttach({stream:{getTracks:()=>[{stop:()=>trackStopped++}]},video:{}});modules.at(-1).onStart();}};
  globalThis.window={XR8,WebAssembly};const motion=new PetMotion();
  const canvas={addEventListener:(name,callback)=>listeners.set(name,callback),removeEventListener:name=>listeners.delete(name),getBoundingClientRect:()=>({left:0,top:0,width:400,height:800})};
  const room=new RoomSession({canvas,design:NOVA,motion,onStatus:()=>{},onTap:p=>motion.setBall(p),onFrame:dt=>{frames++;motion.update(dt);}});
  try{
    await room.start();const module=modules.at(-1);module.onUpdate({processCpuResult:{reality:{trackingStatus:'NORMAL'}}});listeners.get('pointerup')({clientX:200,clientY:530});assert.equal(room.placed,true);assert.equal(room.pet.group.visible,true);
    motion.setBall({x:.8,z:0});module.onUpdate({processCpuResult:{reality:{trackingStatus:'NORMAL'}}});assert.ok(frames>0);
    const before={...motion.position},epoch=motion.requestEpoch;module.onUpdate({processCpuResult:{reality:{trackingStatus:'LIMITED'}}});assert.deepEqual(motion.position,before);assert.equal(motion.tracking,'lost');assert.ok(motion.requestEpoch>epoch);
    room.recenter();assert.equal(room.placed,false);assert.equal(motion.ball,null);assert.equal(recentered,1);
    await room.stop();assert.equal(stopped,1);assert.equal(trackStopped,1);assert.equal(listeners.size,0);
  }finally{delete globalThis.window;delete globalThis.isSecureContext;if(oldNavigator)Object.defineProperty(globalThis,'navigator',oldNavigator);else delete globalThis.navigator;}
});
