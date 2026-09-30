# Build and run

## 1. Install

Install Node 24 LTS from nodejs.org. In this folder run `npm ci`, copy `.env.example` to `.env`, then run `npm run build` and `npm start`. Development uses `npm run dev`. Dependencies are pinned in package-lock.json.

The build copies the unchanged 8th Wall binary from its npm package and MediaPipe's runtime into static assets. The included EfficientDet model is verified by SHA-256 before copying. No vendor credentials are compiled into browser assets.

## 2. Enable live creation

Set TYPESAFE_API_KEY to an official TypeSafe API key. Jev is a TypeSafe model; a key from another Jev-branded site cannot authenticate to api.typesafe.ai. Set JEV_MODEL=jev-latest. Restart after saving environment changes. Run `npm run test:live` with the app running.

If creation says “could not authenticate,” check the issuer and key/account status. Do not paste the key into chat or commit it. A configured key is not proof of successful authentication.

## 3. Share with a phone

Keep HOST=127.0.0.1 when an HTTPS tunnel/proxy runs on this same computer. Forward the HTTPS origin to http://127.0.0.1:3019. Preserve the public Host header and set X-Forwarded-Proto=https. Do not disable browser certificate warnings. A self-signed URL can fail camera access.

Set ACCESS_CODE to a long unpredictable value and restart **before** sharing a live-AI URL. Public requests with a provider key and no access code are refused. For a LAN bind use HOST=0.0.0.0 only with ACCESS_CODE set; plain HTTP on a LAN still does not provide phone camera access. Production should strip untrusted forwarded headers and provide HTTPS, compression and a durable DATA_DIR.

Open the link directly in Safari (iPhone) or Chrome (Android), unlock, then tap Bring into my room. Allow camera/device motion if the browser requests it. Point at a textured, well-lit floor, move slowly, then tap to place the pet. Use the controls to throw a virtual ball or follow the phone. Tap Obstacle then mark an exclusion. Rescan resets floor placement. Exit closes the camera stream.

The distributed engine downloads about 30 MB for room mode on first use. Optional local perception loads additional WASM/model assets only when enabled. A browser/phone that cannot load them can still use the 3D preview.

## 4. Verification

`npm run check` runs unit/contract/security checks and the production build. `npm run test:browser` launches a separate key-free server, checks desktop/mobile layouts, local creation, persistence, movement, GLB animations and real local detector inference. It uses Edge by default; install a supported Playwright Chromium or set BROWSER_CHANNEL=chrome if needed. npm run test:sdk also loads the real tracking binary with a fake camera and simulated orientation, places the pet and verifies camera cleanup. That harness is **not physical SLAM**.

Use the physical-device checklist in docs/QA.md before announcing the room experience as tested on a particular phone.

## 5. Deployment

This is a Node app, not just a static HTML upload. Run `npm ci --include=dev`, `npm run build` then `npm start`. Supply environment variables through the host's secret manager; keep DATA_DIR outside the public web root and durable between restarts. A single Node instance is the intended POC scale. Add host-level abuse protection before removing the access code or scaling publicly. .env, .data, node_modules and dist are excluded from Git.

## 6. Blender

Blender is not required or used by the primary creator. Its models are built in Three.js and can be downloaded as animated GLB. You may import a GLB into Blender for editing, but no Blender MCP connection is required to run this release. Do not claim Blender generated these pets.
