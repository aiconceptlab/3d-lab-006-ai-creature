# Verification record — 30 September 2026

## Passed

- 18 automated tests: route clearance, inaccessible targets, fetch completion, tracking pause, follow stand-off, low-energy override, stale-response epoch triggers, Jev request/response contract, malformed outputs, sanitised provider failures, explicit demo mode, geometry changes, signed-session restart/tamper/expiry, room adapter lifecycle with a fixture, API authorisation/CSRF/body-size/static-secret protection, public-credit guard, paid-stage approval/no duplicate retry and asset URL checks.
- Production build with pinned dependencies and vision-model checksum.
- Production dependency audit: zero known vulnerabilities at the time of checking.
- Release index scan: zero matches for saved local credentials or recognised credential patterns; private environment/data paths excluded.
- Microsoft Edge desktop browser: real 3D render, local creation, save/reload, virtual ball travel, rest/follow, animated GLB export with two clips, real local detector inference on a blank frame (negative detection).
- Real 8th Wall binary smoke check: synthetic camera, emulated orientation, floor-placement callback, no runtime exceptions, exit restores preview and ends media tracks. The harness overrides rear-camera selection because a fake camera has no facing direction; this is not a physical AR validation.
- iPhone 13 and Pixel 7 viewport emulation: no horizontal overflow; local creation works.

## Not verified / release gates

- Live Jev: attempted with the supplied local key; official TypeSafe endpoint returned HTTP 401. No successful live AI design or decision is claimed. Contract tests pass. Replace/check the key and run npm run test:live before recording a live-AI demonstration.
- Physical mobile SLAM: no iPhone or Android device camera was available for a real floor-anchoring test. Emulator layout is not proof of world tracking.
- Positive camera person detection and mobile performance: not verified on a physical camera.
- Tripo: optional adapter tested with fixtures; no live account or model generation tested.

## Phone acceptance checklist

1. Open an HTTPS origin directly in current Safari on iPhone / Chrome on Android.
2. Allow camera/device motion; deny once and confirm the user can exit without a crash.
3. Scan a textured floor; tap to place. Walk sideways, rotate and approach. The pet must stay at its anchor instead of following screen pixels.
4. Throw a virtual ball inside the play area, enable follow, mark an exclusion and verify the pet never cuts through it.
5. Cover the camera; movement pauses. Uncover and reacquire tracking without a teleport.
6. Enable Notice people with a consenting test person. Confirm presence affects behaviour, does not identify them and sends no camera images over the network.
7. Rescan; place again. Exit; confirm the camera indicator goes out. Re-enter and repeat. Also exit during engine loading and background/foreground the page.
8. Repeat on the other phone OS before describing the build as checked on both.

Browser/live JSON and screenshots are written locally under artifacts, excluded from public Git. Update this record only after actually completing a check.
