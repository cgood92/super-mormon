# Bow, camp, and analytics implementation plan

**Goal:** Implement the October 26 playtest feedback and production-only GA4.
**Architecture:** Keep the existing runtime, ballistic physics and sculpted cast; add reusable rig sockets and dimension-driven tent geometry; centralize analytics lifecycle in main.ts.
**Spec:** ../specs/2026-10-26-broken-bow-camp-analytics-design.md (approved to proceed October 26; brainstorming optional per AGENTS.md).
**Tech:** TypeScript, Three.js, Vite, Node test, GA4, GitHub Pages.

## Shared interfaces

- Rig returns `sockets: { leftHand: T.Group; rightHand: T.Group; back: T.Group }`.
- CharacterState and adventure update result add optional `holdingBow: boolean`.
- AdventureHooks adds optional `attachEquipment(slot: "leftHand" | "rightHand" | "back", object: T.Object3D): void`; root wires to current avatar sockets. Tests may omit hook.
- Reusable tent helper in scenery.ts receives local position/dimensions and materials; tent worker sends exact signature before Bow integration.

## Tasks and ownership

- [x] Character worker: reproduce flat rear, add regression, preserve curvature and inner coverage; provide equipment sockets and held-bow pose. Own playable-lehi.ts, character-motion.ts, character-types.ts and character tests.
- [x] Tent worker: add shared canvas tent helper with fitted roof support; migrate family-camp.ts without layout disruption; test entry, blocked walking, roof landing and raycast alignment. Own scenery.ts, family-camp.ts and tent tests.
- [x] Bow worker: update broken-bow.ts and its tests/story notes to three-shot opening, natural jump route, separated materials/automatic craft, ordered counsel and automatic return, recognizable food on back. Own adventure.ts hook/result types; root owns main.ts integration.
- [x] Root: analytics property/stream setup, analytics.ts with pure transport/gate/lifecycle tests, main.ts hooks and sockets integration, deployment config, analytics documentation.
- [ ] Root: review each batch and run full format/test/build, browser normal routes/visuals and mobile checks. Resolve findings. Commit/push verified batches and open PR.

## Verification focus

Third shot counts misses; completion only once; sockets follow rendered yaw and held poses; roof support does not fill interior; boulder jumps are actually playable; crawl fabric/feet stay covered in turns. Analytics excludes local/test/hidden/paused work; successful move counts and camera gestures are deduplicated; incremental duration is not double-counted on completion/exit.

## Ledger

- Design committed 0da2914. Read-only probes reproduce flat crawl hem and missing tent roof support. No implementation yet.
- Ruling: preserve nearby interaction for material pickup; only repetitive crafting and return interaction removed, matching transcript.
- Ruling: property uses the currently selected personal Book of Mormon Golf Analytics account; create a distinct Super Mormon property in it, Denver timezone, USD.

- Verified 369/369 full tests, formatting and production build with the actual configured measurement ID. Full normal-controller Broken Bow route completed: nine jump landings, three practice shots, family cutaway, descent, separated material pickups, counsel, Liahona, climb, three ballistic hunt hits, automatic return and completion. Saved test progress stayed in memory only.
- Review found and fixed tent rope disposal, pre-splash level starts, stalled-frame timing, missing story/tree phase events, and practice arrows collecting hunting food. Added relevant regressions.
- Rendered hero/NPC side/quarter turn/reversal/crawl-to-stand QA now shows an arched rear hem instead of a flat cut plane; walking-cloth tests remain green.
- GA property 560764360, stream 16206783522, measurement G-Y0M4GM5HMT created. Ten custom dimensions and two time metrics registered; six exploration report tabs configured. No local/test tag loaded.
- Publishing and live GA receipt verification remain pending.

- Personal SSH push succeeded. GitHub CLI uses an Adobe Enterprise Managed User and cannot create a PR in the personal repository; publishing the verified batch through the personal SSH remote instead. Main remains at the verified base 704e502 before publication.
