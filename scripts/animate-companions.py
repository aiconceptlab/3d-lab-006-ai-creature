"""Author and bake living companion clips in Blender 4.5; no provider calls.

Input is an original Tripo rigged GLB. Output keeps its geometry and PBR maps.
Repairs Ember's incomplete rear leg, then solves four planted/swinging paws.
Run: blender -b --python scripts/animate-companions.py -- input.glb output.glb report.json
"""
import bpy, math, json, sys
from pathlib import Path
from mathutils import Vector, Matrix, Quaternion

source, destination, report_path = map(Path, sys.argv[sys.argv.index("--") + 1:])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source.resolve()))
scene = bpy.context.scene
arm = next(o for o in scene.objects if o.type == "ARMATURE")
meshes = [o for o in scene.objects if o.type == "MESH"]
for o in scene.objects:
    if o.animation_data:
        o.animation_data_clear()
for action in list(bpy.data.actions):
    bpy.data.actions.remove(action)
bpy.context.view_layer.objects.active = arm
arm.select_set(True)
repaired = []

# Tripo's Ember rig has one rear leg represented by a single misplaced bone.
prefix = "tripo::1_Left_Limb_"
if prefix + "1" not in arm.data.bones:
    centre = arm.data.bones["tripo::Spine_0"].head_local.y
    right = [arm.data.bones["tripo::1_Right_Limb_" + str(i)] for i in range(4)]
    coordinates = [(b.head_local.copy(), b.tail_local.copy(), b.roll if hasattr(b, "roll") else 0) for b in right]
    bpy.ops.object.mode_set(mode="EDIT")
    previous = arm.data.edit_bones["tripo::Root"]
    for i, (head, tail, _) in enumerate(coordinates):
        head.y = 2 * centre - head.y
        tail.y = 2 * centre - tail.y
        name = prefix + str(i)
        bone = arm.data.edit_bones.get(name) or arm.data.edit_bones.new(name)
        bone.head, bone.tail, bone.parent = head, tail, previous
        bone.use_connect = i > 0
        previous = bone
    bpy.ops.object.mode_set(mode="OBJECT")
    segments = [(arm.data.bones[prefix + str(i)].head_local.copy(), arm.data.bones[prefix + str(i)].tail_local.copy()) for i in range(4)]
    for mesh in meshes:
        original = mesh.vertex_groups.get(prefix + "0")
        if original is None:
            continue
        groups = [mesh.vertex_groups.get(prefix + str(i)) or mesh.vertex_groups.new(name=prefix + str(i)) for i in range(4)]
        transform = arm.matrix_world.inverted() @ mesh.matrix_world
        weights = [(v.index, next((g.weight for g in v.groups if g.group == original.index), 0)) for v in mesh.data.vertices]
        for index, weight in weights:
            if weight <= 0:
                continue
            p = transform @ mesh.data.vertices[index].co
            proximity = []
            for a, b in segments:
                line = b - a
                t = max(0, min(1, (p - a).dot(line) / line.length_squared))
                proximity.append(1 / ((p - (a + line * t)).length_squared + .00012) ** 2)
            # Limit skin influences and blend across the new knee/hock joints.
            nearest = sorted(range(4), key=lambda i: proximity[i], reverse=True)[:2]
            total = sum(proximity[i] for i in nearest)
            for i, group in enumerate(groups):
                if i in nearest:
                    group.add([index], weight * proximity[i] / total, "REPLACE")
                elif i == 0:
                    group.remove([index])
        repaired.append({"mesh": mesh.name, "weightedVertices": sum(w > 0 for _, w in weights)})
    bpy.context.view_layer.update()

