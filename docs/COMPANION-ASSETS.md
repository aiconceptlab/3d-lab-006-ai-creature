# Included companion assets

Nova, Mochi and Ember are separate reviewed Tripo-generated characters. They are included in the repository, need no key or credits to play, and use the same asset in the studio and camera room. Saved designs matching a preset also load its detailed model. Custom local designs remain clearly labelled procedural demos.

| Pet | File | Triangles | Rig joints | Animation | API credits |
| --- | --- | ---: | ---: | --- | ---: |
| Nova | public/models/nova.glb | 38,040 | 35 | Quadruped walk | 75 |
| Mochi | public/models/mochi.glb | 39,875 | 33 | Quadruped walk | 75 |
| Ember | public/models/ember.glb | 38,521 | 28 | Quadruped walk | 75 |

All three use H Series v3.1-20260211 meshes with detailed PBR textures and lighting removal, v2.5-20260210 quadruped rigs and the in-place quadruped walk preset. Each mesh costs 40 credits, rig check 0, rig 25 and walk 10. Mochi and Ember consumed 150 credits together in one pass on 1 October 2026; no paid retries. The recorded balance after those two pipelines was 775 credits. Vendor charges are authoritative.

Reference images were generated with Codex's built-in image tool, one image per character, without Tripo image credits. The files are public/mochi-reference.png and public/ember-reference.png. Nova provenance is in NOVA-ASSET.md. Source GLBs contain 4096-square PBR maps. The loader caps runtime texture dimensions at 2048 to reduce memory use when switching pets; downloadable GLBs retain the original maps. Fur is sculpted geometry and textures, not simulated hair strands.

## Reference prompts

Mochi: Use case: stylized-concept. Asset type: image-to-3D reference for AI Concept Lab pet Mochi. One premium animated-film baby bunny, round soft lilac lavender coat, enormous expressive violet glossy eyes, long upright rabbit ears with pink-lilac inner ears, small lavender-pink nose, cuddly sleepy expression with eyes open. Tiny subtle mint accents on four paw tips. Round cotton puff tail clearly visible at the rear. Full body standing on ALL FOUR distinct separated paws in a relaxed neutral quadruped stance; body and hind legs visible, anatomically plausible rabbit, feet flat on ground. Three-quarter front camera, whole character including ears and tail inside frame with generous margins. Sculpted clumps of fluffy fur, soft beautiful material detail, warm studio key light and neutral fill, clean neutral gray background with gentle contact shadow. Match the appealing premium creature aesthetic of Nova, but clearly a distinct lilac bunny. Single character only. No sitting, no clothes, no props, no floor platform, no text, no logo, no motion, no exaggerated glow, no accessory, no other animal, no cropped ears. Square composition.

Ember: Use case: stylized-concept. Asset type: image-to-3D reference for AI Concept Lab pet Ember. One utterly adorable premium animated-film baby charcoal cat, elegant slightly slender dark smoky gray body, round expressive face, huge glossy warm amber eyes, small triangular cat ears with muted warm inner ears, cute dark nose, happy curious expression, fluffy long tail gently curling upward behind body without intersecting it. Four distinct separated paws with tiny restrained warm amber toe accents. Full body standing on ALL FOUR paws in a relaxed neutral quadruped stance, rear legs visible, feet flat on ground. Three-quarter front view. Whole creature including tail and ears fits with generous margins. Sculpted fluffy fur clumps, lovely tactile dark-gray materials with gentle cream-chest tuft, warm studio key light, soft neutral fill and rim detail to preserve fur silhouette on gray backdrop. Single original creature. Clean neutral gray studio background, soft contact shadow. Match Nova's charming premium style but clearly a distinct playful charcoal feline. No fox ears, no clothes, no props, no platform, no text, no logo, no sitting, no action pose, no elaborate effects, no other animal. Square composition.

## Reusable generation workflow

Use scripts/generate-companion.mjs with a stage and --pet nova, mochi or ember. For example:

```powershell
node --env-file=.env scripts/generate-companion.mjs mesh --pet mochi
node --env-file=.env scripts/generate-companion.mjs status --pet mochi
node --env-file=.env scripts/generate-companion.mjs check --pet mochi
# Poll, inspect the downloaded mesh in Blender, and verify the quadruped check.
node --env-file=.env scripts/generate-companion.mjs rig --approve-mesh --pet mochi
# Poll until the rig completes, then:
node --env-file=.env scripts/generate-companion.mjs walk --pet mochi
```

Private saved task records prevent duplicate paid submissions. Do not remove them and rerun unless a new paid generation is intentional. If a response is lost, reconcile it in the vendor dashboard. The old generate-nova entry point remains compatible.

Actual meshes were inspected in Blender before buying rigs. Browser checks verify skeletal motion and exact GLB downloads for every pet, switching, saved Mochi reuse and reload. The real camera engine is checked with synthetic camera input; physical phone tracking remains a separate acceptance gate.
