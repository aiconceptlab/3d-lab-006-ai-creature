# Tripo generated companions

New generation is disabled by default and requires a separate Tripo developer API account/key. The included Nova, Mochi and Ember play without a key. Its live mesh → quadruped check → rig → walk pipeline succeeded on 1 October 2026, consuming 75 API credits. See COMPANION-ASSETS.md for all three models, costs and verification scope.

Install Blender 4.5 LTS or newer from [blender.org](https://www.blender.org/download/). Set TRIPO_API_KEY, ENABLE_TRIPO=1 and BLENDER_PATH locally, then restart. Missing Blender prevents a paid creation request. Create my companion starts the detailed workflow for a new description; the local demo remains a clearly labelled simpler option. Generate a clean four-legged reference. Inspect it before approving. Approval starts mesh generation, quadruped rig checking, rigging and the supported quadruped walk clip, then a serial local Blender finishing pass. Completion requires all 13 named clips and a jaw morph in an embedded, skinned GLB. The original GLB, finished GLB and review report are retained in DATA_DIR/jobs/<id>, outside public files. Downloads require the owning signed session. No credits are charged by local animation finishing; its failure offers a local retry, and interrupted local work resumes when polled after a restart. Ambiguous paid stages remain blocked. Each provider stage may consume credits; check current provider pricing first. There is no automatic resubmission after ambiguous paid failures.

The source follows the current official v3 contracts:
- https://developers.tripo3d.ai/en/docs/generation-text-to-image
- https://developers.tripo3d.ai/en/docs/generation-image-to-model/p
- https://developers.tripo3d.ai/en/docs/animations-rig
- https://developers.tripo3d.ai/en/docs/animations-retarget

Generated meshes must contain animation and skinning and pass a triangle budget. They can be used in both the preview and room mode; each view owns an independent skeleton. Failed or incompatible quadruped rigs do not silently become floating static models. Job records persist in DATA_DIR; keep that directory private and durable. Provider assets/URL availability can expire, so use the provider dashboard to retain paid results.

## Nova quality workflow

`public/nova-reference.png` is a clean, full-body reference created from the existing Nova concept artwork with the built-in image generator. Its generation brief and provenance are in `docs/NOVA-ASSET.md`. The current bundled asset is public/models/nova-living.glb, with thirteen subsequent Blender-authored clips; see ANIMATION.md. New Tripo generation receives the same animation authoring pass automatically. Unrecognised faces use a conservative bone-weighted chin estimate, without a guessed mouth lining. The UI flags the jaw fit for visual review: check Sleepy and Hello from the front and side. Reviewed mouth openings still need per-character Blender landmarks; automatic finishing cannot repair every bad mesh or guarantee the curated samples’ appearance.

The default mesh model is now H Series `v3.1-20260211`, with 40,000 faces, detailed PBR textures, and lighting removal. P1 remains configurable and uses its supported 20,000-face ceiling. The website checks the actual developer API balance before starting a reference or approving the paid mesh pipeline. Having an API key does not imply available credits.

For Nova, use the operator workflow to avoid paying for another reference and to inspect the mesh before buying animation:

```powershell
node --env-file=.env scripts/generate-nova.mjs status
node --env-file=.env scripts/generate-nova.mjs mesh
```

Repeat `status` to poll the saved task. Once successful, inspect `.data/nova/mesh.glb` in Blender from all sides. Verify the face, four separated legs, tail, underside and textures. Only proceed after this visual review:

```powershell
node --env-file=.env scripts/generate-nova.mjs check
# Poll status until riggable=true and rig_type=quadruped, then:
node --env-file=.env scripts/generate-nova.mjs rig --approve-mesh
# Poll status until the rig completes, then:
node --env-file=.env scripts/generate-nova.mjs walk
```

Run `status` until the animated file is saved as `.data/nova/walk.glb`. Each stage submits once; repeating its command polls the persisted task instead of creating another paid job. If a submission loses its response, reconcile the task in Tripo's dashboard; the script refuses to blindly repeat it. The script never automatically polls or starts another paid stage.

Current published estimate: mesh with detailed textures 40 credits, rig 25, walk 10; approximately 75 API credits total ($0.75). Provider charges are authoritative. This does not include Blender refinement or guarantee cinematic fur fidelity. Official pricing: https://developers.tripo3d.ai/en/pricing

The included Nova is the reviewed output of this workflow. New meshes still require visual review before they become companions. Physical floor anchoring must be checked on real phones.