bones = arm.data.bones
spines = [b.name for b in bones if "Spine_" in b.name]
forward = bones[spines[-1]].head_local - bones[spines[0]].head_local
forward.z = 0
forward.normalize()
up = Vector((0, 0, 1))
side = up.cross(forward).normalized()
root_name = "tripo::Root"
legs = {}
for family in [0, 1]:
    for handedness in ["Left", "Right"]:
        key = str(family) + "_" + handedness
        names = ["tripo::" + key + "_Limb_" + str(i) for i in range(3)]
        if not all(n in bones for n in names):
            raise RuntimeError("Incomplete leg: " + key)
        legs[key] = {
            "names": names,
            "hip": bones[names[0]].head_local.copy(),
            "knee": bones[names[1]].head_local.copy(),
            "ankle": bones[names[2]].head_local.copy(),
            "lengths": ((bones[names[1]].head_local - bones[names[0]].head_local).length,
                        (bones[names[2]].head_local - bones[names[1]].head_local).length),
        }
        leg = legs[key]
        rest_axis = (leg["ankle"] - leg["hip"]).normalized()
        pole = leg["knee"] - leg["hip"]
        pole -= rest_axis * pole.dot(rest_axis)
        # Preserve the anatomical bend side even when a nearly straight leg
        # crosses its rest axis. Deriving it afresh from the target can flip
        # the knee by 180 degrees between adjacent frames.
        leg["pole"] = pole.normalized() if pole.length > .01 * sum(leg["lengths"]) else forward * (-1 if family == 0 else 1)
rest_matrices = {b.name: b.matrix_local.copy() for b in bones}
rest_directions = {b.name: (b.tail_local - b.head_local).normalized() for b in bones}
ear_names = [b.name for b in bones if "Head_" in b.name and b.name != "tripo::Head_0"]
tails = [b.name for b in bones if "Tail_" in b.name]
for p in arm.pose.bones:
    p.rotation_mode = "QUATERNION"

def rotate(name, axis, angle):
    arm.pose.bones[name].rotation_quaternion = Quaternion(Vector(axis), angle)

def aim_bone(name, head, tail):
    q = rest_directions[name].rotation_difference((tail - head).normalized())
    rotation = q @ rest_matrices[name].to_quaternion()
    arm.pose.bones[name].matrix = Matrix.Translation(head) @ rotation.to_matrix().to_4x4()
    bpy.context.view_layer.update()

def leg_pose(leg, target):
    first, second, foot = leg["names"]
    hip = arm.pose.bones[first].head.copy()
    a, b = leg["lengths"]
    direction = target - hip
    distance = max(abs(a - b) + .0001, min(direction.length, (a + b) * .995))
    direction.normalize()
    bend = leg["pole"].copy()
    bend -= direction * bend.dot(direction)
    if bend.length < .0001:
        bend = -forward
    bend.normalize()
    cosine = max(-1, min(1, (a * a + distance * distance - b * b) / (2 * a * distance)))
    knee = hip + direction * (a * cosine) + bend * (a * math.sqrt(max(0, 1 - cosine * cosine)))
    ankle = hip + direction * distance
    aim_bone(first, hip, knee)
    aim_bone(second, knee, ankle)
    # Counter-rotate the paw to keep it level during contact. The world
    # controller supplies forward travel and calibrates cadence from the GLB.
    matrix = rest_matrices[foot].copy()
    matrix.translation = ankle
    arm.pose.bones[foot].matrix = matrix
    bpy.context.view_layer.update()
    return ankle

