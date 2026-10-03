# AI Concept Lab // 3D LAB // 006 — AI Creature

Describe a tiny companion. Meet it in animated 3D. Open the same website on a supported phone to place it on a tracked floor.

![Nova concept artwork](public/nova-concept.png)

*The artwork above is the visual direction. Nova, Mochi and Ember are real Tripo-generated, textured and rigged 3D characters. Its fur uses sculpted geometry and textures rather than cinematic strand rendering. Custom key-free designs use explicitly labelled procedural geometry.*

## Run it

Requires Node.js 22.13 or newer; Node 24 LTS recommended.

```sh
npm ci
cp .env.example .env
npm run build
npm start
```

On Windows use `Copy-Item .env.example .env` instead of `cp`. Open http://127.0.0.1:3019. It works without provider keys. The included pets are detailed generated assets; custom local designs are clearly labelled demos. By default the server binds to the LAN and prints your local and LAN addresses. Open the printed LAN URL on another device connected to the same network. Plain HTTP supports the preview and controls; camera room mode requires HTTPS. Development: `npm run dev`. For a phone connection timeout on Windows, the optional `npm run lan:windows` helper is run from an Administrator PowerShell while the app is running. It permits only the running Node executable, TCP 3019, private networks and the local subnet; see [BUILD.md](BUILD.md).

## What works

- Fox, cat and bunny companions: coat, eyes, luminous accents, ears, tail, body build and personality.
- Detailed Nova, Mochi and Ember: separate textured, rigged assets with thirteen Blender-authored clips with pelvis/chest weight shifts, head reactions and animated jaws. Each model runs in the preview and room camera with independent animation state. See [asset details](docs/COMPANION-ASSETS.md) and [animation workflow](docs/ANIMATION.md).
- Custom detailed creation uses a premium character reference, approval before the paid 3D build, detailed PBR mesh and a local Blender pass with the full 13-clip animation set. New faces receive conservative jaw morphs flagged for visual review.
- Camera orbit never steers a stationary pet. Navigation uses animated left/right pivot steps; Follow explicitly follows the phone.
- Jev interprets a description into eight validated choices. Trusted geometry creates and animates the result. Without a key, deterministic local rules are explicitly labelled.
- Included pets use a four-beat walk, diagonal trot, idle breathing, curious head turns and a calmer standing rest, with blended transitions and speed-matched cadence. All four paws deform and move. Simple procedural designs also blink; generated meshes currently have no facial blink rig. All pets support virtual fetch, phone following, simulated energy and manually marked obstacle zones.
- Curious, playful, shy and sleepy body language; greeting paw, affection and stretch reactions. Complete reactions are held before the next AI decision, in the preview and room.
- Saved designs on the current browser; animated GLB and design JSON downloads.
- Mobile camera view using the distributed 8th Wall engine. Floor placement, tracking-loss pause, recenter and camera cleanup.
- Optional local person detection, enabled by “Notice people.” Camera frames stay on the device; only a visibility boolean goes to Jev. This is not identity recognition or distance measurement.
- Server-held credentials, signed sessions, access-code protection and request limits.

## Connect Jev

