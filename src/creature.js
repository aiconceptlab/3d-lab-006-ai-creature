import * as THREE from 'three';
import { palette, validateDesign } from '../shared/design.mjs';
const sphere=new THREE.SphereGeometry(1,24,18);
const tuftGeo=new THREE.ConeGeometry(1,1,5,1);
const random=seed=>()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
export function createCreature(input) {
  const design=validateDesign(input), group=new THREE.Group();group.name='Creature';
  const coat=new THREE.MeshStandardMaterial({color:palette.coat[design.coat],roughness:.88});
  const muzzle=new THREE.MeshStandardMaterial({color:design.coat==='charcoal'?'#c4c8c1':'#fff1dc',roughness:.85});
  const inner=new THREE.MeshStandardMaterial({color:design.coat==='charcoal'?'#b68e9e':'#e1b8a8',roughness:.9});
  const accent=new THREE.MeshStandardMaterial({color:palette.accent[design.accent],emissive:palette.accent[design.accent],emissiveIntensity:.7,roughness:.37});
  const dark=new THREE.MeshPhysicalMaterial({color:'#06131d',roughness:.085,clearcoat:1,clearcoatRoughness:.07});
  const iris=new THREE.MeshPhysicalMaterial({color:palette.eyes[design.eyes],metalness:.15,roughness:.2,clearcoat:1});
  const white=new THREE.MeshBasicMaterial({color:'#fff9ed'});
  const noseMaterial=new THREE.MeshStandardMaterial({color:'#ac7667',roughness:.48});
  function oval(parent,material,pos,scale,name){const mesh=new THREE.Mesh(sphere,material);mesh.position.set(...pos);mesh.scale.set(...scale);mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  const torso=new THREE.Group();torso.name='Torso';group.add(torso);
  oval(torso,coat,[0,.2,-.025],[design.build==='slender'?.108:.145,.15,.195],'Body');
  oval(torso,muzzle,[0,.2,.105],[.105,.125,.07],'Chest');
  const hips=[];
  for(const [name,x,z,phase]of [['FrontLeft',-.104,.115,0],['FrontRight',.104,.115,Math.PI],['BackLeft',-.104,-.155,Math.PI],['BackRight',.104,-.155,0]]){
    const hip=new THREE.Group();hip.name=name;hip.position.set(x,.165,z);torso.add(hip);
    oval(hip,coat,[0,-.055,0],[.045,.073,.045],name+'Leg');
    oval(hip,muzzle,[0,-.12,.017],[.055,.042,.072],name+'Paw');
    for(let j=-1;j<=1;j++)oval(hip,accent,[j*.024,-.118,.075],[.010,.009,.008],name+'Toe'+j);
    hips.push({hip,phase});
  }
  const head=new THREE.Group();head.name='Head';head.position.set(0,.35,.125);torso.add(head);
  const headWidth=design.family==='fox'?.19:design.family==='cat'?.2:.178;
  oval(head,coat,[0,0,0],[headWidth,.173,.157],'HeadShape');
  for(const sign of [-1,1])oval(head,coat,[sign*.16,-.035,-.008],[.075,.09,.09],'Cheek'+sign);
  oval(head,muzzle,[-.039,-.082,.135],[.052,.044,.040],'MuzzleL');
  oval(head,muzzle,[.039,-.082,.135],[.052,.044,.040],'MuzzleR');
  const nose=new THREE.Mesh(new THREE.ConeGeometry(.017,.024,3),noseMaterial);nose.rotation.z=Math.PI;nose.rotation.x=Math.PI/2;nose.position.set(0,-.072,.177);head.add(nose);
  const eyes=[];
  for(const sign of [-1,1]){
    const eye=new THREE.Group();eye.name=sign<0?'EyeL':'EyeR';eye.position.set(sign*.084,.008,.135);eye.rotation.y=sign*.18;head.add(eye);
    oval(eye,dark,[0,0,0],[.070,.083,.048],'EyeShell'+sign);
    oval(eye,iris,[0,-.004,.039],[.055,.067,.017],'Iris'+sign);
    oval(eye,dark,[0,-.002,.056],[.029,.039,.008],'Pupil'+sign);
    oval(eye,white,[-.018,.027,.063],[.014,.017,.007],'EyeLight'+sign);
    oval(eye,white,[.014,-.024,.066],[.006,.007,.003],'EyeLightSmall'+sign);eyes.push(eye);
  }
  const ears=[];
  const earHeight=design.ears==='long'?.25:design.ears==='small'?.11:.185;
  for(const sign of [-1,1]){
    const pivot=new THREE.Group();pivot.name=sign<0?'EarL':'EarR';pivot.position.set(sign*.123,.111,-.015);pivot.rotation.z=-sign*(design.ears==='long'?.14:.32);head.add(pivot);
    const shape=new THREE.Shape();shape.moveTo(-.062,0);shape.quadraticCurveTo(-.06,earHeight*.55,0,earHeight);shape.quadraticCurveTo(.058,earHeight*.6,.062,0);shape.quadraticCurveTo(0,-.026,-.062,0);
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:.035,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.016,bevelThickness:.012,curveSegments:8});
    const mesh=new THREE.Mesh(geometry,coat);mesh.position.z=-.04;mesh.castShadow=true;pivot.add(mesh);
    const inset=new THREE.Mesh(new THREE.ShapeGeometry(shape,12),inner);inset.scale.set(.70,.78,1);inset.position.set(0,.018,.009);pivot.add(inset);
    oval(pivot,accent,[0,earHeight*.6,.014],[.008,.022,.003],'EarAccent'+sign);ears.push(pivot);
  }
  const tail=new THREE.Group();tail.name='Tail';tail.position.set(0,.21,-.19);torso.add(tail);
  if(design.tail==='puff')oval(tail,coat,[0,.04,-.04],[.095,.09,.085],'PuffTail');
  else {
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(.06,.09,-.12),new THREE.Vector3(.15,.24,-.17),new THREE.Vector3(.21,.35,-.09),new THREE.Vector3(.19,.38,.025),new THREE.Vector3(.105,.33,.06)]);
    const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,28,design.tail==='fluffy'?.052:.039,8,false),coat);mesh.castShadow=true;tail.add(mesh);
    const tip=curve.getPoint(1);oval(tail,accent,tip.toArray(),[.045,.044,.044],'TailLight');
    for(let i=0;i<13;i++){const p=curve.getPoint(i/14);oval(tail,coat,p.toArray(),[.050,.058,.049],'TailFluff'+i);}
  }
  // Instancing adds a soft sculpted silhouette without hundreds of draw calls.
  const rng=random(731);const tufts=new THREE.InstancedMesh(tuftGeo,coat,240);tufts.name='FurTufts';tufts.castShadow=true;const dummy=new THREE.Object3D(),up=new THREE.Vector3(0,1,0);
  for(let i=0;i<240;i++){
    const a=rng()*Math.PI*2, b=Math.acos(2*rng()-1),normal=new THREE.Vector3(Math.sin(b)*Math.cos(a),Math.cos(b),Math.sin(b)*Math.sin(a));
    // Keep the face clear for readable eyes and muzzle.
    if(normal.z>.45&&Math.abs(normal.x)<.72)normal.z=-Math.abs(normal.z);
    dummy.position.set(normal.x*headWidth*.97,normal.y*.17,normal.z*.153);dummy.quaternion.setFromUnitVectors(up,normal);dummy.scale.set(.007+rng()*.004,.020+rng()*.013,.007);dummy.updateMatrix();tufts.setMatrixAt(i,dummy.matrix);
  }head.add(tufts);
  for(let i=0;i<5;i++)oval(head,coat,[(i-2)*.029,.165+(i===2?.012:0),-.003],[.025,.032,.03],'ForeheadTuft'+i);
  const state={time:0,blink:0};
  function animate(dt,speed=0,action='idle',look=0){state.time+=dt;const t=state.time;torso.position.y=speed>0?Math.sin(t*11)*.006:Math.sin(t*2.2)*.004;torso.scale.y=action==='rest'?.93:1;head.rotation.z=Math.sin(t*.65)*.07;head.rotation.y=THREE.MathUtils.lerp(head.rotation.y,Math.max(-.3,Math.min(.3,look)),.06);head.rotation.x=action==='rest'?.13:Math.sin(t*.85)*.035;
    for(const {hip,phase}of hips){hip.rotation.x=speed>.01?Math.sin(t*(speed>.45?14:10)+phase)*.44:0;}
    ears.forEach((ear,i)=>{ear.rotation.x=Math.sin(t*1.5+i)*.065;});tail.rotation.y=Math.sin(t*2)*(action==='chase'?.3:.13);
    const phase=t%4.7, blink=phase>4.35&&phase<4.55?Math.max(.06,Math.abs(phase-4.45)/.1):1;eyes.forEach(eye=>eye.scale.y=blink);
  }
  function clips(){const times=[0,.125,.25,.375,.5,.625,.75,.875,1],tracks=hips.map(({hip,phase})=>new THREE.QuaternionKeyframeTrack(`${hip.name}.quaternion`,times,times.flatMap(t=>new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.sin(t*Math.PI*2+phase)*.44,0,0)).toArray())));return [new THREE.AnimationClip('Walk',1,tracks),new THREE.AnimationClip('Idle',2,[new THREE.VectorKeyframeTrack('Torso.position',[0,.5,1,1.5,2],[0,0,0,0,.004,0,0,0,0,0,-.004,0,0,0,0])])];}
  return {group,design,animate,clips,dispose(){const geometries=new Set(),materials=new Set();group.traverse(o=>{if(o.geometry&&!['SphereGeometry','ConeGeometry'].includes(o.geometry.type))geometries.add(o.geometry);if(o.material)materials.add(o.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
