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
export function createImportedCreature(asset,{height=.55,yaw=-Math.PI/2}={}){
  let triangles=0,skinned=false;asset.scene.traverse(o=>{if(o.isSkinnedMesh)skinned=true;if(o.geometry)triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});
  if(!asset.animations.length||!skinned)throw new Error('The pet needs a skinned mesh and a walking animation.');
  if(triangles>100000)throw new Error('The pet exceeds the mobile triangle budget.');
  const group=new THREE.Group();group.name='GeneratedCompanion';const character=clone(asset.scene),pivot=new THREE.Group();pivot.rotation.y=yaw;pivot.add(character);group.add(pivot);
  // Each runtime owns its geometry/materials and skeleton. Texture data is shared
  // by the immutable cached asset and never disposed by an individual session.
  character.traverse(o=>{if(!o.isMesh)return;o.geometry=o.geometry.clone();o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;});
  // Box3 alone calls updateWorldMatrix, which does not refresh the skinned
  // mesh's bindMatrixInverse. Update the full rig before measuring each scale.
  const measure=()=>{group.updateMatrixWorld(true);character.traverse(o=>{if(o.isSkinnedMesh)o.computeBoundingBox();});return new THREE.Box3().setFromObject(group);};
  const box=measure(),size=box.getSize(new THREE.Vector3());if(!(size.y>0&&Number.isFinite(size.y)))throw new Error('The pet has invalid dimensions.');
  pivot.scale.setScalar(height/size.y);const scaled=measure(),center=scaled.getCenter(new THREE.Vector3());pivot.position.set(-center.x,-scaled.min.y,-center.z);group.updateMatrixWorld(true);
  const mixer=new THREE.AnimationMixer(character),walkClip=asset.animations.find(c=>/walk/i.test(c.name))||asset.animations[0],walk=mixer.clipAction(walkClip);walk.play();walk.enabled=false;
  let age=0,walking=false,disposed=false;
  return {group,character,mixer,triangles,generated:true,
    animate(dt,speed){if(disposed)return;age+=dt;const moving=speed>.01;if(moving!==walking){walking=moving;walk.enabled=moving;if(moving)walk.reset().play();}walk.timeScale=Math.min(1.8,Math.max(.35,speed/.22));mixer.update(dt);pivot.scale.setScalar(height/size.y*(moving?1:1+Math.sin(age*2.1)*.0025));},
    clips:()=>asset.animations,
    dispose(){if(disposed)return;disposed=true;mixer.stopAllAction();mixer.uncacheRoot(character);character.traverse(o=>{o.geometry?.dispose();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());});}
  };
}
