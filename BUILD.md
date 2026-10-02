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

For camera room mode use an HTTPS tunnel/proxy on this computer. Forward the HTTPS origin to http://127.0.0.1:3019. Preserve the public Host header and set X-Forwarded-Proto=https. Do not disable browser certificate warnings. A self-signed URL can fail camera access.

Set ACCESS_CODE to a long unpredictable value and restart **before** sharing a live-AI URL. Provider actions on non-localhost origins require the access code; preview and local behaviour remain usable. Plain HTTP on a LAN does not provide phone camera access. Production should strip untrusted forwarded headers and provide HTTPS, compression and a durable DATA_DIR.

Open the link directly in Safari (iPhone) or Chrome (Android), unlock, then tap Bring into my room. Allow camera/device motion if the browser requests it. Point at a textured, well-lit floor, move slowly, then tap to place the pet. Use the controls to throw a virtual ball or follow the phone. Tap Obstacle then mark an exclusion. Rescan resets floor placement. Exit closes the camera stream.

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
