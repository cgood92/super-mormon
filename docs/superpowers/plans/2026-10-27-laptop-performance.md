# Laptop Performance Implementation Plan

**Goal:** Reduce sustained laptop rendering work while preserving playable routes and visual continuity.
**Architecture:** A pure render policy owns frame pacing, persisted quality presets and adaptive resolution. Main integrates it with the existing animation loop and modal input. Scene builders batch static decoration and partition auditorium seats for conservative culling.
**Tech stack:** TypeScript, Three.js, Vite, Node tests, Chrome profiling.
**Spec:** User-approved recommendations from the October 27 performance investigation.

## Constraints and review focus

- Default to 60 FPS; offer 30 FPS battery saving and optional display-refresh rendering.
- Static paused menus stop 3D rendering; controller/keyboard menus remain responsive and cinematics continue.
- Preserve elapsed-time accounting and physics stability at 30 FPS, hidden-tab recovery, resize, async texture loads, scene changes and settings changes.
- Rendering scale is bounded by a pixel budget, adapts conservatively, and cannot oscillate rapidly.
- Auditorium remains visible from every open doorway, balcony, rooftop or cinematic view. Preserve collision and disposal.
- Use the default GPU power preference instead of explicitly requesting high performance.

## Tasks

1. Add tests for render policy: 60/120/144 Hz pacing, 30 FPS, stalled-frame recovery, scale/pixel bounds, invalid persisted preferences and adaptive hysteresis. Watch failures, implement in src/super/render-policy.ts, run tests.
2. Integrate settings, render invalidation, capped simulation/render pacing and diagnostics in src/main.ts; add a Graphics menu with Balanced, Battery saver, High refresh choices. Verify paused input, cinematics, resize, scene/texture loads and active-time behavior in browser.
3. Independently optimize auditorium rendering with conservative visibility and spatial seat batching, test sightlines, instance counts, collision preservation and disposal.
4. Independently batch static Tree of Life decorations, preserving mutable targets, shadow flags, material properties and disposal; add meaningful workload/scene tests.
5. Run full suite and production build. Compare controlled browser workload against baseline, exercise actual movement/menu/story routes and inspect views. Obtain independent review, fix material findings, commit and push verified changes to personal GitHub repository.

## Verification record

- Tasks1–2 complete: four render-policy tests, paused diagnostic regression; browser Balanced60/Battery30/High refresh120, saved settings, paused keyboard navigation and resize/texture invalidation integrated.
- Task3 complete: spatial seating banks and camera-driven LOD;14 focused auditorium tests, normal gallery-to-auditorium browser route and rendered view.
- Task4 complete: static Tree decorations batched;15 focused Tree tests, visible cinematic continuation and entrance workload profile.
- Task5 complete:404 tests pass, production build and format checks pass. Production browser240 frames/4s, paused0. Independent source review found no actionable issue; its LOD camera concern was reproduced RED and fixed GREEN, retaining hidden-ancestor filtering.
- Decision: use conservative spatial culling and distance detail instead of hiding auditorium zones; preserves all view openings without fragile player-location rules.
- Decision: High refresh attempts display refresh while adaptive scaling uses a 60 FPS quality floor; optional mode may cost more power.
- Measurements and limitations: docs/performance-checks.md.
