"""Reviewed facial landmarks for the three included characters; no provider calls.
Shape keys deform the actual chin; a skinned curved mouth lining follows the face.
New arbitrary characters require their own reviewed landmarks before using this.
"""
import bpy, math
from mathutils import Vector
PROFILES={
 '332eccff':(.459,-.163,-.037,.036,.028),
 '04b10f30':(.390,-.125,-.068,.030,.026),
 '74629b50':(.469,.014,.080,.032,.026),
}
def automatic_chin(arm,meshes):
 # New creatures receive a conservative, bone-weighted jaw deformation.
 # A guessed mouth opening can cut through eyes/fur, so no lining is added
 # until facial landmarks have been reviewed in Blender.
 face=arm.data.bones['tripo::Head_2'];up=Vector((0,0,1))
 forward=face.head_local-arm.data.bones['tripo::Head_1'].head_local;forward.z=0
 if forward.length<.001:raise RuntimeError('Cannot locate the face direction')
 forward.normalize();side=up.cross(forward).normalized();points=[]
 for mesh in meshes:
  transform=arm.matrix_world.inverted()@mesh.matrix_world;group=mesh.vertex_groups.get(face.name)
  if not group:continue
  for v in mesh.data.vertices:
   weight=sum(g.weight for g in v.groups if g.group==group.index)
   if weight>.7:points.append(transform@v.co)
 if len(points)<100:raise RuntimeError('Insufficient weighted face geometry')
 def quantile(values,q):
  values=sorted(values);return values[round((len(values)-1)*q)]
 extent=quantile([p.dot(side) for p in points],.9)-quantile([p.dot(side) for p in points],.1)
 width=extent*.20;opening=extent*.08;depth=quantile([p.dot(forward) for p in points],.94)
 centre=quantile([p.dot(side) for p in points],.5);lip=face.head_local.z
 changed=0
 for mesh in meshes:
  transform=arm.matrix_world.inverted()@mesh.matrix_world;inverse=transform.inverted();group=mesh.vertex_groups.get(face.name)
  mesh.shape_key_add(name='Basis');jaw=mesh.shape_key_add(name='JawOpen');smile=mesh.shape_key_add(name='Smile')
  for v in mesh.data.vertices:
   p=transform@v.co;weight=sum(g.weight for g in v.groups if g.group==group.index) if group else 0
   lateral=max(0,1-((p.dot(side)-centre)/max(width*2,.001))**2)
   front=max(0,min(1,(p.dot(forward)-(depth-extent*.35))/max(extent*.25,.001)))
   lower=max(0,min(1,(lip+extent*.03-p.z)/max(extent*.12,.001)))*max(0,min(1,(p.z-(lip-extent*.5))/max(extent*.2,.001)))
   influence=weight*lateral*front*lower
   if influence>.01:changed+=1
   jaw.data[v.index].co=inverse@(p-up*opening*influence-forward*opening*.1*influence)
   smile.data[v.index].co=inverse@(p+up*opening*.1*influence)
 if changed<25:raise RuntimeError('Face calibration needs manual review')
 return {'calibration':'estimated-chin','reviewRequired':True,'deformedChinVertices':changed,'mouthLiningVertices':0,'faceForward':list(forward),'opening':opening}

