# Optional Tripo custom-mesh preview

Disabled by default. Requires a separate Tripo developer API account/key. No live Tripo credits were spent or live credentials used to verify this release.

Set TRIPO_API_KEY locally and ENABLE_TRIPO=1, restart, then open the optional image-to-3D panel. Generate a clean four-legged reference. Inspect it before approving. Approval starts mesh generation, quadruped rig checking, rigging and the supported quadruped walk clip. Each provider stage may consume credits; check current provider pricing first. There is no automatic resubmission after ambiguous paid failures.

The source follows the current official v3 contracts:
- https://developers.tripo3d.ai/en/docs/generation-text-to-image
- https://developers.tripo3d.ai/en/docs/generation-image-to-model/p
- https://developers.tripo3d.ai/en/docs/animations-rig
- https://developers.tripo3d.ai/en/docs/animations-retarget

Generated meshes must contain animation and skinning and pass a triangle budget. They can be previewed; imported rigs do not enter room mode in this release. Failed or incompatible quadruped rigs do not silently become floating static models. Job records persist in DATA_DIR; keep that directory private and durable. Provider assets/URL availability can expire, so use the provider dashboard to retain paid results.
