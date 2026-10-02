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
  const aligned=[];pet.character.traverse(o=>{if(o.isBone&&/Spine_\d+$/.test(o.name))aligned.push(o);});
  pet.group.updateMatrixWorld(true);const facing=aligned.at(-1).getWorldPosition(new THREE.Vector3()).sub(aligned[0].getWorldPosition(new THREE.Vector3()));facing.y=0;facing.normalize();assert.ok(facing.z>.99999&&Math.abs(facing.x)<.00001,name+' body axis must face the travel direction');
  const base=mesh.find(m=>m.geometry.attributes.position.count>1000);assert.ok(base.morphTargetDictionary?.JawOpen!==undefined,name+' needs a real chin morph');
  const jawMorph=base.geometry.morphAttributes.position[base.morphTargetDictionary.JawOpen];let jawVertices=0,maxJawDisplacement=0;for(let i=0;i<jawMorph.count;i++){const d=new THREE.Vector3().fromBufferAttribute(jawMorph,i).length();if(d>.0005)jawVertices++;maxJawDisplacement=Math.max(maxJawDisplacement,d);}assert.ok(jawVertices>120&&maxJawDisplacement>.020,name+' jaw must deform the face mesh');
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
    const paths=Object.fromEntries(legs.map(leg=>[leg,[]])),heads=[],face=[],pelvis=[],jawValues=[];const facePoints=[];for(const m of mesh){const si=m.geometry.attributes.skinIndex,sw=m.geometry.attributes.skinWeight;for(let v=0;v<si.count;v++)if(Array.from({length:4},(_,j)=>m.skeleton.bones[si.getComponent(v,j)]?.name.endsWith('Head_2')?sw.getComponent(v,j):0).reduce((a,b)=>a+b,0)>.7)facePoints.push({m,v});}assert.ok(facePoints.length>50,name+' needs actual weighted face vertices');
    for(let i=0;i<=64;i++){
      action.time=clip.duration*i/64;pet.mixer.update(0);pet.group.updateMatrixWorld(true);for(const m of mesh)m.skeleton.update();
      for(const leg of legs)paths[leg].push(centroid(leg));
      const root=mesh[0].skeleton.bones.find(b=>/Root$/.test(b.name));pelvis.push(root.getWorldQuaternion(new THREE.Quaternion()));jawValues.push(base.morphTargetInfluences[base.morphTargetDictionary.JawOpen]);
      const h=mesh[0].skeleton.bones.find(b=>/Head_2$/.test(b.name));heads.push(h.getWorldQuaternion(new THREE.Quaternion()));const c=new THREE.Vector3();for(const {m,v}of facePoints)c.add(m.getVertexPosition(v,new THREE.Vector3()).applyMatrix4(m.matrixWorld));face.push(c.multiplyScalar(1/facePoints.length));
    }
    const pelvisTurn=Math.max(...pelvis.map(q=>q.angleTo(pelvis[0]))),jawRange=Math.max(...jawValues)-Math.min(...jawValues);
    if(['Walk','Trot'].includes(clip.name)){assert.ok(pelvisTurn>.065,name+' '+clip.name+' pelvis is static');const a=pet.mixer.clipAction(clip),paw=mesh[0].skeleton.bones.find(b=>b.name.endsWith('0_Left_Limb_2'));a.time=clip.duration*.07;pet.mixer.update(0);pet.group.updateMatrixWorld(true);const p=paw.getWorldPosition(new THREE.Vector3());a.time=clip.duration*.12;pet.mixer.update(0);pet.group.updateMatrixWorld(true);const displacement=paw.getWorldPosition(new THREE.Vector3()).sub(p);assert.ok(displacement.z<-.001&&Math.abs(displacement.x)<.0005,name+' '+clip.name+' stance slides sideways');const seconds=clip.duration*.05;assert.ok(Math.abs(displacement.z+pet.animationState().nominalSpeeds[clip.name]*seconds)<.0005,name+' cadence must cancel stance-paw travel');}
    assert.ok(Math.abs(jawValues[0]-jawValues.at(-1))<.00001,name+' '+clip.name+' mouth loop must close seamlessly');
    if(['Sleepy','Playful','Greet'].includes(clip.name))assert.ok(jawRange>.3,name+' '+clip.name+' mouth is frozen');
    const paws={};for(const leg of legs){const points=paths[leg],excursion=Math.max(...points.map(p=>p.distanceTo(points[0]))),loopError=points[0].distanceTo(points.at(-1));
      assert.ok(loopError<.001,name+' '+clip.name+' '+leg+' loop seam '+loopError);
      if(['Walk','Trot'].includes(clip.name))assert.ok(excursion>.012,name+' '+clip.name+' '+leg+' is frozen '+excursion);
      else if(!(['Greet'].includes(clip.name)&&leg==='0_Left')&&!(clip.name==='Stretch'&&leg.startsWith('0_')))assert.ok(excursion<.002,name+' '+clip.name+' '+leg+' floats at rest '+excursion);
      paws[leg]={weightedVertices:samples[leg].length,excursion,loopError};
    }
    const headTurn=Math.max(...heads.map(q=>q.angleTo(heads[0])));if(clip.name==='Look')assert.ok(headTurn>.09,name+' needs a visible look animation');
    const faceExcursion=Math.max(...face.map(p=>p.distanceTo(face[0])));if(['Look','Curious','Playful','Shy','Sleepy','Greet','Stretch'].includes(clip.name)){assert.ok(headTurn>.15,name+' '+clip.name+' lacks an obvious head pose');assert.ok(faceExcursion>.008,name+' '+clip.name+' does not move the visible face');}if(clip.name==='Greet')assert.ok(paws['0_Left'].excursion>.025,name+' greeting paw is not lifted');if(clip.name==='Stretch')for(const leg of ['0_Left','0_Right'])assert.ok(paws[leg].excursion>.015,name+' stretch does not extend paws');report.clips.push({name:clip.name,duration:clip.duration,paws,headTurn,faceExcursion,pelvisTurn,jawRange,jawVertices,maxJawDisplacement});
  }
  pet.dispose();
  const runtime=createImportedCreature(asset);
  const runtimeBones=[];runtime.character.traverse(o=>{if(o.isBone)runtimeBones.push(o);});
  for(const [behaviour,speed,expected,expression] of [['idle',0,'Idle'],['follow',.1,'Walk'],['chase',.20,'Trot'],['look',0,'Look'],['rest',0,'Rest'],...['Curious','Playful','Shy','Sleepy','Greet','Stretch'].map(clip=>['look',0,clip,clip])]){
    let maximumFrameTurn=0,maximumBone=null;
    for(let i=0;i<120;i++){
      const before=runtimeBones.map(b=>b.quaternion.clone());runtime.animate(1/60,speed,behaviour,expression);
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
