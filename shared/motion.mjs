export const ACTIONS = ['idle', 'look', 'explore', 'follow', 'chase', 'rest'];
export const LABELS = {idle: 'Taking it all in', look: 'Looking your way', explore: 'Exploring', follow: 'Following you', chase: 'Chasing the ball', rest: 'A little breather'};
export const DEFAULT_AREA = {minX: -1.4, maxX: 1.4, minZ: -1.4, maxZ: 1.4};
export const MOOD_CLIPS = Object.freeze({curious:'Curious',playful:'Playful',shy:'Shy',sleepy:'Sleepy'});
export const REACTION_CLIPS = ['Curious','Playful','Shy','Sleepy','Greet','Stretch'];
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export function blocked(p, obstacles, margin = .13) {
  return obstacles.some(o => p.x >= o.x - o.w / 2 - margin && p.x <= o.x + o.w / 2 + margin && p.z >= o.z - o.d / 2 - margin && p.z <= o.z + o.d / 2 + margin);
}
export function inArea(p, area) {return p.x >= area.minX && p.x <= area.maxX && p.z >= area.minZ && p.z <= area.maxZ;}
export function safePoint(p, area, obstacles) {return inArea(p, area) && !blocked(p, obstacles);}
export function segmentSafe(a, b, area, obstacles) {
  const steps = Math.ceil(distance(a,b) / .035) + 1;
  for (let i = 0; i <= steps; i++) if (!safePoint({x: a.x+(b.x-a.x)*i/steps, z: a.z+(b.z-a.z)*i/steps},area,obstacles)) return false;
  return true;
}
// Small 4-neighbour grid. Checking segments prevents corner cutting near exclusions.
export function findPath(start, goal, area = DEFAULT_AREA, obstacles = []) {
  if (!safePoint(start,area,obstacles) || !safePoint(goal,area,obstacles)) return [];
  if (segmentSafe(start,goal,area,obstacles)) return [goal];
  const step = .14;
  const nx = Math.floor((area.maxX-area.minX)/step), nz=Math.floor((area.maxZ-area.minZ)/step);
  const point = n => ({x: area.minX+n[0]*step, z: area.minZ+n[1]*step});
  const nearest = p => [clamp(Math.round((p.x-area.minX)/step),0,nx),clamp(Math.round((p.z-area.minZ)/step),0,nz)];
  const s=nearest(start), g=nearest(goal), id=n=>n.join(','), open=[s], cost=new Map([[id(s),0]]), parents=new Map(), nodes=new Map([[id(s),s]]);
  if (!segmentSafe(start,point(s),area,obstacles) || !segmentSafe(point(g),goal,area,obstacles)) return [];
  while (open.length) {
    open.sort((a,b) => cost.get(id(a))+distance(point(a),goal)-cost.get(id(b))-distance(point(b),goal));
    const n=open.shift(), key=id(n);
    if (key===id(g)) {
      const result=[goal]; let k=key;
      while (k!==id(s)) {result.unshift(point(nodes.get(k))); k=parents.get(k);}
      result.unshift(point(s)); return result;
    }
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const next=[n[0]+dx,n[1]+dz], nk=id(next);
      if(next[0]<0||next[0]>nx||next[1]<0||next[1]>nz||!segmentSafe(point(n),point(next),area,obstacles)) continue;
      const nc=cost.get(key)+step;
      if(nc<(cost.get(nk)??Infinity)) {cost.set(nk,nc);parents.set(nk,key);nodes.set(nk,next);if(!open.some(x=>id(x)===nk))open.push(next);}
    }
  }
  return [];
}
export function allowedActions(state) {
  if (state.tracking === 'lost') return ['idle'];
  const result=['idle','look','rest'];
  if(state.energy > 8) result.push('explore');
  if(state.follow && state.energy > 8) result.push('follow');
  if(state.ball && state.energy > 8) result.push('chase');
  return result;
}
export function fallbackDecision(state) {
  const allowed=allowedActions(state);
  const action=state.tracking==='lost'?'idle':state.energy<16?'rest':state.ball?'chase':state.follow?'follow':state.personVisible?'look':state.personality==='sleepy'&&state.energy<65?'rest':state.secondsInAction<3?'idle':'explore';
  return {action: allowed.includes(action)?action:'idle', source:'local', confidence:null, probabilities:null, note:'Local behaviour rules'};
}
export class PetMotion {
  constructor({random=Math.random, area=DEFAULT_AREA}={}) {
    this.random=random; this.area={...area};this.obstacles=[];this.position={x:0,z:0};this.viewer={x:0,z:1.4};this.yaw=0;this.path=[];this.action='idle';this.energy=82;this.age=0;this.speed=0;this.ball=null;this.follow=false;this.tracking='normal';this.requestEpoch=0;this.lastTarget=null;
    this.mood='curious';this.expression=null;this.expressionRemaining=0;this.expressionClock=0;this.expressionIndex=0;this.lifeTime=0;this.nextFlourish=12;
  }
  react(clip,seconds=5) {
    if(!REACTION_CLIPS.includes(clip)||this.tracking==='lost')return false;
    this.follow=false;this.ball=null;this.setAction('look');this.speed=0;
    this.expression=clip;this.expressionRemaining=seconds;this.expressionClock=0;return true;
  }
  setMood(mood) {
    if(!MOOD_CLIPS[mood])return false;
    this.mood=mood;return this.react(MOOD_CLIPS[mood],mood==='sleepy'?6:mood==='playful'?4:5);
  }
  snapshot(personality='curious',personVisible=false) {return {energy:Math.round(this.energy),action:this.action,secondsInAction:Math.round(this.age),follow:this.follow,ball:!!this.ball,tracking:this.tracking,personality,personVisible,distanceToPhone:Number(distance(this.position,this.viewer).toFixed(2))};}
  setAction(action) {
    if(!allowedActions(this.snapshot()).includes(action)) return false;
    this.action=action; this.age=0;this.path=[];this.lastTarget=null;
    this.expression=null;this.expressionRemaining=0;this.expressionClock=0;
    if(action==='explore') {
      for(let i=0;i<16;i++) {
        const target={x:this.area.minX+(this.area.maxX-this.area.minX)*this.random(),z:this.area.minZ+(this.area.maxZ-this.area.minZ)*this.random()};
        const path=findPath(this.position,target,this.area,this.obstacles);if(path.length){this.path=path;break;}
      }
    }
    this.requestEpoch++;return true;
  }
  setBall(p) {if(!safePoint(p,this.area,this.obstacles)||!findPath(this.position,p,this.area,this.obstacles).length)return false;this.ball={...p};this.setAction('chase');return true;}
  addObstacle(obstacle) {if(blocked(this.position,[obstacle]))return false;this.obstacles.push(obstacle);this.path=[];this.requestEpoch++;if(this.ball&&blocked(this.ball,this.obstacles))this.ball=null;return true;}
  update(dt) {
    dt=clamp(dt,0,.05);this.age+=dt;
    if(this.tracking==='lost'){this.speed=0;return;}
    this.lifeTime+=dt;
    this.expressionClock+=dt;
    if(this.expressionRemaining>0){this.expressionRemaining=Math.max(0,this.expressionRemaining-dt);if(!this.expressionRemaining){this.expression=null;this.expressionClock=0;}}
    if(this.energy<=8&&!['rest','idle','look'].includes(this.action))this.setAction('rest');
    if(this.action==='chase'&&!this.ball){this.setAction('idle');}
    if(this.action==='follow'&&!this.follow){this.setAction('idle');}
    let target=this.action==='chase'?this.ball:null;
    if(this.action==='follow') {
      const d=distance(this.position,this.viewer);
      if(d>.55) target={x:clamp(this.viewer.x+(this.position.x-this.viewer.x)/d*.5,this.area.minX,this.area.maxX),z:clamp(this.viewer.z+(this.position.z-this.viewer.z)/d*.5,this.area.minZ,this.area.maxZ)};
      else this.path=[];
    }
    if(target&&(!this.lastTarget||distance(target,this.lastTarget)>.16||!this.path.length&&distance(this.position,target)>.05)) {this.path=findPath(this.position,target,this.area,this.obstacles);this.lastTarget={...target};}
    const waypoint=this.path[0]; this.speed=0;
    if(waypoint) {
      const d=distance(this.position,waypoint), speed=this.action==='chase'?.20:.10, move=Math.min(d,speed*dt);
      const next=d?{x:this.position.x+(waypoint.x-this.position.x)/d*move,z:this.position.z+(waypoint.z-this.position.z)/d*move}:waypoint;
      if(segmentSafe(this.position,next,this.area,this.obstacles)) {this.position=next;this.speed=dt?move/dt:0;this.turn(Math.atan2(waypoint.x-next.x,waypoint.z-next.z),dt);if(d<=speed*dt+.015)this.path.shift();}
      else {this.path=[];this.lastTarget=null;}
    } else if(this.action==='look'||this.action==='idle') this.turn(Math.atan2(this.viewer.x-this.position.x,this.viewer.z-this.position.z),dt);
    this.energy=clamp(this.energy+dt*(this.action==='rest'?2.8:this.speed>0?-.65:-.1),0,100);
    if(this.ball&&distance(this.position,this.ball)<.09){this.ball=null;this.setAction('look');}
    if(this.action==='explore'&&!this.path.length&&this.age>1)this.setAction('look');
    if(this.action==='explore'&&this.speed>0&&this.lifeTime>=this.nextFlourish){
      this.react(MOOD_CLIPS[this.mood],this.mood==='sleepy'?6:this.mood==='playful'?4:5);
      this.nextFlourish=this.lifeTime+14+this.random()*5;
    }
    // Local animation variety is independent of the AI's six navigation actions.
    // Never interrupt travel or a user-requested reaction with an idle flourish.
    if(this.speed===0&&!this.expression&&['idle','look','rest'].includes(this.action)&&this.expressionClock>2.2){
      const cycle=this.action==='rest'?['Sleepy','Stretch']:this.mood==='sleepy'?['Sleepy','Stretch','Curious']:this.mood==='shy'?['Shy','Curious','Stretch']:this.mood==='playful'?['Playful','Greet','Curious','Stretch']:['Curious','Greet','Stretch'];
      this.expression=cycle[this.expressionIndex++%cycle.length];this.expressionRemaining=this.expression==='Sleepy'?6:['Greet','Playful'].includes(this.expression)?4:5;this.expressionClock=0;this.requestEpoch++;
    }
  }
  turn(target,dt) {const delta=Math.atan2(Math.sin(target-this.yaw),Math.cos(target-this.yaw));this.yaw+=clamp(delta,-dt*4,dt*4);}
}
