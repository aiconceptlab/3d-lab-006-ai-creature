"""Blender inspection renders for the actual GLB; no paid generation."""
import bpy, math, json, sys
from mathutils import Vector
from pathlib import Path
args=sys.argv[sys.argv.index('--')+1:]
model=Path(args[0]).resolve(); out=Path(args[1]).resolve(); out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(model))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
depsgraph=bpy.context.evaluated_depsgraph_get()
evaluated=[o.evaluated_get(depsgraph) for o in meshes]
points=[o.matrix_world@Vector(c) for o in evaluated for c in o.bound_box]
low=Vector([min(p[i] for p in points) for i in range(3)]);high=Vector([max(p[i] for p in points) for i in range(3)])
center=(low+high)/2; scale=max(high-low)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.resolution_x=900;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Studio');scene.world.use_nodes=True;scene.world.node_tree.nodes.get('Background').inputs[0].default_value=(.15,.18,.22,1);scene.world.node_tree.nodes.get('Background').inputs[1].default_value=.5
def light(name,offset,power,color):
 data=bpy.data.lights.new(name,'AREA');data.energy=power*scale*scale;data.color=color;data.shape='DISK';data.size=scale*2
 obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.location=center+Vector(offset)*scale;obj.rotation_euler=(center-obj.location).to_track_quat('-Z','Y').to_euler()
light('Key',(-1.5,-2,2.5),400,(1,.9,.8));light('Fill',(1.5,-.5,1),220,(.7,.85,1));light('Rim',(0,2,1.8),350,(.8,.9,1))
bpy.ops.mesh.primitive_plane_add(size=scale*200,location=(center.x,center.y,low.z-.002*scale));floor=bpy.context.object
material=bpy.data.materials.new('Floor');material.diffuse_color=(.045,.065,.08,1);floor.data.materials.append(material)
data=bpy.data.cameras.new('Camera');camera=bpy.data.objects.new('Camera',data);scene.collection.objects.link(camera);scene.camera=camera;data.type='ORTHO';data.ortho_scale=scale*1.4
stats={'meshes':len(meshes),'vertices':sum(len(o.data.vertices) for o in meshes),'triangles':sum(len(p.vertices)-2 for o in meshes for p in o.data.polygons),'materials':[m.name for m in bpy.data.materials],'dimensions':list(high-low),'objects':[o.name for o in meshes],'armatures':[o.name for o in scene.objects if o.type=='ARMATURE'],'clips':[a.name for a in bpy.data.actions]}
(out/'mesh-inspection.json').write_text(json.dumps(stats,indent=2))
for name,offset in [('front',(1,-2,.7)),('side',(2,1,.5)),('back',(-1,2,.7)),('face',(1,-2,.35))]:
 target=center if name!='face' else center+Vector((0,0,.18*scale));camera.location=target+Vector(offset)*scale*2;camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();data.ortho_scale=scale*(1.4 if name!='face' else .7)
 scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'nova-inspection.blend'))
print(json.dumps(stats))