fps = 30
scene.render.fps = fps
clips = [("Idle", 4, 0), ("Walk", 1.6, .26), ("Trot", .85, .65), ("Look", 4, 0), ("Rest", 5, 0)]
common_stride = min(sum(leg["lengths"]) for leg in legs.values()) * .40
reports = []
actions = []
for clip_name, duration, speed in clips:
    frames = round(duration * fps)
    action = bpy.data.actions.new(clip_name)
    arm.animation_data_create()
    arm.animation_data.action = action
    action.use_fake_user = True
    actions.append(action)
    positions = {key: [] for key in legs}
    stance_errors = []
    for frame in range(frames + 1):
        scene.frame_set(frame + 1)
        t = frame / fps
        cycle = frame / frames
        angle = 2 * math.pi * cycle
        for p in arm.pose.bones:
            p.matrix_basis.identity()
        breathing = math.sin(2 * math.pi * cycle)
        root_matrix = rest_matrices[root_name].copy()
        root_matrix.translation += up * (.0018 * breathing - (.022 if speed else .003))
        arm.pose.bones[root_name].matrix = root_matrix
        for i, name in enumerate(spines):
            rotate(name, (1, 0, 0), .008 * math.sin(angle + i * .5))
        head_turn = (.12 if clip_name == "Look" else .015 if clip_name == "Rest" else .035) * math.sin(angle)
        head_axis = rest_matrices["tripo::Head_0"].to_quaternion().inverted() @ up
        rotate("tripo::Head_0", head_axis, head_turn)
        if clip_name == "Rest":
            pitch_axis = rest_matrices["tripo::Head_0"].to_quaternion().inverted() @ side
            arm.pose.bones["tripo::Head_0"].rotation_quaternion @= Quaternion(pitch_axis, -.065 + .012 * breathing)
        for i, name in enumerate(ear_names):
            rotate(name, (1, 0, 0), .012 * math.sin(angle * 2 + i * 1.5))
        for i, name in enumerate(tails):
            rotate(name, (1, 0, 0), (.07 if clip_name == "Trot" else .015 if clip_name == "Rest" else .035) * math.sin(angle + i * .6))
        if speed:
            root_matrix.translation += up * .003 * (1 - math.cos(angle * 2))
            arm.pose.bones[root_name].matrix = root_matrix
        bpy.context.view_layer.update()
        for key, leg in legs.items():
            target = leg["ankle"].copy()
            if speed:
                # Four-beat walk; diagonal paired trot. Constant-velocity stance,
                # smooth swing and lift. Stride matches the app's world speed.
                phases = {"1_Left": 0, "0_Left": .25, "1_Right": .5, "0_Right": .75} if clip_name == "Walk" else {"0_Left": 0, "1_Right": 0, "0_Right": .5, "1_Left": .5}
                duty = .66 if clip_name == "Walk" else .52
                phase = (cycle + phases[key]) % 1
                stride = common_stride
                if phase < duty:
                    progress = phase / duty
                    target += forward * stride * (.5 - progress)
                else:
                    progress = (phase - duty) / (1 - duty)
                    smooth = progress - math.sin(2 * math.pi * progress) / (2 * math.pi)
                    target += forward * stride * (smooth - .5)
                    target.z += (.025 if clip_name == "Walk" else .045) * math.sin(math.pi * progress) ** 2
            actual = leg_pose(leg, target)
            positions[key].append(list(actual))
            if not speed:
                stance_errors.append((actual - target).length)
        for p in arm.pose.bones:
            p.keyframe_insert("location", frame=frame + 1, group=p.name)
            p.keyframe_insert("rotation_quaternion", frame=frame + 1, group=p.name)
    reports.append({"clip": clip_name, "duration": frames / fps, "pawExcursions": {k: max((Vector(v) - Vector(rows[0])).length for v in rows) for k, rows in positions.items()}, "idleContactError": max(stance_errors, default=0)})
    arm.animation_data.action = None

# Separate NLA tracks give portable named clips with no runtime IK dependency.
for action in actions:
    track = arm.animation_data.nla_tracks.new()
    track.name = action.name
    strip = track.strips.new(action.name, 1, action)
    track.mute = True
for p in arm.pose.bones:
    p.matrix_basis.identity()
scene.frame_set(1)
bpy.context.view_layer.update()
destination.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action="DESELECT")
arm.select_set(True)
for mesh in meshes:
    mesh.select_set(True)
bpy.context.view_layer.objects.active = arm
scene.frame_start = 1
scene.frame_end = 151
bpy.ops.export_scene.gltf(filepath=str(destination.resolve()), export_format="GLB", use_selection=True,
    export_animation_mode="NLA_TRACKS", export_force_sampling=True, export_frame_range=False,
    export_anim_slide_to_zero=True, export_skins=True, export_yup=True, export_extras=True)
report = {"source": source.name, "blender": bpy.app.version_string, "repairedRearLeg": repaired, "joints": len(bones), "strideRigUnits": common_stride, "clips": reports}
report_path.parent.mkdir(parents=True, exist_ok=True)
report_path.write_text(json.dumps(report, indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(report_path.with_suffix(".blend").resolve()))
print(json.dumps(report))
