"""Author and bake living companion clips in Blender 4.5; no provider calls.

Input is an original Tripo rigged GLB. Output preserves PBR maps and adds reviewed jaw morphs and mouth lining.
Repairs Ember's incomplete rear leg, then solves four planted/swinging paws.
Run: blender -b --python scripts/animate-companions.py -- input.glb output.glb report.json
"""
import bpy, math, json, sys
from pathlib import Path
from mathutils import Vector, Matrix, Quaternion
import importlib.util
spec = importlib.util.spec_from_file_location("facial_rig", Path(__file__).with_name("facial-rig.py"))
facial = importlib.util.module_from_spec(spec)
spec.loader.exec_module(facial)

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
# Head_0 is the chest/neck, Head_1 the neck, Head_2 the face.
# Only the high branches of Head_2 are ears (Ember has no separate ear rig).
ear_names = [b.name for b in bones["tripo::Head_2"].children]
tails = [b.name for b in bones if "Tail_" in b.name]
for p in arm.pose.bones:
    p.rotation_mode = "QUATERNION"

def rotate(name, axis, angle):
    arm.pose.bones[name].rotation_quaternion = Quaternion(Vector(axis), angle)

def anatomical_rotate(name, yaw=0, pitch=0, roll=0):
    basis = rest_matrices[name].to_quaternion().inverted()
    arm.pose.bones[name].rotation_quaternion = (Quaternion(basis @ up, yaw)
        @ Quaternion(basis @ side, pitch) @ Quaternion(basis @ forward, roll))

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

facial_report = facial.author_mouth(arm, meshes)
face_actions = {m.name: [] for m in meshes}

