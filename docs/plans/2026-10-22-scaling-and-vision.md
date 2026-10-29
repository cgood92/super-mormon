# Scaling preparation and an explorable vision

**Goal:** Keep the game economical to load while making the Tree of Life a larger, populated place to explore.

**Scope approved by user:** On-demand level code, lighter gallery paintings, developer performance checks; reachable great and spacious building; fruit interaction around the actual tree; holding B keeps the player on the rod until released; stronger mist, especially off the path; more people with varied destinations; individual conversations with Lehi's family; remove beckoning; visible fruit and tree climbing.

**Architecture:** Retain Three.js, the existing physics and active-scene disposal. Share one Jerusalem module across visits. Use original paintings as source assets and small generated derivatives in the game. Keep profiling optional and developer-only.

## Constraints

- Do not change the camera behavior.
- Keep the vision reverent and distinguish artistic exploration from scriptural claims.
- Preserve keyboard, touch and calibrated N64 inputs, showing only the active device's hints.
- No combat, coin collection or beckoning objective in the vision.
- Do not introduce a general asset platform or heavyweight dependencies.

## Tasks

- [x] Level loading and gallery image derivatives: dynamic chunks, safe asynchronous transitions, texture cleanup and focused loading tests.
- [x] Held interaction input: continuous B/E/touch signal independent of the press edge; release/reset regression test.
- [x] Developer performance sampling: optional FPS, draw calls, triangles, graphics resource counts, available heap data and scene history.
- [x] Vision expansion: traversable ravine and building, tree/fruit/rod/mist changes, crowds and family conversations, physics and interaction tests.
- [ ] Integration review, full tests/build/format, browser playthrough and deployment.

## Review focus

- Rapid scene requests must not attach an obsolete scene or leave controls paused.
- Deferred painting requests must not resurrect textures after scene disposal.
- Held action release, pause and touch cancellation must release the rod.
- The building route must work with real ground collision and permit returning to the tree.
- Expanded crowds must avoid unreasonable mobile rendering cost; performance numbers are diagnostic rather than a claim of physical-phone testing.

## Execution notes

Three Sol workers own separate areas: loading/main/gallery, diagnostics, and vision. Main input integration uses `InputState.interactHeld` passed as `holdRod` to the tree runtime. The controller coordinates integration and independent review. Existing checkout started clean; file ownership separates concurrent work without moving the running local preview.

Independent reviews covered loading, vision and integration. Fixed initial-import retry, physical building collisions, safe fruit checkpoints, instance-buffer cleanup and directional-light shadow target disposal. Final validation includes 129 automated tests, production build and formatting, full browser rod/fruit/family route, building round trip, and tree climbing.
