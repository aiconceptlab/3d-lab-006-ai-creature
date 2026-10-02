# Living companion animations

The included Nova, Mochi and Ember each contain thirteen baked Blender clips. The source rig is a reviewed Tripo quadruped, and the app uses the same GLB in studio and room mode.

| Clip | Source duration | Motion |
| --- | ---: | --- |
| Idle | 4 s | Gentle breathing and neck/ear movement; paws remain planted |
| Walk | 1.6 s | Four-beat sequence: rear left, front left, rear right, front right |
| Trot | 0.867 s | Diagonal pairs: front left/rear right, then front right/rear left |
| Look | 4 s | A deliberate left/right head scan |
| Rest | 5 s | Quieter standing rest, slightly lowered head and slower breathing |
| Curious | 5 s | Head scan and sideways tilt, with an attentive raised chin |
| Playful | 4 s | Lowered chest and bowed neck, inviting play |
| Shy | 5 s | Crouch, turned-away head and lowered ears where rigged |
| Sleepy | 6 s | Relaxed lowered torso, head nods and a slow yawn |
| Greet | 4 s | Raised front-left paw, lifted chin and tilted head |
| Stretch | 5 s | Both front paws extend, with a lowered chest |
| TurnLeft / TurnRight | 0.8 s | Four staggered pivot steps, lifted swing, planted counter-rotation and body weight shift |

The loader derives each character’s forward direction from its source spine rather than imposing the same yaw on every mesh. Idle, look and rest never turn the body to face the camera. Explicit Follow uses the phone position as a navigation target. Sharp navigation turns use left/right stepping clips before translation; travel fades in only within 20 degrees of the destination, preventing sideways skating. Cadence uses the forward component of stance motion, excluding lateral sway and vertical bob.

The character travels at 0.10 m/s while exploring/following and 0.20 m/s while chasing. Playback cadence is calibrated from the normalised GLB's actual stance-paw motion rather than a fixed speed for every mesh. Transitions blend for 0.35 seconds; walk/trot preserve their normalised loop phase. Studio and room mixers are independent.

## Moods and reactions

The four mood buttons request authored body language. Say hello raises a paw; Stretch extends both front paws; Give affection requests an attentive tilt. These are performed moods, not inferred or measured feelings. Room mode has Hello, Play and Sleepy buttons and shares the same expression controller. Idle companions vary their reactions according to personality; long exploration also pauses periodically to react; travelling retains its walk/trot. A manual reaction cancels travel and holds for a complete 4–6 second clip. The next AI navigation decision waits until the reaction finishes, and stale in-flight decisions cannot override it. Moving, throwing a ball or resting cancels the reaction immediately.

The upper neck and weighted face are animated separately from the chest. Ear branches are identified under the face joint; the chest/neck chain is not incorrectly treated as an ear. Clips enter and return smoothly to neutral; transitions blend between clips. Model URLs carry a release version so old browser caches and saved pets load the updated GLB.

## Rig repair and foot placement

Ember's original rear-left leg had a single misplaced bone and no lower chain. Blender mirrors the intact right chain, adds the missing three joints and redistributes the 3,425 affected vertex weights across the nearest segments. Original PBR textures are preserved; facial authoring additionally deforms the chin and adds a small mouth lining.

Two-segment analytical IK sets a planted stance and smooth lifted swing for every leg. A fixed anatomical pole direction prevents knees flipping when crossing a nearly straight rest axis. The torso stays slightly flexed during locomotion to avoid extension singularities. Paw orientation is counter-rotated to remain level. Pelvis roll, yaw and paired vertical/pitch motion are coupled to the gait phase. The chest counter-rotates, the head stabilises, and the travel gaze turns toward the anatomical forward axis. These moderate movements keep the spine supported rather than bending like rubber. Ember also has independent tail joints and tail motion. Nova and Mochi's tails currently follow their torsos. These results are baked into GLB tracks; the browser does not run Blender or an IK solver.

## Mouth animation

Every included pet has JawOpen and Smile shape keys on its actual face mesh. Reviewed landmarks keep the nose and upper muzzle still while the lower chin moves. A curved skinned dark lining with tongue colour follows the face joint and widens with the jaw. It is a stylised mouth lining rather than a fully modelled oral cavity. Playful and Greet open the mouth and lift its corners; Sleepy performs a slower yawn; Trot uses a restrained opening. Facial keys and skeleton tracks export into the same thirteen named GLB clips, so studio, camera room and downloads retain them. This is expression animation, not speech lip-sync.

