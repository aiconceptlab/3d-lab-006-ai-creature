import * as THREE from 'three';
import { createCreature } from './creature.js';
export function mobileARSupport(){return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1;}
export function cameraSupport(){return isSecureContext&&!!navigator.mediaDevices?.getUserMedia&&!!window.WebAssembly;}
let enginePromise;
async function loadEngine(){if(window.XR8)return window.XR8;if(enginePromise)return enginePromise;window.THREE=THREE;enginePromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/xr/xr.js';script.async=true;script.dataset.preloadChunks='slam';const failed=message=>{clearTimeout(timer);window.removeEventListener('xrloaded',ready);script.remove();enginePromise=null;reject(new Error(message));};const ready=()=>{clearTimeout(timer);resolve(window.XR8);};const timer=setTimeout(()=>failed('Room tracking took too long to load. Check your connection and try again.'),25000);window.addEventListener('xrloaded',ready,{once:true});script.onerror=()=>failed('Room tracking could not load. The 3D preview is still available.');document.head.append(script);});return enginePromise;}
export class RoomSession {
  constructor({canvas,design,motion,onStatus,onTap,onFrame}){Object.assign(this,{canvas,design,motion,onStatus,onTap,onFrame});this.placed=false;this.origin=new THREE.Vector3();this.ray=new THREE.Raycaster();this.plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);this.last=0;this.active=false;}
  async start(){
    if(!mobileARSupport())throw new Error('Open this website on an iPhone or Android phone to place your pet in the room.');
    if(!cameraSupport())throw new Error('Camera access needs HTTPS and a supported browser. Open this link in Safari or Chrome.');
    this.active=true;
    // iOS requires these calls while the room button's user gesture is active.
    const permissions=[window.DeviceOrientationEvent,window.DeviceMotionEvent].filter(type=>typeof type?.requestPermission==='function').map(type=>type.requestPermission());
    if((await Promise.all(permissions)).some(value=>value!=='granted'))throw new Error('Allow motion access to keep your companion fixed to the floor.');
    const XR8=await loadEngine();if(!this.active)return;this.XR8=XR8;this.onStatus('Point at a textured floor and move your phone slowly.');
    this.resize=()=>{this.canvas.width=window.innerWidth;this.canvas.height=window.innerHeight;};this.resize();window.addEventListener?.('resize',this.resize);
    XR8.addCameraPipelineModules([
      XR8.GlTextureRenderer.pipelineModule(), XR8.Threejs.pipelineModule(), XR8.XrController.pipelineModule(),
      {name:'creature-room',
        onAttach:({stream,video})=>{if(!this.active){stream?.getTracks().forEach(t=>t.stop());return;}this.stream=stream;this.video=video;},
        onStart:()=>{const {scene,camera,renderer}=XR8.Threejs.xrScene();Object.assign(this,{scene,camera,renderer});renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;scene.add(new THREE.HemisphereLight('#eefaff','#9b8d7b',2));const key=new THREE.DirectionalLight('#fff1d8',2.3);key.position.set(1,3,2);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-3;key.shadow.camera.right=3;key.shadow.camera.top=3;key.shadow.camera.bottom=-3;key.shadow.normalBias=.02;scene.add(key);
          this.pet=createCreature(this.design);this.pet.group.visible=false;scene.add(this.pet.group);const floor=new THREE.Mesh(new THREE.PlaneGeometry(10,10),new THREE.ShadowMaterial({opacity:.25}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
          this.reticle=new THREE.Mesh(new THREE.RingGeometry(.08,.092,48),new THREE.MeshBasicMaterial({color:'#70e5de',side:THREE.DoubleSide}));this.reticle.rotation.x=-Math.PI/2;this.reticle.position.y=.006;scene.add(this.reticle);
          this.ball=new THREE.Mesh(new THREE.SphereGeometry(.05,16,12),new THREE.MeshStandardMaterial({color:'#7fe4dd',emissive:'#236761'}));this.ball.visible=false;scene.add(this.ball);this.exclusions=new THREE.Group();scene.add(this.exclusions);
        },
        onUpdate:({processCpuResult})=>{if(!this.camera||!this.active)return;const reality=processCpuResult.reality;const now=performance.now(),dt=this.last?Math.min((now-this.last)/1000,.05):0;this.last=now;
          const good=reality?.trackingStatus==='NORMAL';if(!good&&this.motion.tracking!=='lost')this.motion.requestEpoch++;this.motion.tracking=good?'normal':'lost';
          if(!good){this.pet.group.visible=this.placed;this.reticle.visible=false;this.onStatus('Tracking paused · point back at the floor');return;}
          if(!this.placed){const point=this.floorPoint(.5,.67);this.reticle.visible=!!point;if(point)this.reticle.position.copy(point).setY(.006);this.onStatus(point?'Tap the floor to meet your companion.':'Tilt the camera down towards the floor.');return;}
          this.motion.viewer={x:this.camera.position.x-this.origin.x,z:this.camera.position.z-this.origin.z};this.onFrame?.(dt);
          this.pet.group.position.set(this.origin.x+this.motion.position.x,0,this.origin.z+this.motion.position.z);this.pet.group.rotation.y=this.motion.yaw;this.pet.animate(dt,this.motion.speed,this.motion.action);this.ball.visible=!!this.motion.ball;if(this.motion.ball)this.ball.position.set(this.origin.x+this.motion.ball.x,.055,this.origin.z+this.motion.ball.z);
        },
        onCameraStatusChange:({status})=>{if(status==='failed')this.onStatus('Camera permission was not granted. Exit and allow camera access in your browser settings.');},
        onException:error=>{console.warn('Room tracker:',error);this.motion.tracking='lost';this.motion.requestEpoch++;this.onStatus(error?.type==='permission'&&error.permission==='deviceorientation'?'Motion permission unavailable. Exit, enable motion access and reopen this page in Safari or Chrome.':'Room tracking stopped. Exit and reopen the room view.');},
      }
    ]);
    this.tapHandler=e=>{if(!this.active||!this.camera||this.motion.tracking==='lost')return;const bounds=this.canvas.getBoundingClientRect(),p=this.floorPoint((e.clientX-bounds.left)/bounds.width,(e.clientY-bounds.top)/bounds.height);if(!p)return;
      if(!this.placed){this.origin.copy(p);this.motion.position={x:0,z:0};this.motion.path=[];this.motion.ball=null;this.motion.setAction('look');this.placed=true;this.reticle.visible=false;this.pet.group.visible=true;this.onStatus('Your companion is here. Tap the floor to play.');}
      else this.onTap({x:p.x-this.origin.x,z:p.z-this.origin.z});};this.canvas.addEventListener('pointerup',this.tapHandler);
    await XR8.run({canvas:this.canvas,allowedDevices:XR8.XrConfig.device().ANY});
  }
  floorPoint(x,y){this.ray.setFromCamera(new THREE.Vector2(x*2-1,1-y*2),this.camera);const p=new THREE.Vector3();if(!this.ray.ray.intersectPlane(this.plane,p)||p.distanceTo(this.camera.position)>8)return null;return p;}
  obstacles(items){if(!this.exclusions)return;this.exclusions.children.forEach(o=>{o.geometry.dispose();o.material.dispose();});this.exclusions.clear();for(const o of items){const mesh=new THREE.Mesh(new THREE.BoxGeometry(o.w,.03,o.d),new THREE.MeshBasicMaterial({color:'#ef9873',transparent:true,opacity:.32}));mesh.position.set(this.origin.x+o.x,.016,this.origin.z+o.z);this.exclusions.add(mesh);}}
  recenter(){this.placed=false;this.motion.tracking='lost';this.motion.requestEpoch++;this.motion.path=[];this.motion.ball=null;this.motion.obstacles=[];this.obstacles([]);if(this.pet)this.pet.group.visible=false;this.XR8?.XrController.recenter();}
  async stop(){this.active=false;window.removeEventListener?.('resize',this.resize);this.canvas.removeEventListener('pointerup',this.tapHandler);this.XR8?.stop();this.stream?.getTracks().forEach(t=>t.stop());this.XR8?.clearCameraPipelineModules();this.pet?.dispose();this.scene?.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());});this.motion.tracking='normal';this.motion.path=[];this.motion.requestEpoch++;}
}
