import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
const cache=new Map();
async function prepareTextures(asset){
  if(typeof createImageBitmap!=='function')return asset;
  const sources=new Map();
  asset.scene.traverse(object=>{for(const material of object.material?Array.isArray(object.material)?object.material:[object.material]:[])for(const value of Object.values(material)){if(!value?.isTexture||!value.image?.width||!value.image?.height)continue;if(!sources.has(value.source))sources.set(value.source,new Set());sources.get(value.source).add(value);}});
  for(const [source,textures] of sources){const image=source.data,ratio=Math.min(1,2048/Math.max(image.width,image.height));if(ratio===1)continue;const resized=await createImageBitmap(image,{resizeWidth:Math.round(image.width*ratio),resizeHeight:Math.round(image.height*ratio),resizeQuality:'high',colorSpaceConversion:'none',premultiplyAlpha:'none'});source.data=resized;for(const texture of textures)texture.needsUpdate=true;image.close?.();}
  return asset;
}
export async function loadCreatureAsset(url){
  const resolved=new URL(url,location.origin);
  if(!(resolved.origin===location.origin&&resolved.pathname.startsWith('/models/'))&&!(resolved.protocol==='https:'&&/(^|\.)tripo3d\.(ai|com)$/.test(resolved.hostname)&&!resolved.username&&!resolved.password))throw new Error('This model address is not supported.');
  if(!cache.has(url))cache.set(url,new GLTFLoader().loadAsync(url).then(prepareTextures).catch(error=>{cache.delete(url);throw error;}));
  return cache.get(url);
}
export function createImportedCreature(asset,{height=.55,yaw}={}){
  let triangles=0,skinned=false;asset.scene.traverse(o=>{if(o.isSkinnedMesh)skinned=true;if(o.geometry)triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});
  if(!asset.animations.length||!skinned)throw new Error('The pet needs a skinned mesh and a walking animation.');
  if(triangles>100000)throw new Error('The pet exceeds the mobile triangle budget.');
  const rigBones=[];asset.scene.traverse(o=>{if(o.isBone)rigBones.push(o);});
  if(rigBones.some(b=>/[01]_(Left|Right)_Limb_\d+$/.test(b.name))){
    for(const leg of ['0_Left','0_Right','1_Left','1_Right'])for(let joint=0;joint<3;joint++){
      if(!rigBones.some(b=>b.name.endsWith(leg+'_Limb_'+joint)))throw new Error('This companion has an incomplete leg rig. Repair it in Blender before using it.');
    }
  }
  const group=new THREE.Group();group.name='GeneratedCompanion';const character=clone(asset.scene),pivot=new THREE.Group();
  character.updateMatrixWorld(true);
  const spine=rigBones.filter(b=>/Spine_\d+$/.test(b.name)).sort((a,b)=>Number(a.name.match(/\d+$/)[0])-Number(b.name.match(/\d+$/)[0]));
  const sourceForward=spine.length>1?spine.at(-1).getWorldPosition(new THREE.Vector3()).sub(spine[0].getWorldPosition(new THREE.Vector3())):new THREE.Vector3(1,0,0);
  sourceForward.y=0;sourceForward.normalize();
  pivot.rotation.y=yaw??-Math.atan2(sourceForward.x,sourceForward.z);pivot.add(character);group.add(pivot);
  // Each runtime owns its geometry/materials and skeleton. Texture data is shared
  // by the immutable cached asset and never disposed by an individual session.
  character.traverse(o=>{if(!o.isMesh)return;o.geometry=o.geometry.clone();o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;});
  // Box3 alone calls updateWorldMatrix, which does not refresh the skinned
  // mesh's bindMatrixInverse. Update the full rig before measuring each scale.
  const measure=()=>{group.updateMatrixWorld(true);character.traverse(o=>{if(o.isSkinnedMesh)o.computeBoundingBox();});return new THREE.Box3().setFromObject(group);};
  const box=measure(),size=box.getSize(new THREE.Vector3());if(!(size.y>0&&Number.isFinite(size.y)))throw new Error('The pet has invalid dimensions.');
  pivot.scale.setScalar(height/size.y);const scaled=measure(),center=scaled.getCenter(new THREE.Vector3());pivot.position.set(-center.x,-scaled.min.y,-center.z);group.updateMatrixWorld(true);
  const mixer=new THREE.AnimationMixer(character),walkClip=asset.animations.find(c=>/walk/i.test(c.name))||asset.animations[0];
  const clipFor=name=>asset.animations.find(c=>c.name.toLowerCase()===name.toLowerCase());
  const actions={Walk:mixer.clipAction(walkClip)};
  for(const name of ['Idle','Trot','Look','Rest','Curious','Playful','Shy','Sleepy','Greet','Stretch'])if(clipFor(name))actions[name]=mixer.clipAction(clipFor(name));
  const paw=[];character.traverse(o=>{if(o.isBone&&/0_Left_Limb_2/.test(o.name))paw.push(o);});
  // Calibrate cadence from the actual normalised paw motion during stance.
  // This also accounts for different creature sizes and GLB parent scales.
  const nominal={Walk:.22,Trot:.45};
  if(paw.length&&actions.Idle){
    for(const name of ['Walk','Trot'])if(actions[name]){
      const a=actions[name],duration=a.getClip().duration,dt=duration*.05;
      a.reset().play();a.time=duration*.07;mixer.update(0);group.updateMatrixWorld(true);
      const before=paw[0].getWorldPosition(new THREE.Vector3());
      a.time+=dt;mixer.update(0);group.updateMatrixWorld(true);
      const rate=Math.abs(paw[0].getWorldPosition(new THREE.Vector3()).z-before.z)/dt;
      if(Number.isFinite(rate)&&rate>.001)nominal[name]=rate;
      a.stop();
    }
  }
  let current=null,disposed=false,lastExpressionEpoch=null;
  let faceMesh=null;character.traverse(o=>{if(o.isMesh&&o.geometry.attributes.position.count>1000&&o.morphTargetDictionary?.JawOpen!==undefined)faceMesh=o;});
  const activate=name=>{
    if(current===name)return;
    const previous=actions[current],next=actions[name];
    if(!next)return;
    const phase=previous?previous.time/previous.getClip().duration%1:0;
    next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(.35).play();
    if(['Walk','Trot'].includes(name)&&['Walk','Trot'].includes(current))next.time=phase*next.getClip().duration;
    previous?.fadeOut(.35);current=name;
  };
  activate(actions.Idle?'Idle':'Walk');
  if(!actions.Idle)actions.Walk.enabled=false;
  return {group,character,mixer,triangles,generated:true,
    animate(dt,speed,behaviour='idle',expression=null,expressionEpoch=null){
      if(disposed)return;
      const moving=speed>.01;
      if(actions.Idle){
        const name=moving?(speed>.15&&actions.Trot?'Trot':'Walk'):expression&&actions[expression]?expression:behaviour==='rest'&&actions.Rest?'Rest':behaviour==='look'&&actions.Look?'Look':'Idle';
        if(expression&&current===name&&expressionEpoch!==null&&expressionEpoch!==lastExpressionEpoch)actions[name].time=0;
        lastExpressionEpoch=expressionEpoch;
        activate(name);
        if(moving)actions[name].setEffectiveTimeScale(Math.max(.1,Math.min(12,speed/nominal[name])));
        else actions[name].setEffectiveTimeScale(1);
      }else{
        actions.Walk.enabled=moving;actions.Walk.timeScale=Math.min(1.8,Math.max(.35,speed/.22));
      }
      mixer.update(dt);
    },
    animationState:()=>({clip:current,cadence:actions[current]?.getEffectiveTimeScale(),nominalSpeeds:{...nominal},mouth:faceMesh?{jaw:faceMesh.morphTargetInfluences[faceMesh.morphTargetDictionary.JawOpen],smile:faceMesh.morphTargetInfluences[faceMesh.morphTargetDictionary.Smile]}:null}),
    clips:()=>asset.animations,
    dispose(){if(disposed)return;disposed=true;mixer.stopAllAction();mixer.uncacheRoot(character);character.traverse(o=>{o.geometry?.dispose();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());});}
  };
}