`scripts/facial-rig.py` contains the reviewed landmarks for the three included source meshes. For a new arbitrary model, the script estimates a conservative bone-weighted chin deformation and flags reviewRequired in its report. It deliberately omits a guessed mouth lining. Review and add a landmark profile to get a precise lip opening and lining. Inspect yawns and greetings before sharing; unusual head/rig structures fail clearly rather than using another pet’s facial landmarks. The current faces deform 293 Nova, 173 Mochi and 313 Ember chin vertices; the lining adds 512 triangles per model. No generation credits were used for these edits.

## Recreate or refine

Install Blender 4.5 LTS from blender.org. No MCP server is needed: these scripts use Blender's built-in Python API. Import the bundled GLB in Blender to refine its mesh or clips interactively. For the authoring script, use an **original** Tripo rigged quadruped GLB with its limb naming intact (for example `.data/mochi/walk.glb` from the generation workflow). Original included vendor outputs are also recoverable from the repository's earlier Git history.

```powershell
& 'C:/path/to/blender.exe' --background --python scripts/animate-companions.py -- input-walk.glb output-living.glb artifacts/animation-report.json
```

This writes the GLB, a JSON report and an editable .blend beside the report. Review from the side and rear before replacing an asset. The three bundled models were authored in Blender 4.5.9. The exporter keeps up to four normalised skin influences per vertex.

## Checks

`npm run test:animations` loads the actual bundled GLBs on the CPU (textures omitted for the audit only). It verifies complete three-joint chains for all four legs, more than 15 actual paw vertices per leg with substantial skin weights, measurable deformation in Walk/Trot, stationary paw vertices within 2 mm (excluding the deliberately lifted/extended paws), seamless loop endpoints, deformed face movement and head rotation in every expressive clip, pelvis rotation, forward alignment, stance travel matching playback cadence, real jaw deformation and changing seamless mouth keys, expected runtime clip selection, and bounded frame-to-frame rotations through transitions and repeated cycles. This runs inside `npm run check` and GitHub CI. Reports go to ignored artifacts/animation-audit.json.

`npm run review:animations` renders the actual textured models from a close three-quarter view and records both travelling gaits and all six expressive runtime clips for every pet. Install its optional recorder with `npx playwright install ffmpeg`. A contact sheet, pose frames and WebM are written under ignored artifacts/animation-review. `npm run test:generated` verifies the production UI, thirteen clip names, movement, framing, persistence, model migration and exact downloads. `npm run test:sdk` checks the real room engine using synthetic camera input.

## Practical limits

These are authored stylised gaits, not live motion capture, ground-contact physics or muscle simulation. Rest remains standing; it is not a sit or lie-down animation. Emotion is conveyed through authored head, ear and body poses. The included pets have jaw and smile controls; eyelids remain unrigged, so they do not blink or close their eyes. They do not lip-sync speech. Surface fur is sculpted/textured. The exporter preserves the source geometry's limitations, and a new arbitrary model still needs rig/weight review before this authoring script is appropriate. The runtime rejects detected incomplete quadruped chains rather than silently playing a partial gait. Physical mobile tracking still needs testing on an actual phone.

## Animation references

The gait timing and restrained pelvis/chest treatment are informed by primary quadruped kinematics research: [Fischer, Lehmann & Andrada (2018)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6242825/) and [three-dimensional pelvis and lumbar movements in walking/trotting dogs (2016)](https://www.sciencedirect.com/science/article/pii/S1090023315005407). These stylised pets are not a reconstruction of those experiments or species-specific motion capture. Weight shift and overlapping action follow [Blender Studio’s animation exercise](https://studio.blender.org/training/animation-fundamentals/5d69b398c4769bb8cceb0709/). Facial deformation uses [Blender shape keys](https://docs.blender.org/manual/en/4.5/animation/shape_keys/introduction.html).

## Automatic server finishing

The same script is now part of custom Tripo generation, not a separate operator step. Install Blender on the server and set BLENDER_PATH. Models keep their PBR textures and receive all 13 clips, independent mixers and the same lighting as the included pets. Original models, finished assets and reports remain private. The CPU validator rejects missing clips, jaw morphs and external asset resources. The worker runs one Blender process at a time, bounds downloads and execution time, and passes filenames as arguments without a shell. Local retries never call the paid vendor pipeline again.

Run `npm run test:custom` with BLENDER_PATH and CUSTOM_TEST_SOURCE pointing to an original Tripo quadruped walk GLB. This drives the production UI through reference approval, actual Blender authoring, unknown facial calibration, animated turns, camera independence, download and save/reload. Provider replies reuse the source model and no vendor credits are used. The default local source path is .data/nova/walk.glb; do not use a finished GLB with existing mouth geometry as input.
