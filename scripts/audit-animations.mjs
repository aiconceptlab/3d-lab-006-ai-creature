// CPU checks inspect the deformed mesh, not just animation track presence.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createImportedCreature} from '../src/imported-creature.js';
globalThis.ProgressEvent ??= class {constructor(type,values){Object.assign(this,{type},values);}};
async function geometryAsset(path){
  const glb=await readFile(path),length=glb.readUInt32LE(12),json=JSON.parse(glb.subarray(20,20+length).toString());
  const bin=glb.subarray(28+length);json.buffers[0].uri='data:application/octet-stream;base64,'+bin.toString('base64');
  delete json.images;delete json.textures;delete json.materials;
  for(const mesh of json.meshes)for(const primitive of mesh.primitives)delete primitive.material;
  return new Promise((resolve,reject)=>new GLTFLoader().parse(JSON.stringify(json),'',resolve,reject));
}
const results=[];
for(const name of ['nova','mochi','ember']){
  const asset=await geometryAsset('public/models/'+name+'-living.glb'),pet=createImportedCreature(asset);
  const mesh=[];pet.character.traverse(o=>{if(o.isSkinnedMesh)mesh.push(o);});
  const legs=['0_Left','0_Right','1_Left','1_Right'],report={name,clips:[],transitions:[]};
  for(const leg of legs)for(let i=0;i<3;i++)assert.ok(pet.character.getObjectByName('tripo'+leg+'_Limb_'+i)||[...mesh[0].skeleton.bones].some(b=>b.name.endsWith(leg+'_Limb_'+i)),name+' missing '+leg+' joint '+i);
  const samples={};
  for(const leg of legs){
    samples[leg]=[];
    for(const m of mesh){const index=m.geometry.attributes.skinIndex,weight=m.geometry.attributes.skinWeight;
      for(let v=0;v<index.count;v++){
        let influence=0;for(let j=0;j<4;j++)if(m.skeleton.bones[index.getComponent(v,j)]?.name.endsWith(leg+'_Limb_2')||m.skeleton.bones[index.getComponent(v,j)]?.name.endsWith(leg+'_Limb_3'))influence+=weight.getComponent(v,j);
        if(influence>.65)samples[leg].push({m,v});
      }
    }
    assert.ok(samples[leg].length>15,name+' '+leg+' must deform actual paw vertices');
  }
  const centroid=leg=>{const out=new THREE.Vector3();for(const {m,v} of samples[leg])out.add(m.getVertexPosition(v,new THREE.Vector3()).applyMatrix4(m.matrixWorld));return out.multiplyScalar(1/samples[leg].length);};
  for(const clip of asset.animations){
    pet.mixer.stopAllAction();const action=pet.mixer.clipAction(clip);action.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).play();
    const paths=Object.fromEntries(legs.map(leg=>[leg,[]])),heads=[];
    for(let i=0;i<=64;i++){
      action.time=clip.duration*i/64;pet.mixer.update(0);pet.group.updateMatrixWorld(true);for(const m of mesh)m.skeleton.update();
      for(const leg of legs)paths[leg].push(centroid(leg));
      const h=mesh[0].skeleton.bones.find(b=>/Head_0$/.test(b.name));heads.push(h.getWorldQuaternion(new THREE.Quaternion()));
    }
    const paws={};for(const leg of legs){const points=paths[leg],excursion=Math.max(...points.map(p=>p.distanceTo(points[0]))),loopError=points[0].distanceTo(points.at(-1));
      assert.ok(loopError<.001,name+' '+clip.name+' '+leg+' loop seam '+loopError);
      if(['Walk','Trot'].includes(clip.name))assert.ok(excursion>.012,name+' '+clip.name+' '+leg+' is frozen '+excursion);
      else assert.ok(excursion<.001,name+' '+clip.name+' '+leg+' floats at rest '+excursion);
      paws[leg]={weightedVertices:samples[leg].length,excursion,loopError};
    }
    const headTurn=Math.max(...heads.map(q=>q.angleTo(heads[0])));if(clip.name==='Look')assert.ok(headTurn>.09,name+' needs a visible look animation');
    report.clips.push({name:clip.name,duration:clip.duration,paws,headTurn});
  }
  pet.dispose();
  const runtime=createImportedCreature(asset);
  const runtimeBones=[];runtime.character.traverse(o=>{if(o.isBone)runtimeBones.push(o);});
  for(const [behaviour,speed,expected] of [['idle',0,'Idle'],['follow',.1,'Walk'],['chase',.20,'Trot'],['look',0,'Look'],['rest',0,'Rest']]){
    let maximumFrameTurn=0,maximumBone=null;
    for(let i=0;i<120;i++){
      const before=runtimeBones.map(b=>b.quaternion.clone());runtime.animate(1/60,speed,behaviour);
      for(const [j,b] of runtimeBones.entries()){const angle=b.quaternion.angleTo(before[j]);if(angle>maximumFrameTurn){maximumFrameTurn=angle;maximumBone=b.name;}}
    }
    const state=runtime.animationState();assert.equal(state.clip,expected);assert.ok(state.cadence>0&&state.cadence<4);
    assert.ok(maximumFrameTurn<.35,name+' transition to '+expected+' snaps at '+maximumBone+': '+maximumFrameTurn);
    report.transitions.push({...state,maximumFrameTurn});
  }
  runtime.dispose();results.push(report);
}
await mkdir('artifacts',{recursive:true});await writeFile('artifacts/animation-audit.json',JSON.stringify(results,null,2));
console.log(JSON.stringify(results.map(p=>({name:p.name,clips:p.clips.map(c=>c.name),allFourPawsDeform:true,loopSeamsChecked:true,transitions:p.transitions}))));