def author_mouth(arm,meshes):
 source=meshes[0];profile=next((v for k,v in PROFILES.items() if k in source.name),None)
 if profile is None:return automatic_chin(arm,meshes)
 x,y,z,width,opening=profile;face=arm.data.bones['tripo::Head_2'];changed=0
 for mesh in list(meshes):
  transform=arm.matrix_world.inverted()@mesh.matrix_world;inverse=transform.inverted();mesh.shape_key_add(name='Basis');jaw=mesh.shape_key_add(name='JawOpen');smile=mesh.shape_key_add(name='Smile');vg=mesh.vertex_groups.get(face.name)
  for v in mesh.data.vertices:
   p=transform@v.co;head=sum(g.weight for g in v.groups if g.group==vg.index) if vg else 0
   lateral=max(0,1-((p.y-y)/(width*2.5))**2)
   depth=max(0,min(1,(p.x-(x-.095))/.070))
   # Keep the nose and upper muzzle still, lower the chin with a broad soft falloff.
   lower=max(0,min(1,(z+.009-p.z)/.026))*max(0,min(1,(p.z-(z-.12))/.055))
   influence=lateral*depth*lower*head
   if influence>.01:changed+=1
   jaw.data[v.index].co=inverse@(p+Vector((-.004*influence,0,-opening*influence)))
   corner=max(0,1-abs(p.z-z)/.035)*depth*head*lateral
   smile.data[v.index].co=inverse@(p+Vector((0,(p.y-y)*.08*corner,.005*corner*min(1,abs(p.y-y)/width))))
 # Curved lining: its upper edge stays at the lip and its lower edge follows JawOpen.
 # The dark inset and tongue are real skinned geometry, not a screen-space decal.
 vertices=[];faces=[];materials=[];rows=8;cols=32
 for row in range(rows+1):
  t=row/rows
  for col in range(cols+1):
   u=-1+2*col/cols;arc=math.sqrt(max(0,1-u*u));vertices.append((x+.002-.018*u*u,y+width*u,z-.0015*t*arc))
 for row in range(rows):
  for col in range(cols):
   a=row*(cols+1)+col;faces.append((a,a+1,a+cols+2,a+cols+1));materials.append(1 if row>=5 and 7<=col<=24 else 0)
 data=bpy.data.meshes.new('MouthLining');data.from_pydata(vertices,[],faces);data.update();mouth=bpy.data.objects.new('ExpressiveMouth',data);bpy.context.collection.objects.link(mouth);mouth.matrix_world=arm.matrix_world.copy()
 for name,color,roughness in [('MouthInterior',(.025,.006,.011,1),.9),('Tongue',(.42,.10,.14,1),.48)]:
  mat=bpy.data.materials.new(name);mat.diffuse_color=color;mat.use_nodes=True;bsdf=mat.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Base Color'].default_value=color;bsdf.inputs['Roughness'].default_value=roughness;data.materials.append(mat)
 for poly,index in zip(data.polygons,materials):poly.material_index=index;poly.use_smooth=True
 mouth.vertex_groups.new(name=face.name).add(list(range(len(vertices))),1,'REPLACE');mod=mouth.modifiers.new('Face skin','ARMATURE');mod.object=arm;mouth.parent=arm;mouth.matrix_parent_inverse=arm.matrix_world.inverted()
 mouth.shape_key_add(name='Basis');jaw=mouth.shape_key_add(name='JawOpen');smile=mouth.shape_key_add(name='Smile')
 for index,v in enumerate(data.vertices):
  row=index//(cols+1);u=-1+2*(index%(cols+1))/cols;arc=math.sqrt(max(0,1-u*u));t=row/rows
  jaw.data[index].co=v.co+Vector((.001*t,0,-opening*t*arc))
  smile.data[index].co=v.co+Vector((0,(v.co.y-y)*.08,.003*abs(u)))
 meshes.append(mouth)
 return {'deformedChinVertices':changed,'mouthLiningVertices':len(vertices),'landmarks':list(profile)}
def mouth_values(clip,cycle):
 e=math.sin(math.pi*cycle)**2
 if clip=='Sleepy':return (.88*e**3,.02*e)
 if clip=='Playful':return (e*(.38+.22*math.sin(4*math.pi*cycle)**2),.65*e)
 if clip=='Greet':return (.40*e,.8*e)
 if clip=='Curious':return (.16*e,.18*e)
 if clip=='Trot':return (.16+.07*math.sin(4*math.pi*cycle)**2,.20)
 if clip=='Stretch':return (.28*e,.12*e)
 return (0,.03*e if clip=='Idle' else 0)
