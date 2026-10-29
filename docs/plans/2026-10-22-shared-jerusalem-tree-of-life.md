# Shared Jerusalem and Tree of Life Implementation Plan

**Goal:** Solid gallery entry, one consistent Jerusalem including the palace and treasury, visible transfer of Laban’s garments, and a reverent Tree of Life chapter.

**Architecture:** A shared Jerusalem builder supplies identical static geometry to all four city missions. Independent modules provide gallery entry rules and Tree of Life geometry/runtime; main.ts connects story progression, HUD, checkpoints and dialogs. Existing camera behavior stays unchanged.

**Tech stack:** TypeScript, Three.js, Vite, Node test runner, GitHub Pages.

- [x] Make every canvas a solid wall and permit a standing jump from its front face, with physics regression checks.
- [x] Reuse one Jerusalem map across Lehi’s homeward journey, Laman’s encounter, the treasure offer, and the nighttime recovery. Restore the audience hall, palace entrance corridor and separate treasury corridor/room. Verify identical solids, accessible landmarks, followers and escapes.
- [x] Show clothed Laban before the nighttime encounter and a modest, non-graphic undressed figure after the clothing transfer to Nephi.
- [x] Build a large Tree of Life landscape with rod/path, mist, white fruit, water, gulf, elevated building and people, family invitation and quiet exploration. Ground interpretation in 1 Nephi 8, 11, 12 and 15; no coin scoring or combat.
- [x] Add its scene painting and story-order unlock after the nighttime plates scene. Use Lehi and a gentle completion/rescue flow.
- [x] Run focused/full tests, production build, formatting, browser movement playthroughs and independent review. Update playtest documentation.
Deployment target: the existing personal GitHub repository and GitHub Pages workflow. Wait for deployment and verify live assets. Explain Mario 64 camera behavior from Nintendo’s manual without modifying this game’s camera.
