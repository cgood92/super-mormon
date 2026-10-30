# Final Book of Mormon Adventures Implementation Plan

> For agentic workers: use Sol sub-agents for independent scene implementation. The user explicitly delegates design and execution without further involvement. Read AGENTS.md; use this file as the durable handoff and completion ledger.

**Goal:** Finish the narrative after the existing 24 adventures with eight substantial, varied games through Fourth Nephi, Mormon, Ether and Moroni. Build two now and the other six at 2:15 a.m. Mountain October 30, 2026, targeting playable deployment before 8 a.m.

**Architecture:** Independent WorldData builders with AdventureRuntime state, approved sculpted actor rigs, shared scenery geometry/collision, bounded time and explicit disposal. Coordinator owns StoryId/WorldId, synchronous and lazy world dispatch, gallery locations/art, UI chapter labels, progression and cross-world tests. No generic waypoint tour substitutes for actual game mechanics.

**Tech stack:** TypeScript, Three.js, Vite, node:test/tsx. Existing 485-test baseline passed October 29.

**Spec:** User request, AGENTS.md, and design decisions below. The roadmap is a curated playable conclusion, not a claim to adapt every verse or every omitted earlier episode.

## Workspace and delivery

- Worktree: `/Users/clintgoodman/.codex/worktrees/remaining-adventures/Navigate the Book of Mormon`, branch `codex/remaining-adventures`, starting commit `016bb7f`, updated to current main `bea3551` before final verification.
- Source checkout: `/Users/clintgoodman/Documents/ChatGPT/Navigate the Book of Mormon`; personal GitHub `cgood92/super-mormon`; play URL `https://cgood92.github.io/super-mormon/`.
- Baseline checkout was clean; source branch `codex/gallery-floor-edges`. Preserve its work and any new unrelated work. Fetch current origin/main before integration. Native worktree was intentionally based on HEAD to preserve the newest gallery floor fix.
- `node_modules` is a symlink to the source checkout's installed dependencies. Sandbox may require escalation for worktree writes and Git metadata.
- User authorizes commits and pushes of verified batches. Main is protected: push feature branch, create/attach PR, wait passively for required build, review then merge the owner-authored PR using owner permission; no direct main push. Pages requires owner deployment approval with self-review allowed; approve the concrete reviewed deployment through the owner account once pending. Do not disable or change protection settings. Creating an unmerged PR alone does not satisfy playable-by-morning. Do not force-push or overwrite unrelated work.
- Automation id `finish-book-of-mormon-adventures-overnight` is a one-time heartbeat in this chat for 2:15 a.m. Mountain, October 30. On completion or a real blocker, pause it with automation_update. Inspect current state before resuming, do not repeat finished tasks.

## Global constraints

- Navigation, timing, carrying, herding, stealth, building and environmental puzzles drive gameplay; optional dialogue is brief. No repeated interaction-button/dialogue chain core loop.
- Each world has generous exploration, branching routes, multiple inhabitants when chronology supports them, accessible architecture, at least three optional discoveries and a rewarding vista.
- Physical foreground scenery uses `worlds/shared/scenery.ts` with the same dimensions for render and collision. Trees have trunks; terraces support actual stepPlayer routes. Decoration and backdrops have explicit reasons. No duplicate coplanar floor owners.
- Miracles, prayer, conversion and sacred invitations are witnessed or reflected upon, never scored, earned with collectibles, or controllable powers. Tragedies are not reversible victories or graphic spectacles.
- Record primary chapter links and distinguish scripture from all invented terrain, costumes, dialogue, errands, chronology condensation and player tasks. No asserted precise ancient geography.
- Preserve movement, mobile performance, camera safety, lazy code/art loading, retry behavior and complete resource disposal. Batch repeated scenery where practical. Clamp dt and stop after disposal/hidden-page pauses.
- New roles use the accepted sculpted cast/rig: peace-builder, mormon, ammaron, jared, jared-brother, ether, moroni-keeper. The last is Mormon's son, not Captain Moroni. Distinct faces, hair, clothing, silhouette/equipment; morality never encoded with skin/ethnicity/body.
- Clothing remains explicit outer surfaces, cuffs/front inserts and short footwear; test inner tunic, trousers and footwear through reversals and cardinal/diagonal crawl. No per-step hem expansion or independently lagging inner fabric.
- First six entrance paintings stay fixed. All later paintings live in side halls within the existing three floors, never auditorium or roof gardens. At 32 stories the old 8-per-floor algorithm overflows: increase side-wall capacity with tested spacing.
- Test scene query params are developer-only; never expose in player UI or silently change saved progress. Real normal browser movement routes are required alongside physics tests. Close only own test tabs.

