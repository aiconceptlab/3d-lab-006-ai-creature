# Living companion animations

The included Nova, Mochi and Ember each contain eleven baked Blender clips. The source rig is a reviewed Tripo quadruped, and the app uses the same GLB in studio and room mode.

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
| Sleepy | 6 s | Relaxed lowered torso and repeated head nods |
| Greet | 4 s | Raised front-left paw, lifted chin and tilted head |
| Stretch | 5 s | Both front paws extend, with a lowered chest |

The character travels at 0.10 m/s while exploring/following and 0.20 m/s while chasing. Playback cadence is calibrated from the normalised GLB's actual stance-paw motion rather than a fixed speed for every mesh. Transitions blend for 0.35 seconds; walk/trot preserve their normalised loop phase. Studio and room mixers are independent.

## Moods and reactions

The four mood buttons request authored body language. Say hello raises a paw; Stretch extends both front paws; Give affection requests an attentive tilt. These are performed moods, not inferred or measured feelings. Room mode has Hello, Play and Sleepy buttons and shares the same expression controller. Idle companions vary their reactions according to personality; long exploration also pauses periodically to react; travelling retains its walk/trot. A manual reaction cancels travel and holds for a complete 4–6 second clip. The next AI navigation decision waits until the reaction finishes, and stale in-flight decisions cannot override it. Moving, throwing a ball or resting cancels the reaction immediately.

The upper neck and weighted face are animated separately from the chest. Ear branches are identified under the face joint; the chest/neck chain is not incorrectly treated as an ear. Clips enter and return smoothly to neutral; transitions blend between clips. Model URLs carry a release version so old browser caches and saved pets load the updated GLB.

## Rig repair and foot placement

Ember's original rear-left leg had a single misplaced bone and no lower chain. Blender mirrors the intact right chain, adds the missing three joints and redistributes the 3,425 affected vertex weights across the nearest segments. The geometry and PBR texture content remain the original generated character.

Two-segment analytical IK sets a planted stance and smooth lifted swing for every leg. A fixed anatomical pole direction prevents knees flipping when crossing a nearly straight rest axis. The torso stays slightly flexed during locomotion to avoid extension singularities. Paw orientation is counter-rotated to remain level. Small body, head and ear movements add secondary motion; Ember also has independent tail joints and tail motion. Nova and Mochi's tails currently follow their torsos. These results are baked into GLB tracks; the browser does not run Blender or an IK solver.

## Recreate or refine

Install Blender 4.5 LTS from blender.org. No MCP server is needed: these scripts use Blender's built-in Python API. Import the bundled GLB in Blender to refine its mesh or clips interactively. For the authoring script, use an **original** Tripo rigged quadruped GLB with its limb naming intact (for example `.data/mochi/walk.glb` from the generation workflow). Original included vendor outputs are also recoverable from the repository's earlier Git history.

```powershell
& 'C:/path/to/blender.exe' --background --python scripts/animate-companions.py -- input-walk.glb output-living.glb artifacts/animation-report.json
```

This writes the GLB, a JSON report and an editable .blend beside the report. Review from the side and rear before replacing an asset. The three bundled models were authored in Blender 4.5.9. The exporter keeps up to four normalised skin influences per vertex.

## Checks

`npm run test:animations` loads the actual bundled GLBs on the CPU (textures omitted for the audit only). It verifies complete three-joint chains for all four legs, more than 15 actual paw vertices per leg with substantial skin weights, measurable deformation in Walk/Trot, stationary paw vertices within 2 mm (excluding the deliberately lifted/extended paws), seamless loop endpoints, deformed face movement and head rotation in every expressive clip, expected runtime clip selection, and bounded frame-to-frame rotations through transitions and repeated cycles. This runs inside `npm run check` and GitHub CI. Reports go to ignored artifacts/animation-audit.json.

`npm run review:animations` renders the actual textured models from a close three-quarter view and records all six expressive runtime clips for every pet. Install its optional recorder with `npx playwright install ffmpeg`. A contact sheet, pose frames and WebM are written under ignored artifacts/animation-review. `npm run test:generated` verifies the production UI, eleven clip names, movement, framing, persistence, model migration and exact downloads. `npm run test:sdk` checks the real room engine using synthetic camera input.

## Practical limits

These are authored stylised gaits, not live motion capture, ground-contact physics or muscle simulation. Rest remains standing; it is not a sit or lie-down animation. Emotion is conveyed through authored head, ear and body poses. Generated characters have no eyelid or mouth rig, so they do not yet blink, close their eyes or lip-sync. Surface fur is sculpted/textured. The exporter preserves the source geometry's limitations, and a new arbitrary model still needs rig/weight review before this authoring script is appropriate. The runtime rejects detected incomplete quadruped chains rather than silently playing a partial gait. Physical mobile tracking still needs testing on an actual phone.
