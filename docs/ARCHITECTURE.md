# The implemented loop

`description → Jev choices → validated recipe → procedural geometry → animated companion`

Jev chooses from an enumerated design space. It never emits executable code, arbitrary geometry, file paths or renderer commands. The same recipe builder runs in preview and room mode. It is deliberately limited to four-legged fox, cat and bunny characters.

`game state → allowed behaviours → Jev choice → motion controller → next game state`

State contains energy, current action age, virtual-ball and follow flags, tracking validity, personality, coarse optional person visibility and phone distance in game coordinates. Behaviour options are filtered before Jev sees them. Returned distributions are validated, shown as model probabilities (not animal emotion measurements), and stale responses are ignored after manual actions, design changes or tracking loss. Low energy and unsafe routes remain enforced locally even if the model is unavailable.

The controller uses a small bounded 4-neighbour path grid with segment checks against exclusion rectangles. It knows no room mesh. 8th Wall supplies camera pose/tracking; placement intersects a camera ray with its floor plane. A virtual ball and pet share that coordinate frame. Loss of tracking pauses motion rather than inventing a position.

Optional person detection: MediaPipe EfficientDet in a classic worker, one 320 px frame about every 1.25 seconds. Camera pixels never enter Jev calls. Detection merely affects “look” preference; no person identity, measured distance or obstacle reconstruction is inferred.

Sessions use signed, 24-hour cookies and a persisted signing secret under .data. Changing ACCESS_CODE invalidates existing cookies. Generated jobs are owner-bound and saved before paid requests. Ambiguous paid submissions are never automatically replayed. This is a single-instance POC, with in-memory request limits and local files.

## Generated Nova asset

The included Tripo assets follow image reference → textured mesh → quadruped rig → Blender rig repair and animation baking. SkeletonUtils creates an independent rig for Studio and RoomSession; geometry/materials are cloned and disposed per view, and immutable textures are shared through the asset cache. The importer validates skinning, animation, detected quadruped limb chains and triangle limits before activating the pet. It updates bind matrices before measuring the grounded pivot and normalises height to 0.55 metres. This avoids floor clipping from a translated armature. Idle, Walk, Trot, Look and Rest use 0.22-second blends; walk/trot preserve normalised loop phase and calibrate cadence from normalised stance-paw travel. The motion controller supplies 0.10 m/s exploration and 0.20 m/s chase. Custom compatible vendor rigs with only a walk retain the legacy path. See ANIMATION.md for authoring and actual mesh-deformation checks.

The three included presets select their reviewed generated models. Exact matching saved/local preset designs also reuse those models. Runtime source textures are capped at 2048 pixels before entering the shared asset cache. Each view still owns its skeleton, geometry and materials. Default startup binds to all IPv4 interfaces and prints private LAN addresses. Without an access code, non-localhost clients can use the included pets and local rules, but cannot invoke configured paid providers. The localhost exemption checks both Host and the connection peer.