## Adversarial review decisions

Initial audit rejected redundant separate 3 Nephi 17–19 assistance scenes: existing Christ at Bountiful covers healing/children. Eight meaningful final worlds is stronger than padding to twelve. Separate Jaredite expedition and boatyard; combine Mormon's record-preservation periods with explicit time labels. Review must challenge mechanical overlap, sacred gating, Mormon's age, Moroni identity, and gallery capacity.

## Game designs and file interfaces

All builders take `(scene: THREE.Scene): WorldData`, return `adventure(hooks): AdventureRuntime`, set named landmarks/initial objective/bounds, expose useful read-only snapshots for QA and dispose idempotently. Actors may use new roles once the cast worker adds them. Each module owns its tests and `docs/stories/<id>.md`. Keep helpers narrow; reuse existing scenery and warWorld if useful but change atmosphere/layout enough to avoid eight identical sandy plazas.

### Task 1 — A People of Peace (now)

**Files:** `src/game/worlds/final/peace-city.ts`, `peace-city.test.ts`, `docs/stories/peace-city.md`. Export `buildPeaceCity`; id `peace-city`.

**Source:** [4 Nephi 1:1–18, 23–49](https://www.churchofjesuschrist.org/study/scriptures/bofm/4-ne/1?lang=eng). Rebuilt cities and shared goods are grounded; the specific restoration is an invented everyday vignette. Set the playable peaceful portion decades after Christ's visit; optional epilogue honestly notes later divisions over generations.

**Playable loop:** A bright rebuilt stone-and-timber city of connected courts, open workshops and gardens. Restore a usable footbridge across a shallow garden channel by carrying two beams from separate reachable workshop paths to matching sockets; each visibly appears as a supported walkable deck segment. Walk across the restored span and deliver a shared garden supply to the far storehouse. The channel has a longer safe ford route for access and retries, but crossing the completed span is an actual objective. Do not block the ford with invisible walls. Supply movement and assembly, not dialogue, advance the state. Optional roof circuit, potter courtyard and spring garden. Distinct unnamed artisans and families using approved rigs; player `peace-builder`. Show source/context and peaceful everyday life without claiming invented infrastructure is scripture.

**Verification:** failing behavior tests before code; real stepPlayer full route delivering both beams and supply, physical bridge support, blocked walls/trunks + bypass, optional discovery, completion once, safe reset with carried object, callbacks after disposal. A player holding interact at spawn cannot complete. Materials/buffers disposed.

### Task 2 — Mormon and the Hidden Records (now)

**Files:** `src/game/worlds/final/mormon-records.ts`, `mormon-records.test.ts`, `docs/stories/mormon-records.md`. Export `buildMormonRecords`; id `mormon-records`.

**Sources:** [Mormon 1:1–5](https://www.churchofjesuschrist.org/study/scriptures/bofm/morm/1?lang=eng), [2:17](https://www.churchofjesuschrist.org/study/scriptures/bofm/morm/2?lang=eng), [4:23](https://www.churchofjesuschrist.org/study/scriptures/bofm/morm/4?lang=eng), [6:6](https://www.churchofjesuschrist.org/study/scriptures/bofm/morm/6?lang=eng).

**Playable loop:** Brief written context: Ammaron instructed Mormon as a child; MANY YEARS LATER adult Mormon retrieves the records during the later withdrawal described in 4:23. A verdant rock-and-water valley, forked ascent to a hill chamber, supported ledges/ladder route, and lower sheltered return path. Player `mormon` scouts a stable route and transports a visible record bundle back through the valley to a refuge; carrying changes the practical preferred path. Route challenge comes from real elevation/obstacles and a timed environmental hazard with readable safe waits and fair recovery (fall/knockback resets current bundle to safe checkpoint, never erases progress). Do not invent a combat win. Optional spring grotto, abandoned terrace and overlooking archive shelf. After securing the records, explicitly jump to much-later Cumorah and narrate Mormon preserving most records and entrusting a few plates to his son Moroni; no immediate child retrieval, no claim all Shim records were delivered directly at age24. No battlefield play or victory fanfare for destruction. Do not put elderly Ammaron physically alongside adult Mormon without a clearly labeled earlier context.

**Verification:** actual stepPlayer ascent/retrieval/return (not teleported targets), solid ridges/trunks and route around, landing/climb as used, checkpoint recovery/carry ownership, optional paths, completion once, dt limits, disposal. Safe standard gameplay camera preferred over untested cinematic shots.

### Task 3 — Jared's Wilderness Journey (scheduled)

**Files:** `src/game/worlds/final/jared-expedition.ts`, colocated tests, `docs/stories/jared-expedition.md`. Export `buildJaredExpedition`; id `jared-expedition`.

**Sources:** [Ether 1:33–43](https://www.churchofjesuschrist.org/study/scriptures/bofm/ether/1?lang=eng), [Ether 2:1–7, 13–15](https://www.churchofjesuschrist.org/study/scriptures/bofm/ether/2?lang=eng).

**Design:** Explicit flashback to a much earlier people, narrated from Moroni's abridgment. A green valley opening into wilderness, marsh stepping paths and a broad canyon crossing. Gather a pair of animals by proximity herding through actual collision-aware gates; carry a protected fish vessel and seed basket via safe paths to the traveling camp; include visible birds and hives as story dressing/source context, not an implausible bee combat minigame. Player Jared, brother as distinctive NPC. An optional ridge signals a shorter route but a broad ground route remains. Completion reaches the shore camp after a condensed journey, not an invented duration. No exact real-world map. Mechanic: herd steering and route planning rather than three identical fetch tasks.

### Task 4 — The Barge Builders (scheduled)

**Files:** `src/game/worlds/final/jared-barges.ts`, tests, `docs/stories/jared-barges.md`. Export `buildJaredBarges`; id `jared-barges`.

**Source:** [Ether 2:16–25](https://www.churchofjesuschrist.org/study/scriptures/bofm/ether/2?lang=eng).

**Design:** Large sheltered shore/boatyard, eight represented closed vessels with at least one accessible cutaway/work area. Carry shaped timber to physically distinct hull supports in a simple spatial assembly puzzle and test the accessible air opening; provide readable matching grain/shape cues, not text quizzes. Changes appear as real solid geometry with walkable work platforms. Narrate tight vessels and top/bottom openings faithfully; imagined construction design clearly labeled. Finish by recognizing the unsolved need for light, leading to Shelem. No sails/rudder/windows, divine revelation button, or claim the specific construction puzzle is scripture. Optional timber loft, tidepool path, bluff lookout. New roles Jared and brother distinct.

### Task 5 — The Sixteen Stones of Shelem (scheduled)

**Files:** `src/game/worlds/final/shelem-stones.ts`, tests, `docs/stories/shelem-stones.md`. Export `buildShelemStones`; id `shelem-stones`.

**Source:** [Ether 3:1–6](https://www.churchofjesuschrist.org/study/scriptures/bofm/ether/3?lang=eng).

**Design:** Brother of Jared carries one secure tray containing sixteen already prepared stones, molten from rock, up a substantial terraced mountain. Do NOT scatter sixteen collectible stones on the mountain. Branching sheltered ledges, climbable ladders and a windy exposed shortcut with clear cues; fair reset to latest safe ledge, no stone loss count. Optional sea arch vista, sheltered spring and high saddle. At summit a short reverent light transformation is witnessed; no light/faith power meter or timing score causes the miracle. Do not portray invented divine appearance in a casual minigame. After fixed scene the illuminated tray can be carried down a distinct accessible return path.

### Task 6 — Light upon the Waters (scheduled)

**Files:** `src/game/worlds/final/jared-crossing.ts`, tests, `docs/stories/jared-crossing.md`. Export `buildJaredCrossing`; id `jared-crossing`.

**Sources:** [Ether 2:20](https://www.churchofjesuschrist.org/study/scriptures/bofm/ether/2?lang=eng), [Ether 6:2–12](https://www.churchofjesuschrist.org/study/scriptures/bofm/ether/6?lang=eng).

**Design:** Storm-driven barge with an accessible upper/lower work aisle, sixteen-stone context (two lights per vessel), visible supplies and animal pens. Spatially reach a vent during readable above-water calm intervals, secure a loose provision in a sheltered bay, and care for animals during several distinct storm phases. No instant lethal breath timer: missed window waits for another, setbacks are recoverable. Wind drives vessel; no sails, steering or player-created wind. Keep motion visual/camera gentle, avoid inverted nausea; represent submersion with lighting/sound/closed vent. Explicitly condense the 344-day crossing. Finish with shore landing and free beach exploration. Optional interior family stories, storage alcove and coast vista without extra sacred gates.

### Task 7 — Ether's Refuge (scheduled)

**Files:** `src/game/worlds/final/ether-refuge.ts`, tests, `docs/stories/ether-refuge.md`. Export `buildEtherRefuge`; id `ether-refuge`.

**Sources:** [Ether 13:13–14](https://www.churchofjesuschrist.org/study/scriptures/bofm/ether/13?lang=eng), [15:33–34](https://www.churchofjesuschrist.org/study/scriptures/bofm/ether/15?lang=eng).

**Design:** A cave refuge with multiple exits, moonlit ruins and safe distant lookout terraces. Player Ether chooses two nighttime observation routes using occlusion/crouch and returns to preserve the account. Patrol presence is restrained/distant with visible awareness cues; caught resets to refuge, no killings or battle trophies. Avoid arbitrary fetch items and never make the final destruction preventable. Most historical events are summarized compassionately, not animated carnage. Optional water cavern, high skylight and abandoned garden tell of lost ordinary lives. The last scene places completed records where later people may find them without asserting a specific archaeological location. Loneliness means multiple friendly NPCs are inappropriate here; environmental discoveries replace crowds.

### Task 8 — Moroni's Farewell (scheduled)

**Files:** `src/game/worlds/final/moroni-farewell.ts`, tests, `docs/stories/moroni-farewell.md`. Export `buildMoroniFarewell`; id `moroni-farewell`.

**Sources:** [Mormon 8:1–5](https://www.churchofjesuschrist.org/study/scriptures/bofm/morm/8?lang=eng), [Moroni 1](https://www.churchofjesuschrist.org/study/scriptures/bofm/moro/1?lang=eng), [10](https://www.churchofjesuschrist.org/study/scriptures/bofm/moro/10?lang=eng).

**Design:** Distinct autumnal refuge valley with winding ravine, accessible shelter and final expansive dawn vista. `moroni-keeper` transports inherited plates via a navigational endurance route with shelter/checkpoints and one environmental path puzzle; preserve quiet dignity and agency, not repeated delivery checkboxes. A brief refuge-writing sequence introduces abridgment of Ether (read-order flashback) and final invitations to remember and come unto Christ. Do not show a known modern state/location as the final hiding place. No prayer quiz, testimony meter, collect-to-unlock confirmation, or reward for grief. End with hopeful return-to-gallery/free exploration and all stories replayable. No invented companions alongside a narrator who explicitly says he is alone.

## Shared integration task

**Files:** runtime `worlds.ts`, `world-loading.ts`, `progression.ts`, `scene-entry.ts`; conference `gallery-layout.ts`, `gallery-paintings.ts`; relevant tests; README count and source notes.

- [ ] Add only implemented worlds to StoryId/WorldId/order/titles, both dispatch paths and chapter banners. Scheduled empty stubs must not appear in the player's menu.
- [ ] New sequence after christ-bountiful: peace-city, mormon-records, jared-expedition, jared-barges, shelem-stones, jared-crossing, ether-refuge, moroni-farewell. Existing saved completion must detect additions naturally, not silently mark them complete.
- [ ] Keep optional exploration after completion for all eight; ensure complete fires exactly once and disposed callbacks do nothing.
- [ ] Fix gallery capacity to accommodate 26 later paintings in three side-hall floors. Prefer five slots per wing per floor (10/floor) with supported z range and collision-free caption/portal spacing; preserve first six entrance paintings. Test stairs, upper-hall reachability and painting entry/exit.
- [ ] Generate one beautiful portrait oil painting per scene via built-in imagegen; final JPEG assets in `public/art/gallery/<id>.jpg` at ~1024 long edge. Distinct subject/mood; no lettering/borders/watermarks, architecture/costumes imagined. Save prompts + primary links in docs/reference/final-gallery-paintings.md. Do not deploy references outside repository or temporary placeholder art.
- [ ] Fix brittle tests expecting the previous end-of-order suffix while preserving their original assertions about relative sequence and discovery of new stories. Expand disposal/lazy loading tests to new worlds.
- [ ] Verify normal browser entry routes from gallery, each scene's complete main mechanic, optional route, desktop and phone aspect ratios; use QA public controller helper for real walking, not teleporting. Query start okay for extra scene inspections but not sole normal-route proof.
- [ ] Run `npm test`, `npm run build`, `npm run format:check`; review diffs, fix findings; commit and integrate/push main to personal repo. One deploy check if necessary, no repeated pipeline monitoring.

## Review focus and evidence ledger

1. Carried objects remain attached and safely reset; movement-based completion cannot be bypassed by idle presses.
2. Every physical ascent, bridge, ladder and return route passes actual stepPlayer traversal and correct collision/landing.
3. Gallery capacity changes never move portals into roof gardens, auditorium or stair wells and leave jump-entry space.
4. Chronology and character identity remain source-correct; miracles/tragedies never become controllable rewards/outcomes.
5. Hidden pages and disposed scenes stop simulating; buffers/materials/loaded textures and lights are released.

### Current status (update before ending every implementation batch)

- [x] Existing endpoint and adaptation audit by Sol sub-agent; primary sources examined.
- [x] Eight-game lineup chosen; additional adversarial review dispatched.
- [x] Isolated worktree and baseline: 485 tests passed, zero failures.
- [x] 2:15 a.m. one-time heartbeat created in this chat (id above), remaining-six prompt includes delivery and verification.
- [x] Adversarial review approved with route-changing bridge, differentiated carrying expedition, explicit Shim/Cumorah chronology, playable storm agency and robust night routes; all folded into designs above. Gallery capacity fix uses five bays per wing per floor.
- [x] Task 1 implemented; 2/2 colocated tests pass with continuous routes/roof/trunk/ford/bridge/retry. Browser main loop completed with public controller input.
- [x] Task 2 implemented; 5/5 colocated tests pass including full ascent/return, ladder climb/landing, hazard/carry checkpoints and optional discoveries. Browser complete: normal painting entry, continuous ascent/record pickup/east-stair carrying return to refuge, once completion and explicit Cumorah epilogue.
- [x] Seven distinct cast profiles implemented; 27 targeted cases verified across initial suite and seam correction rerun. All7 hero/NPC browser turn, reversal and crawl sampled. Report /private/tmp/final-cast-report.md.
- [x] First two paintings generated, saved as 768x1024 JPEGs, integrated and inspected. Prompts/provenance in docs/reference/final-gallery-paintings.md.
- [ ] First-quarter delivery: integration and independent review clean; build and formatting pass. Initial full suite 495/496 passed; only new JPEG size budget failed, both re-encoded to 316351/338208 bytes and asset tests 2/2 pass. Final full rerun: 496/496 pass, zero failures (334.2s). Objective copy shortened after phone inspection; focused Mormon tests 5/5, final build and format check pass. Browser normal hub/stairs/gallery entry and return plus both main mechanics complete; phone ascent/carrier and visibility-event pause/workload checked. Commit/PR/release pending.
- [ ] Tasks 3–8 implemented and individually verified overnight.
- [ ] Remaining six paintings generated and inspected.
- [ ] All 32 adventures accessible/playable, final verification/review/deployment.

### Autonomous overnight execution strategy

At wakeup read this ledger and git first. If the first-quarter PR has merged, fetch main and create a fresh codex/final-adventures-overnight branch in this retained worktree before further changes. If it is still pending, finish or incorporate it deliberately before opening another PR. Use a pair of scene builders with exclusive module/test/source files while the coordinator integrates and generates art. Build in small verified waves (expedition+barges, Shelem+crossing, Ether+Moroni). Keep agents brief and source-grounded. Do not spend reset capacity rewriting the plan or duplicating completed cast work. Persist exact test evidence and remaining gaps here; do not report the 8 a.m. goal achieved unless all six games are built, verified and delivered.
