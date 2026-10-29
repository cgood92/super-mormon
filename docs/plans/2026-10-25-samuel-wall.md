# Samuel's wall implementation plan

**Goal:** Play Samuel climbing Zarahemla's wall, calling the people to repent, dodging for 30 seconds, and jumping down to escape.
**Architecture:** Reuse the existing Three.js world/adventure factory, physics and sculpted cast. Separate physical layout, runtime/projectiles and character identity; integrate through lazy loading and normal story progression.
**Spec:** docs/stories/samuel-the-lamanite.md and the user's detailed scene request.

- [x] Sol world implementer: matching geometry/collision, broad jump blocks, crowd and city vista, physical traversal tests and resource disposal.
- [x] Sol runtime implementer: brief acted preaching, 30 active seconds with fair telegraphed ballistic stones/arrows, scriptural protection, exterior landing completion, timer/retry/cleanup tests.
- [x] Sol cast implementer: distinctive Samuel using approved rig and visible costume contract, quality variants checked.
- [x] Main integration: new story ID/title, lazy loading, upper side-hall painting, source notes and developer trial entry.
- [x] Review combined result, validate full route with actual stepPlayer physics and timer/retry tests, inspect desktop opening, run full tests/build/format. Close own browser tabs and preview server; commit and push verified batch. Full manual playthrough is left to the user at their explicit request.

Working branch codex/samuel-wall, base 17ebad8. Three implementers own disjoint files; main integrates. A fresh Sol reviewer checks the combined playable result. No unrelated architecture or character changes.

## Verification

The original implementation passed 351/351 full-suite tests, TypeScript/production build, and repository formatting checks. Physical tests start at spawn and jump each stone, traverse the solid wall and exterior landing, and check resource disposal. Runtime tests cover the active timer, paused preaching, fall recovery, projectiles/protection and exterior completion. A fresh Sol review found camera-relative control and wall-edge support mismatches; both were corrected and the scoped re-review passed. Main gameplay follows the visible authored camera heading and keeps the return-to-follow heading aligned. Own browser tab and temporary server were closed. The later 30-second revision passed all seven focused Samuel runtime tests and TypeScript; the full suite was not rerun for that revision.
