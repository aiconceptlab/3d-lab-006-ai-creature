# Verification record — 1 October 2026

## Passed

- 31 automated tests (including generated-rig isolation, incomplete limb rejection, animation, grounded scaling, development-module serving with secret protection and credit guards): route clearance, inaccessible targets, fetch completion, tracking pause, follow stand-off, low-energy override, stale-response epoch triggers, Jev request/response contract, malformed outputs, sanitised provider failures, invalid-key network circuit, explicit demo mode, geometry changes, signed-session restart/tamper/expiry, room adapter lifecycle with a fixture, API authorisation/CSRF/body-size/static-secret protection, public-credit guard, paid-stage approval/no duplicate retry and asset URL checks.
- Production build with pinned dependencies and vision-model checksum.
- Production dependency audit: zero known vulnerabilities at the time of checking.
- Release index scan: zero matches for saved local credentials or recognised credential patterns; private environment/data paths excluded.
- Microsoft Edge desktop browser: real 3D render, local creation, save/reload, virtual ball travel, rest/follow, animated GLB export with two clips, real local detector inference on a blank frame (negative detection).
- Real 8th Wall binary smoke check: synthetic camera, emulated orientation, floor-placement callback, no runtime exceptions, exit restores preview and ends media tracks. The harness overrides rear-camera selection because a fake camera has no facing direction; this is not a physical AR validation.
- iPhone 13 and Pixel 7 viewport emulation: no horizontal overflow; local creation works.

- Live Tripo Nova: one 40-credit mesh, free quadruped check, 25-credit rig and 10-credit walk. Blender inspection completed. Actual generated GLB browser check passed: 38,040 triangles, 35 bones, changing skeletal pose, download, switching and reload.

- Live Jev AI at jev-ai.pro: authenticated models/balance checks and actual design + behaviour requests passed after selecting the correct provider. Returned jev-1.13.0, lilac bunny/puff-tail design and chase behaviour. No fallback presented as a live result.

## Not verified / release gates

- Official TypeSafe account/key: not live-tested successfully. The supplied key belongs to the independent Jev AI service; sending it to the official TypeSafe endpoint correctly returned HTTP 401. The provider selection now keeps their credentials separate.
- Physical mobile SLAM: no iPhone or Android device camera was available for a real floor-anchoring test. Emulator layout is not proof of world tracking.
- Positive camera person detection and mobile performance: not verified on a physical camera.
- Tripo prompts beyond the three included pets: quality and rig compatibility are not guaranteed.

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

The updated real-engine smoke test also verifies GeneratedCompanion is present in the room scene, so it checks the actual imported Nova path. Physical phone validation remains separate.

## Mochi, Ember and LAN release

- Both models inspected in Blender before rigging; each paid pipeline completed once for 75 credits.
- Real browser checks pass for all three generated models: changing skeletal pose, exact original GLB download, switching, custom procedural fallback and saved Mochi reuse after reload. No runtime errors.
- Desktop, iPhone and Pixel viewport checks pass.
- Server binds to 0.0.0.0 by default and prints private LAN addresses. HTTP responses for the home page and config passed at the active Ethernet address. Tests verify LAN local creation remains usable and configured provider access is blocked without an access code.
- Windows firewall rule inspection required administrator access and was unavailable. A connection from a separate physical device still requires user confirmation. LAN HTTP does not enable phone camera access; use HTTPS for room mode.

## Provider and preview repair

The open in-app browser was still executing a PLAY 001 bundle. Reloading loaded 3D LAB 006 and the generated Mochi/Ember assets. Included sample descriptions now preserve their detailed asset even if Jev chooses a slightly different recipe. A loading panel covers the temporary procedural placeholder. The studio follows the pet while preserving orbit controls; moving-pet framing and original downloads are checked in the generated-model browser harness. No Tripo generation was needed for this repair.

## Living animation release

- Blender 4.5.9: repaired Ember's incomplete rear-left chain and reweighted 3,425 affected vertices. All three models have Idle, Walk, Trot, Look and Rest; geometry counts remain 38,040 / 39,875 / 38,521 triangles. No further Tripo credits consumed.
- Actual GLB CPU audit passes for every pet: complete chains, substantially weighted and deformed vertices on all four paws, two locomotion gaits, stationary paw drift below 2 mm, excluding intentionally moving greeting/stretch paws, matching loop endpoints, head turns and bounded 60 Hz frame changes through blended transitions and repeated cycles. This audit is part of npm run check and CI.
- Production browser checks pass for all three: all four limb chains change during chase, Trot is selected, eleven clips are available, movement stays framed, GLB downloads match source bytes, and an older saved Mochi URL migrates to the new model. Zero runtime exceptions.
- Desktop, iPhone and Pixel layout checks pass; the real room binary with synthetic camera input loads each new model, exits correctly and stops the camera. This remains a synthetic test, not physical phone tracking.
- Actual textured side-view animation frames and a recording were rendered in the browser for inspection. The recording uses the same runtime blending/cadence as the app. Rest is a standing breather; generated facial blinking, sitting and lying down are not implemented.
- Development dependency requests work again without serving hidden environment/private files. The security regression check runs in the unit and security suite.

## Expressive companion release — 2 October 2026