Choose the provider that issued your key. For [TypeSafe](https://console.typesafe.ai), use `JEV_PROVIDER=typesafe` and `TYPESAFE_API_KEY`. For the independent [Jev AI service](https://jev-ai.pro/jev-api), use `JEV_PROVIDER=jev-ai` and `JEV_AI_API_KEY`. The server sends credentials only to that provider's fixed HTTPS endpoint. Keys and balances are separate; changing only the key is insufficient. Restart after saving .env.

```dotenv
JEV_PROVIDER=typesafe
TYPESAFE_API_KEY=your_local_key
# Alternative: JEV_PROVIDER=jev-ai with JEV_AI_API_KEY=your_local_key
JEV_MODEL=jev-latest
REQUIRE_JEV=0
```

Creation errors are shown explicitly. “Try the local demo” creates a clearly labelled pet without calling Jev, even while a configured key is unavailable. Behaviour requests can use labelled local fallback during an outage; set `REQUIRE_JEV=1` to disable that fallback. The browser asks for a decision at most once every three seconds while visible. Closing or hiding the page stops new requests.

## Try room mode on your phone

After building, run `npm run mobile`. It starts or reuses the workshop, downloads a checksum-verified official Cloudflare connector and creates a temporary HTTPS phone link. No Cloudflare account, domain, administrator permission or router changes are needed. Keep the terminal and computer running.

On your computer, meet the pet you want and click **Send this pet to my phone**. Scan its QR to open that exact model, including a custom generated pet and all its animations, in a separate phone session. Open directly in Safari or Chrome on iPhone, or Chrome on Android. Tap **Bring into my room**, allow camera/motion, scan a well-lit floor and tap to place. Camera starts only after your tap; physical tracking support still needs checking on your phone.

The phone link exposes only the read-only play listener on loopback port 3020. It cannot log into the workshop, call Jev/Tripo, see other jobs or spend credits, even with an access code. Phone behaviour runs locally. A private link lasts one hour; a new link replaces the previous one. **Stop sharing** revokes future loads; an already downloaded model cannot be remotely erased. Existing workshop ownership is preserved. See [mobile setup and stable hosting](docs/MOBILE.md).

Plain HTTP LAN addresses support preview but cannot enable the camera, including in iPhone Chrome. Quick Tunnels are temporary demo links; for a stable deployment route your HTTPS play hostname to MOBILE_PORT and keep the workshop private or protected by ACCESS_CODE. Desktop retains creation and 3D preview.

The pet occupies a small virtual play area around the placement point. Mark exclusions yourself; the demo does not reconstruct furniture or understand the entire room. Follow means **follow the phone camera**. Fetch uses a **virtual ball**. Detection does not give the pet a physical body or real-world contact physics.

## Optional image-to-3D experiment

The included Nova, Mochi and Ember need no Tripo account or credits to play. Connect a Tripo developer API key and install Blender 4.5 LTS or newer. Set `BLENDER_PATH` in `.env` and restart. Create my companion starts a premium character reference for a new description; approve it before mesh generation, quadruped rigging and the local animation finishing pass. Included sample descriptions reuse their models without paid generation. Finished compatible rigs can enter room mode; raw vendor walks are not offered as completed companions. Missing Blender blocks paid creation. Local finishing failures can be retried without provider credits. The original and finished GLBs are saved privately in DATA_DIR and finished assets require the owning session. Nova's complete live pipeline was checked on 1 October 2026 and consumed 75 API credits in one pass. Other generated creatures still require visual review; one good Nova is not a guarantee of quality for every prompt. See [docs/TRIPO.md](docs/TRIPO.md) and [Nova provenance](docs/NOVA-ASSET.md).

The creator shows a persistent generation card with the pet name, current stage and provider progress when available. Refreshing restores the pending request and opens its artwork for approval. Create reopens an existing request instead of spending more credits. Interrupted progress checks reconnect automatically. The owning session can recover its latest request even if browser job storage was lost.

## Check it

```sh
npm run check
npm run test:animations
npm run test:browser
npm run test:generated
npm run test:generation
npm run test:mobile
npm run test:sdk
npm run test:live
```

Browser checks use installed Microsoft Edge, or `BROWSER_CHANNEL=chrome`. The live check requires a running local server and a valid key for the selected Jev provider. `npm run check` includes CPU checks of all four deformed paws in the actual bundled GLBs. `npm run review:animations` records a close expression review (requires Playwright FFmpeg: `npx playwright install ffmpeg`). See [docs/QA.md](docs/QA.md) for what was and was not verified.

## Project map

- `server.mjs` — HTTP, access code, sessions, limits and static hosting.
- `server/jev.mjs` — current TypeSafe typed-choice adapter.
- `shared/` — validated designs, movement and route finding.
- `src/` — frontend, procedural companion, preview, room tracking and local perception.
- `public/` — concept artwork, pinned vision model and licence notices.
- `tests/`, `scripts/` — contract, security, movement, browser and live checks.
- `marketing/` — 4:5 Instagram carousel, caption, source layout and posting notes.

## Licence

Application source is MIT. **8th Wall's engine is separately licensed by Niantic Spatial**, not covered by MIT. Its agreement restricts paid products whose value substantially derives from the engine. This free POC retains the engine unchanged and its notices. Read [the included XR Engine Agreement](public/licenses/8thwall.txt) before adapting it into a paid product. Third-party notices: [docs/THIRD-PARTY.md](docs/THIRD-PARTY.md).
