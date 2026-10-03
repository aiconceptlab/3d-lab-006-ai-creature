# Build and run

## 1. Install

Install Node 24 LTS from nodejs.org. In this folder run `npm ci`, copy `.env.example` to `.env`, then run `npm run build` and `npm start`. Development uses `npm run dev`. Dependencies are pinned in package-lock.json.

The build copies the unchanged 8th Wall binary from its npm package and MediaPipe's runtime into static assets. The included EfficientDet model is verified by SHA-256 before copying. No vendor credentials are compiled into browser assets.

## 2. Enable live creation

Set JEV_PROVIDER=typesafe and TYPESAFE_API_KEY for an official console.typesafe.ai key. For a key from the independent jev-ai.pro service, set JEV_PROVIDER=jev-ai and JEV_AI_API_KEY instead. That selects https://jev-ai.pro/api/v1/systemone; its keys and balance cannot authenticate at api.typesafe.ai. Use JEV_MODEL=jev-latest. Restart after saving .env, then run `npm run test:live` with the app running. Provider connections refuse HTTP redirects.

If creation says “could not authenticate,” check the issuer and key/account status. Do not paste the key into chat or commit it. A configured key is not proof of successful authentication.

## 3. Share with a phone

The default HOST=0.0.0.0 binds to the LAN. Startup prints the Local URL and private IPv4 LAN URLs. Use the address for your active Ethernet/Wi-Fi adapter on another device connected to the same network. Set HOST=127.0.0.1 if you want a localhost-only server. If Windows asks about Node network access, allow your trusted private network. If another device cannot connect, check that its network is the same and that the firewall permits inbound TCP 3019 on the trusted private network.

On Windows, if the PC opens its LAN address but a phone on the same home network times out, Windows Firewall may be blocking incoming connections. Keep the app running, open a second PowerShell terminal **as Administrator**, change to this project and run `npm run lan:windows`. The helper finds the running Node executable and creates only a private-profile inbound TCP rule for port 3019 from LocalSubnet, with edge traversal blocked. It does not turn off the firewall, change network profiles, forward router ports or expose a public URL. Its result is stored privately in `.data/lan-firewall-result.json`. A phone connection still needs checking on the device; guest Wi-Fi isolation or a different network can also cause a timeout.

The included pets, local creation and play controls work on the LAN without keys or an access code. Unprotected LAN requests never invoke the configured providers. Set ACCESS_CODE and restart to share live provider actions.

For camera room mode use `npm run mobile`, then click **Send this pet to my phone** on the PC and scan its QR. The launcher tunnels only the protected play listener at http://127.0.0.1:3020. It transfers your current completed custom pet or included sample, with no provider calls or credentials on the phone. Do not tunnel workshop port 3019 for this flow. See [the complete cross-platform setup](docs/MOBILE.md).

ACCESS_CODE is unnecessary for the recommended read-only phone flow. If exposing a separate live-AI workshop URL, set a long unpredictable ACCESS_CODE first. Changing it invalidates existing workshop cookies. Production should strip untrusted forwarded headers and provide HTTPS, compression and a durable DATA_DIR. For a stable play URL, route your HTTPS proxy to MOBILE_PORT and set MOBILE_URL to that origin. Plain HTTP LAN addresses cannot use the phone camera.

Open the QR link directly in Safari or Chrome on iPhone, or Chrome on Android, then tap Bring into my room. Allow camera/device motion, point at a textured well-lit floor, move slowly and tap to place. Throw a virtual ball, follow the phone or mark obstacle exclusions. Rescan resets placement; Exit closes the camera stream. HTTPS enables permission requests but does not guarantee tracking on every phone.

The distributed engine downloads about 30 MB for room mode on first use. Optional local perception loads additional WASM/model assets only when enabled. A browser/phone that cannot load them can still use the 3D preview.

## 4. Verification

`npm run check` runs unit/contract/security checks and the production build. `npm run test:browser` launches a separate key-free server, checks desktop/mobile layouts, local creation, persistence, movement, GLB animations and real local detector inference. It uses Edge by default; install a supported Playwright Chromium or set BROWSER_CHANNEL=chrome if needed. npm run test:sdk also loads the real tracking binary with a fake camera and simulated orientation, places the pet and verifies camera cleanup. That harness is **not physical SLAM**.

Use the physical-device checklist in docs/QA.md before announcing the room experience as tested on a particular phone.

## 5. Deployment

This is a Node app, not just a static HTML upload. Run `npm ci --include=dev`, `npm run build` then `npm start`. Supply environment variables through the host's secret manager; keep DATA_DIR outside the public web root and durable between restarts. A single Node instance is the intended POC scale. Add host-level abuse protection before removing the access code or scaling publicly. .env, .data, node_modules and dist are excluded from Git.

## 6. Blender

The three companion meshes and original rigs were generated by Tripo. Blender 4.5.9 was used to repair Ember's incomplete left rear leg and bake Idle, Walk, Trot, Look and Rest for each model. The website itself runs without Blender installed. Both inspection and animation scripts use Blender's own Python interface; no Blender MCP connection is required.

To inspect your own generated mesh:

```powershell
& 'C:/path/to/blender.exe' --background --python scripts/inspect-nova.py -- public/models/nova-living.glb artifacts/nova-inspection
```

The script writes four renders, a geometry report and an editable inspection .blend file. You can also use Blender's File → Import → glTF 2.0 to inspect or refine the included assets manually. To bake animations onto an original Tripo GLB, follow [docs/ANIMATION.md](docs/ANIMATION.md). Custom local demos are built directly in Three.js. Detailed custom creation now requires Blender 4.5 LTS or newer on the Node server. Set BLENDER_PATH to its executable, restart and confirm the custom creation panel is enabled. The server downloads the original vendor walk privately and runs the same authoring scripts before offering a completed pet; it does not serve raw walking-only results. No Blender MCP connection is required: the server invokes Blender’s official Python interface directly. Only deploy this creation workflow on a host with Blender installed (not a static-only host).

## Updating the app

After pulling an update, run npm ci if dependencies changed, npm run build and restart npm start. Reload existing browser tabs: an already open tab continues executing its old JavaScript until refreshed. Included pets display a loading panel while the detailed mesh loads. The studio follows their movement so they stay in frame.