fps = 30
scene.render.fps = fps
clips = [("Idle", 4, 0), ("Walk", 1.6, .26), ("Trot", .85, .65), ("Look", 4, 0), ("Rest", 5, 0),
         ("Curious", 5, 0), ("Playful", 4, 0), ("Shy", 5, 0), ("Sleepy", 6, 0),
         ("Greet", 4, 0), ("Stretch", 5, 0)]
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
    for mesh in meshes:
        keys = mesh.data.shape_keys
        keys.animation_data_create()
        face_action = bpy.data.actions.new(clip_name + "_" + mesh.name + "_Face")
        keys.animation_data.action = face_action
        face_actions[mesh.name].append((clip_name, face_action))
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
        # Smooth entry, a held expressive middle, and a seamless neutral return.
        envelope = math.sin(math.pi * cycle) ** 2
        lower = {"Playful": .024, "Shy": .045, "Sleepy": .030, "Stretch": .018}.get(clip_name, 0) * envelope
        root_matrix = rest_matrices[root_name].copy()
        root_matrix.translation += up * (.0018 * breathing - (.032 if speed else .003) - lower)
        pelvis_roll = (.055 if clip_name == "Walk" else .035) * math.sin(angle) if speed else 0
        pelvis_pitch = .035 * math.cos(angle * 2) if speed else 0
        pelvis_yaw = .025 * math.sin(angle) if speed else 0
        if speed:
            rotation = Quaternion(up, pelvis_yaw) @ Quaternion(side, pelvis_pitch) @ Quaternion(forward, pelvis_roll)
            root_matrix = Matrix.Translation(root_matrix.translation) @ (rotation @ rest_matrices[root_name].to_quaternion()).to_matrix().to_4x4()
            root_matrix.translation += side * .004 * math.sin(angle) + up * .006 * (1 - math.cos(angle * 2))
        arm.pose.bones[root_name].matrix = root_matrix
        for i, name in enumerate(spines):
            anatomical_rotate(name, pitch=(.012 * math.sin(angle * 2 - i * .45) if speed else .008 * math.sin(angle + i * .5)),
                roll=-pelvis_roll * (.50 if i == 0 else .18), yaw=-pelvis_yaw * .28)
        anatomical_rotate("tripo::Head_0", pitch=.014 * math.sin(angle * 2 + .4) if speed else 0, roll=-pelvis_roll * .15)
        yaw = (.32 if clip_name == "Look" else .025) * math.sin(angle)
        pitch = .07 * envelope if clip_name == "Rest" else 0
        roll = 0
        if clip_name == "Curious":
            yaw = .24 * math.sin(angle)
            roll = .32 * envelope * math.sin(angle * .75 + .65)
            pitch = -.10 * envelope
        elif clip_name == "Playful":
            pitch = .20 * envelope
            roll = .12 * envelope * math.sin(angle * 2)
        elif clip_name == "Shy":
            yaw = -.28 * envelope
            pitch = .24 * envelope
            roll = -.14 * envelope
        elif clip_name == "Sleepy":
            pitch = envelope * (.28 + .09 * math.sin(angle * 2))
            roll = .08 * envelope
        elif clip_name == "Greet":
            yaw = -.12 * envelope
            pitch = -.16 * envelope
            roll = .18 * envelope
        elif clip_name == "Stretch":
            pitch = .16 * envelope
        if speed:
            # Generated heads look sideways in their neutral poses. Face the
            # anatomical body axis when travelling, with a stable gaze.
            yaw += math.atan2(forward.y, forward.x)
            pitch -= pelvis_pitch * .65
            roll -= pelvis_roll * .50
        anatomical_rotate("tripo::Head_1", yaw=yaw * .45, pitch=pitch * .45, roll=roll*.35)
        anatomical_rotate("tripo::Head_2", yaw=yaw * .55, pitch=pitch * .55, roll=roll*.65)
        if clip_name in {"Playful", "Stretch"}:
            for name in spines[1:]:
                anatomical_rotate(name, pitch=(.16 if clip_name == "Playful" else .10) * envelope / max(1, len(spines)-1))
        for i, name in enumerate(ear_names):
            anatomical_rotate(name, pitch=(.13 * envelope if clip_name in {"Shy", "Sleepy"} else .035 * math.sin(angle * 2 + i * 1.5)))
        for i, name in enumerate(tails):
            rotate(name, (1, 0, 0), (.07 if clip_name == "Trot" else .015 if clip_name == "Rest" else .035) * math.sin(angle + i * .6))
        bpy.context.view_layer.update()
        for key, leg in legs.items():
            target = leg["ankle"].copy()
            if clip_name == "Greet" and key == "0_Left":
                target += up * .085 * envelope + forward * .040 * envelope
            if clip_name == "Stretch" and key.startswith("0_"):
                target += forward * .055 * envelope
            if speed:
                # Four-beat walk; diagonal paired trot. Constant-velocity stance,
                # smooth swing and lift. Stride matches the app's world speed.
                phases = {"1_Left": 0, "0_Left": .25, "1_Right": .5, "0_Right": .75} if clip_name == "Walk" else {"0_Left": 0, "1_Right": 0, "0_Right": .5, "1_Left": .5}
                duty = .62 if clip_name == "Walk" else .48
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
        jaw, smile = facial.mouth_values(clip_name, cycle)
        for mesh in meshes:
            keys = mesh.data.shape_keys
            for name, value in [("JawOpen", jaw), ("Smile", smile)]:
                keys.key_blocks[name].value = value
                keys.key_blocks[name].keyframe_insert("value", frame=frame+1)
        for p in arm.pose.bones:
            p.keyframe_insert("location", frame=frame + 1, group=p.name)
            p.keyframe_insert("rotation_quaternion", frame=frame + 1, group=p.name)
    reports.append({"clip": clip_name, "duration": frames / fps, "pawExcursions": {k: max((Vector(v) - Vector(rows[0])).length for v in rows) for k, rows in positions.items()}, "idleContactError": max(stance_errors, default=0)})
    arm.animation_data.action = None
    for mesh in meshes:
        mesh.data.shape_keys.animation_data.action = None

# Separate NLA tracks give portable named clips with no runtime IK dependency.
for action in actions:
    track = arm.animation_data.nla_tracks.new()
    track.name = action.name
    strip = track.strips.new(action.name, 1, action)
    track.mute = True
for mesh in meshes:
    keys = mesh.data.shape_keys
    for clip_name, action in face_actions[mesh.name]:
        track = keys.animation_data.nla_tracks.new()
        track.name = clip_name
        track.strips.new(clip_name, 1, action)
        track.mute = True
    for key in keys.key_blocks:
        key.value = 0
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
report = {"source": source.name, "blender": bpy.app.version_string, "repairedRearLeg": repaired, "joints": len(bones), "facialRig": facial_report, "forwardRig": list(forward), "strideRigUnits": common_stride, "clips": reports}
report_path.parent.mkdir(parents=True, exist_ok=True)
report_path.write_text(json.dumps(report, indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(report_path.with_suffix(".blend").resolve()))
print(json.dumps(report))
