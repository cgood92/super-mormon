# Third Nephi Adventures Implementation Plan

> **For agentic workers:** Use subagent-driven development; the user explicitly requested independent scene builders and authorized main pushes. Proceed without a separate design approval under AGENTS.md.

**Goal:** Add three substantial, distinct adventures after Samuel with exploration and movement driving progress.

**Architecture:** Independent WorldData builders expose AdventureRuntime state machines, shared scenery collision helpers, approved character rigs, bounded simulation, and disposal. The coordinator owns progression, lazy loading, gallery paintings and integration; each builder owns one module, its source notes and behavioral tests.

**Tech Stack:** TypeScript, Three.js, Node test runner, Vite.

**Spec:** User request and AGENTS.md; primary sources: 3 Nephi 1, 3–4, 8–11 and 17.

## Global Constraints
- No repetitive dialogue gates: movement, discovery, carrying, escorting or planning advances play.
- Solid foreground objects use shared render/collision dimensions; deliberate backdrops and small decoration carry reasons.
- Multiple inhabitants, branching routes and optional discoveries in each scene.
- Miracles and sacred encounters are witnessed reverently, never earned by points, timers or collectibles.
- Original terrain, dialogue and errands explicitly documented as adaptations. Distinguish the later Nephi from Nephi son of Lehi.
- No changes to saved completion for testing. First six gallery paintings remain fixed; new paintings use later side halls.

## Review Focus
- Completion cannot be obtained by pressing interact repeatedly at spawn.
- Idle input permits exploration and movement-based discovery.
- Real stepPlayer routes navigate walls and land on elevated surfaces.
- Completion fires once; disposed runtimes stop; scene resources are removed.
- Phone and desktop render views and normal player movement remain usable.

### Task 1: Night Without Darkness
- [x] Create src/super/signs-night.ts exporting buildSignsNight(scene): WorldData (id signs).
- [x] Build a broad inhabited town, accessible rooftop/overlook routes, optional discoveries, short source-grounded sign presentation, movement-based progress.
- [x] Create tests/signs-night.test.ts with progression, traversal, collision, optional discoveries and disposal checks; docs/signs-night.md with sources and adaptation notes.

### Task 2: Lachoneus's Gathering
- [x] Create src/super/lachoneus-gathering.ts exporting buildLachoneusGathering(scene): WorldData (id gathering).
- [x] Build a large fortified valley: gather provisions and guide families/flocks along alternate routes, with route planning and optional exploration; no invented battle victory.
- [x] Create tests/lachoneus-gathering.test.ts and docs/lachoneus-gathering.md; verify progression, collision, routes, retries and disposal.

### Task 3: Christ at Bountiful
- [x] Create src/super/christ-bountiful.ts exporting buildChristBountiful(scene): WorldData (id christ-bountiful).
- [x] Build explorable temple courts, gardens, accessible terraces and rooms, optional people/discoveries, practical assistance with navigation; reverent encounter independent of optional tasks.
- [x] Create tests/christ-bountiful.test.ts and docs/christ-bountiful.md; verify movement-based play, collision, sacred presentation and disposal.

### Task 4: Integration and delivery
- [x] Update AGENTS.md with explicit fun/gameplay-first expectations and solid foreground props.
- [x] Add IDs/titles/order, buildWorld and prepareWorld dispatch, distinct paintings and integration tests.
- [x] Run npm test, npm run build and formatting on changed files. Review scene behavior and run real browser movement at phone/desktop sizes; close own testing tabs.
- [x] Commit verified changes and push main to personal GitHub; no PR.