- Blender-authored Curious, Playful, Shy, Sleepy, Greet and Stretch added to all three included GLBs (11 clips each). Original meshes and texture maps retained; zero generation credits used.
- CPU audit checks actual weighted face vertex displacement and head rotation, lifted greeting paw, extended front paws, stationary other paws, loop seams and bounded transitions for every pet.
- Production UI checks exercise all four moods, hello, affection and stretch on all three models. Head rotation changes while each requested reaction remains held. Existing movement, framing, downloads and saved-model migration checks pass without browser exceptions.
- The distributed room engine loads all three expressive pets with synthetic camera input. Hello selects Greet in the room mixer and the room head changes pose. Exit stops every camera track. Physical mobile tracking remains unverified.
- Desktop, iPhone and Pixel responsive checks pass. Close three-quarter pose frames and a recording of all six expressive animations were visually reviewed.
- 34 unit/contract/security checks pass, including reaction priority, stale-decision invalidation, autonomous variation, tracking pause and exploration breaks.
- Expressions are authored body language. At that release eyelids and mouth shapes remained static; the subsequent jaw update below supersedes the mouth limitation. Eye closure is still unsupported.

## Torso, heading and mouth update — 2 October 2026

- Rebuilt all three in Blender with phase-coupled pelvis rotation, chest counter-motion and stable travel gaze. Source forward axes now align with movement; the controller turns before travelling instead of strafing.
- Actual face-mesh JawOpen and Smile morphs plus a skinned curved lining animate greetings, playful poses and yawns. Mouth transitions and loop endpoints are audited alongside skeletons.
- Extended the CPU audit to check source-axis alignment, pelvis motion, forward-only stance travel, cadence matching and deformed chin vertices. A navigation regression check covers 180-degree turns.
- Production UI checks pass for all three pets, including yawn playback, held reactions, locomotion, framing and exact GLB downloads. No runtime exceptions.
- Mouth controls are performed expressions, not speech lip-sync. Physical phone tracking is still unverified; camera-engine testing uses synthetic input.

## Custom pipeline and animated turns — 2 October 2026

- Main custom creation now requests a premium reference, pauses for approval, builds the detailed Tripo mesh/rig and runs local Blender finishing before completion. The procedural option is explicit; missing Blender blocks paid creation.
- All three included assets now have 13 clips, including left/right stepping turns. The CPU audit checks all four paws through turn loops and bounded blended transitions; navigation turns before translating. Camera movement no longer drives stationary body yaw, in studio or room mode.
- 39 unit/security checks pass, including private finished downloads, local retry/restart recovery without provider calls, and camera-independent heading.
- The full production custom workflow passed using actual Blender and an original source GLB with its reviewed mesh identity removed. It created all 13 clips, used the automatic chin estimator, flagged facial review, loaded the finished private asset, animated turning paws, preserved heading during camera orbit, downloaded the GLB and restored the saved pet after reload. Vendor replies were mocked with an existing GLB: zero paid requests. This checks plumbing and generic authoring, not the artistic quality of a newly generated reference/mesh.
- Production browser checks pass for Nova, Mochi and Ember; desktop, iPhone/Pixel layouts and the actual room engine with synthetic camera input pass. Physical phone tracking remains unverified.
- New faces receive conservative jaw morphs; a precise lip opening/lining still needs reviewed per-character landmarks. The pipeline cannot guarantee that every generated mesh matches a curated sample or fix all unusual rigs. Existing procedural designs need a new detailed generation; they are not silently regenerated at a cost.

## Visible generation progress and recovery — 2 October 2026

- A persistent card outside the collapsed details shows the pet name, current stage, activity indicator, provider stage percentage and the next action. Artwork approval is distinguished from ongoing generation; local finishing failures offer a retry without credits.
- Reloads and lost browser job storage recover the owning session's latest active generation. Clicking Create while one is open reveals it before calling the design provider; the original brief stays attached to its model. Interrupted progress GETs retry without resubmitting a paid stage.
- Production browser fixtures exercise running reference progress, closed details, changed input, reload, lost storage, interrupted GET recovery, awaiting approval, two tabs, private ownership and a 390-pixel mobile viewport. All vendor responses are fixtures; zero paid calls.
- 40 unit/security checks pass, including concurrent paid starts and concurrent approvals. The server returns the existing owner request, and locks submissions while checking credits. Percentages reset when the stage changes.
- The actual saved custom Ember exposed a missing rear-right chain represented by a weighted unnamed stub. Blender now handles either rear side only when there is a complete opposite chain and an unambiguous weighted paw. It flags the repair for review and continues to reject ambiguous or doubly incomplete rear rigs. The full custom-pipeline browser test passed against this original model with mocked provider replies, then its real saved request finished locally with 13 clips. No new provider generation was submitted for the repair.
- Precise facial fitting and anatomical review remain necessary for unusual generated models. Physical mobile room tracking is still unverified.

## Windows LAN connection repair — 2 October 2026

- Verified the actual app listens on 0.0.0.0:3019, responds with HTTP 200 at the active Ethernet LAN address, and renders its detailed preview in Edge using that LAN address. This local browser check alone does not prove access from a phone.
- A phone on home Wi-Fi reported ERR_CONNECTION_TIMED_OUT. The Windows LAN helper was syntax checked, run with administrator rights and verified its resulting rule: Private profile, LocalSubnet source, TCP 3019 and the actual listening Node executable. The firewall stays enabled and edge traversal is blocked.
- The helper is opt-in and administrator-only; normal app startup does not change firewall policy. A successful rule application is recorded privately under .data. Physical phone retesting is still required; a camera session also requires HTTPS.
