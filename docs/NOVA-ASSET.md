# Nova asset preparation

Status: generated, rigged, animated, inspected in Blender and connected to the website on 1 October 2026. The current Nova uses `public/models/nova-living.glb` in both the studio and room view, with thirteen Blender-authored body and facial animations. Mochi and Ember use their own detailed assets; custom locally designed shapes remain procedural. The generation statistics below describe the original vendor output; see [all included companions](COMPANION-ASSETS.md) and [the subsequent animation work](ANIMATION.md).

Reference: `public/nova-reference.png`.

Source identity: `public/nova-concept.png`.

Generated with the built-in image-generation tool, using the source artwork as the character reference. No Tripo credits were used for this reference.

## Actual generation and review

- Tripo H Series `v3.1-20260211`, 40,000-face cap, detailed PBR textures with lighting removal: 40 API credits.
- Riggability check: quadruped, 0 credits.
- Quadruped rig `v2.5-20260210`: 25 credits.
- In-place `preset:quadruped:walk`: 10 credits.
- Total: 75 credits, one mesh generation, one rig and one animation; no paid retries. Balance immediately after Nova completion: 925 credits.
- Final GLB: 10,885,364 bytes, 38,040 triangles, three textures, 35 joints and one walk clip with 17 animation channels.
- Actual mesh inspected from the front, side and back in Blender 4.5.9. The stylised coat is sculpted fur, not individual simulated strands. The generated eyes and whiskers remain part of the textured mesh; separate cinematic corneas were not added.
- Browser checks confirmed real skeletal animation, preview rendering, original GLB download, switching between generated and procedural pets, and reload. Room integration is tested separately with the real tracking engine and a synthetic camera; physical phone validation remains pending.
- The shared asset is cached, but each view clones its own skeleton, geometry and materials. Scaling refreshes bind matrices before measuring the floor pivot. This fixes a clipping error caught during live browser review.

The website interprets procedural design prompts through Jev, and provides optional Tripo generation. It does not promise every arbitrary description produces Nova-level quality automatically.

## Generation brief

One premium stylized 3D character reference render of the same cream-white baby fox-cat creature, preserving huge glossy sapphire blue eyes, oversized triangular ears with pink interiors, tiny peach nose, sweet rounded muzzle, fluffy cream coat, cyan tips on paws and curled bushy tail. Entire creature standing neutrally on four separated paws, quadruped kitten anatomy, distinct legs. Front three-quarter view showing face and side of body, head level, ears upright, tail lifted away from body in a gently open curl with an air gap. Anatomically coherent cute body and credible leg joints. Compact soft fur clumps and fine surface detail. Neutral even studio illumination and plain pale-grey seamless background. No room, furniture, props, text, collage or pedestal. Square composition, centered creature, every ear, tail tip and paw fully inside the frame. Intended for reconstruction into a mobile real-time 3D mesh.

## Acceptance checks before replacing the current model

- Inspect the mesh from all sides, especially the back, underside and eyes.
- Confirm four distinct legs and no fused paws or attached background geometry.
- Verify the animated GLB contains skinning and a working in-place quadruped walk.
- Check actual face count, texture sizes and download size against mobile limits.
- Refine geometry, coat materials and eyes in Blender where necessary.
- Use the same reviewed character in the studio and room view; verify floor contact, scale, orientation, animation and cleanup.
- Test on physical Android and iPhone browsers before claiming the AR character is verified.

An attractive reference is not evidence that the generated mesh or animation meets these checks.
