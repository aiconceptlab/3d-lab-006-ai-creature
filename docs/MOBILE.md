# Secure phone play

## Clone and run

```sh
npm ci
cp .env.example .env
npm run build
npm run mobile
```

On Windows use `Copy-Item .env.example .env`. No provider keys are needed for the included pets. The launcher starts the app when needed, prints a temporary HTTPS URL and keeps it running until Ctrl+C. If npm start is already open, it reuses it; restart it once after a code update. Do not run two mobile launchers simultaneously.

Open the local workshop, choose or finish your pet, click **Send this pet to my phone**, and scan the QR with the phone camera. You can also copy its link. Tap **Bring into my room** in the phone browser and allow camera/motion. Your phone does not need the same Wi-Fi; the computer must be online. Public root links show samples; the private QR transfers your custom pet.

## Privacy and credits

The workshop listener owns generation jobs. A separate loopback mobile listener shares the rendering app and completed models, but rejects workshop login, generation, approval, balance, design and job-list requests. It never calls providers. Incoming Host/forwarded headers and workshop cookies do not change that rule. Phone behaviour runs locally.

Each 256-bit random capability grants only one pet for one hour. Its hash and validated pet record persist privately in DATA_DIR/mobile-links.json. The token is in the URL fragment, is removed from browser history before redemption, and is exchanged for an HttpOnly/SameSite cookie (Secure over HTTPS). QR creation happens locally. Anyone receiving the private link may view/download that one model until expiry or revocation. Do not publish private links unless that is intentional.

Sending a new link invalidates the previous link for that owner. Stop sharing invalidates both link and cookie. A previously downloaded model remains on that device; revocation cannot erase it. Existing generation ownership and workshop access codes are unchanged. Camera frames stay on the phone.

Workshop cookies last 30 days and renew during the last week when the workshop is opened. They preserve ownership across server restarts. Clearing cookies, changing ACCESS_CODE or leaving a session expired loses browser access to its private jobs; the GLBs still exist in DATA_DIR. Back up that private directory before migration. This POC uses device sessions rather than user accounts or cross-device workshop login.

The launcher caches a verified cloudflared binary, isolated tunnel configuration and active URL/PID under DATA_DIR, all gitignored. Stopping it closes the tunnel and removes its status; the URL changes on the next start. If it started the app, it also stops that app. An app started separately stays running. Relaunch and send a fresh link after restarting.

## Setup options

- MOBILE_PORT defaults to 3020 and always binds to loopback. Set 0 to disable it when using npm start without phone access.
- The launcher downloads cloudflared 2026.9.3 from the official Cloudflare GitHub release and verifies a pinned SHA-256 before executing. Windows x64, macOS x64/ARM64 and Linux x64/ARM64 are covered. macOS uses the standard tar utility. Downloads are cached under DATA_DIR/tools.
- CLOUDFLARED_PATH optionally selects an existing official cloudflared executable. No application keys are passed to cloudflared. No administrator permission or firewall changes are needed for this outbound tunnel.
- For a stable hostname, configure a named Cloudflare tunnel or another trusted HTTPS reverse proxy to MOBILE_PORT, set MOBILE_URL to that HTTPS origin and restart. Preserve Host and set X-Forwarded-Proto=https; strip untrusted forwarded headers. Keep a single durable Node instance and the workshop private.
- If deliberately publishing workshop access separately, require ACCESS_CODE and host-level protection. Changing ACCESS_CODE invalidates existing workshop cookies; it is unnecessary for the recommended phone flow. Do not tunnel port 3019 as a substitute for the protected play listener.

Quick Tunnels are for demos and have no uptime guarantee. A static-only host cannot run generation or private sharing.

## Troubleshooting

- HTTP LAN preview works but camera is blocked: scan the HTTPS QR, not the 192.168 address. iPhone Chrome also requires HTTPS.
- Send says start the secure link: run npm run mobile, keep it open, then click Send again.
- Link expired/replaced: send again from the owning computer browser. A different workshop browser cannot share another owner's model.
- Connector fails: verify internet access and configured ports. Use CLOUDFLARED_PATH if downloads are blocked. MOBILE_PORT must not be occupied by another app.
- Camera or motion denied: allow permissions in browser settings and tap room mode again. Open directly in Safari/Chrome rather than a social app's embedded browser.
- Tracking unavailable: try a textured, well-lit floor and move the phone slowly. HTTPS solves the security requirement; physical AR support still depends on device and browser.

## Verification

`npm test` checks expiry, restart, tampering, owner isolation, revocation, cross-origin rejection and forbidden provider access. `npm run test:mobile` uses the built production frontend, a real animated private GLB, two browser sessions and an iPhone-sized layout without paid requests. These checks do not substitute for floor tracking on a physical phone.

Official references: [Cloudflare Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/), [cloudflared release](https://github.com/cloudflare/cloudflared/releases/tag/2026.9.3), [camera secure-context requirement](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia), [QR library](https://github.com/soldair/node-qrcode).
