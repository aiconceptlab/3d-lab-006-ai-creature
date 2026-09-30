import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createCreature } from './creature.js';
export class Studio {
  constructor(container,design,{onTap,frame}={}) {
    this.container=container;this.onTap=onTap;this.frame=frame;this.running=true;this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#111e22');this.scene.fog=new THREE.Fog('#111e22',3.3,10);
    this.renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.12;container.append(this.renderer.domElement);
    this.camera=new THREE.PerspectiveCamera(35,1,.03,25);this.camera.position.set(.8,.78,1.45);this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.target.set(0,.26,0);this.controls.enableDamping=true;this.controls.maxPolarAngle=Math.PI*.47;this.controls.minDistance=.7;this.controls.maxDistance=5;this.controls.enablePan=false;
    this.scene.add(new THREE.HemisphereLight('#c5e4e8','#77675a',2.15));
    const key=new THREE.DirectionalLight('#ffdebd',3.5);key.position.set(-1.2,2,1.8);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-2;key.shadow.camera.right=2;key.shadow.camera.top=2;key.shadow.camera.bottom=-2;key.shadow.normalBias=.022;key.shadow.radius=4;this.scene.add(key);
    const rim=new THREE.DirectionalLight('#77d7ef',2.7);rim.position.set(1,1,-1);this.scene.add(rim);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(12,12),new THREE.MeshStandardMaterial({color:'#162d30',roughness:.82}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;this.scene.add(floor);
    this.grid=new THREE.GridHelper(6,30,'#365553','#26423f');this.grid.position.y=.002;this.grid.material.transparent=true;this.grid.material.opacity=.32;this.scene.add(this.grid);
    const pad=new THREE.Mesh(new THREE.CylinderGeometry(.48,.48,.015,80),new THREE.MeshStandardMaterial({color:'#203c3c',roughness:.6,metalness:.1}));pad.position.y=-.006;pad.receiveShadow=true;this.scene.add(pad);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.5,.003,5,96),new THREE.MeshBasicMaterial({color:'#688983'}));ring.rotation.x=Math.PI/2;ring.position.y=.005;this.scene.add(ring);
    this.pet=createCreature(design);this.scene.add(this.pet.group);this.ball=new THREE.Mesh(new THREE.SphereGeometry(.05,18,14),new THREE.MeshStandardMaterial({color:'#64e2dc',emissive:'#217573',roughness:.32,metalness:.3}));this.ball.visible=false;this.ball.castShadow=true;this.scene.add(this.ball);
    this.obstacleGroup=new THREE.Group();this.scene.add(this.obstacleGroup);
    this.ray=new THREE.Raycaster();this.plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
    let down=null;this.renderer.domElement.addEventListener('pointerdown',e=>down={x:e.clientX,y:e.clientY});this.renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>8)return;const box=this.renderer.domElement.getBoundingClientRect();this.ray.setFromCamera(new THREE.Vector2((e.clientX-box.left)/box.width*2-1,1-(e.clientY-box.top)/box.height*2),this.camera);const p=new THREE.Vector3();if(this.ray.ray.intersectPlane(this.plane,p))this.onTap?.({x:p.x,z:p.z});});
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(container);this.resize();this.last=performance.now();this.loop=this.loop.bind(this);this.raf=requestAnimationFrame(this.loop);
  }
  resize(){const w=this.container.clientWidth,h=this.container.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
  replace(design){this.scene.remove(this.pet.group);this.pet.dispose();this.pet=createCreature(design);this.scene.add(this.pet.group);}
  sync(motion,dt){this.pet.group.position.set(motion.position.x,0,motion.position.z);this.pet.group.rotation.y=motion.yaw;this.pet.animate(dt,motion.speed,motion.action);this.ball.visible=!!motion.ball;if(motion.ball)this.ball.position.set(motion.ball.x,.055,motion.ball.z);}
  obstacles(items){this.obstacleGroup.children.forEach(o=>{o.geometry.dispose();o.material.dispose();});this.obstacleGroup.clear();for(const o of items){const mesh=new THREE.Mesh(new THREE.BoxGeometry(o.w,.035,o.d),new THREE.MeshBasicMaterial({color:'#e99a70',transparent:true,opacity:.4}));mesh.position.set(o.x,.018,o.z);this.obstacleGroup.add(mesh);}}
  loop(now){if(!this.running)return;const dt=Math.min((now-this.last)/1000,.05);this.last=now;this.frame?.(dt,this);this.controls.update();this.renderer.render(this.scene,this.camera);this.raf=requestAnimationFrame(this.loop);}
  pause(){this.running=false;cancelAnimationFrame(this.raf);}
  resume(){this.running=true;this.last=performance.now();this.raf=requestAnimationFrame(this.loop);}
  resetCamera(){this.camera.position.set(.8,.78,1.45);this.controls.target.set(0,.26,0);}
  dispose(){this.pause();this.observer.disconnect();this.controls.dispose();this.pet.dispose();this.scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());}});this.renderer.dispose();this.renderer.domElement.remove();}
}
