# Approved movement and trailing camera integration

> Execute in the existing isolated worktree. The user approved the live experiment and asked to put it into the game; no additional design approval is needed.

**Goal:** Use the approved middle movement preset, its 17° travel-direction lean, gentler analog response and low geometric trailing camera in the game.

**Architecture:** Keep one canonical physics solver, motion driver, input mapping and FollowCamera. Promote the experiment's behavior into those existing modules, preserving special moves, authored/cinematic shots, scene loading and camera obstruction handling. Remove throwaway duplicate modules after integration and keep research notes in docs.

**Spec:** User approval in this chat; exact prototype at commit 392be6c plus the 0.045 travel-lean tuning committed there. The reference is SM64; this is our own approximation, not a byte-for-byte port.

**Global constraints:** Keep grounded speed 6.5; middle acceleration/braking/reversal/corner acceleration 22/38/52/45. Ground travel lean coefficient 0.045 with 0.35 rad cap. Camera defaults approximately 7.2 distance, 0.2 rad elevation, 1m focus height, modest speed pullback and lead. Retain zoom, manual orbit, recenter, collision, climb/crawl/jumps and device hints. Tests beside modules. Never write saved progress for QA. Use actual browser play routes and close QA tabs. Commit/push verified batches to personal GitHub.

## Review focus

- Camera initially embedded in or swept across walls: recover to a safe view, don't stay stuck or teleport through geometry.
- Authored/cinematic return: synchronize trailing reference with visible camera without a jump or control reversal.
- Analog diagonal/deadzone response: preserve direction, clamp radius, gentle partial input, full keyboard speed.
- Costume on hero/NPC during full-speed reversal and crawling: no exposed inner meshes through covered panels.
- Phone framing and hidden-page lifecycle: visible route, stable ground/jump tracking, no hidden rendering.

## Tasks

1. Movement (Sol worker): write meaningful failing tests for approved ground acceleration and early facing while braking; run them; update production physics to 22/38/52/45 and bounded intended facing; run physics/movement suites. Existing APIs unchanged.
2. Character (Sol worker): failing tests for equal lean across cardinal/diagonal headings, velocity-lag reversals and settle; promote approved gait and world-acceleration travel lean into character-motion; preserve all action overrides and costume geometry; run character tests. Existing APIs unchanged.
3. Camera and input (root): update tests to require sustained lateral circling and low perspective; cover straight following, recenter/manual/zoom, dynamic wall obstruction and embedded recovery. Add input tests for half-stick magnitude/diagonal direction. Implement geometric trailing in existing FollowCamera, retain collision and authored shot integration. Apply quadratic magnitude shaping in Input exactly once.
4. Integration: run npm test and npm run build. Investigate actual regressions; update tests only for intentionally changed behavior. Exercise normal browser routes in hub, streets/interior, obstacle-heavy story world; inspect desktop/phone and costumes during turns/crawl. Remove duplicated throwaway code, preserve research notes. Independent review before final commit/push and PR.

## Progress

- Movement complete: approved tuning and intended facing; special moves and genuine ledge grabs retained. Shallow stair descent no longer grabs nearby furniture.
- Character complete: 17° world-directed lean, fuller gait, floor contacts, bounded/reset stopped anchors, full per-frame foot reset and a short explicit ankle cuff. Repeated-turn shoe detachment reproduced and fixed.
- Camera and input complete: trailing geometry, low perspective, analog curve, zoom/orbit/recenter, authored return and obstruction recovery.
- Integration complete: npm test 665/665 passing; npm run build and changed-file formatting checks passed. Desktop/phone browser routes covered gallery painting entry, Jerusalem, house wall/corner traversal and mountain jumping, plus hero/NPC costume poses and hidden-page suspension.
- Independent review: initial P1 accumulating local shoe X correction fixed and regression-tested; scoped re-review approved. Minor obstruction hint remains based on requested sightline shortening, consistent with existing obstruction semantics.
- Packaging: remove inherited unrelated CODEOWNERS commit from this feature branch by rebasing only this chat's commits onto origin/main; leave original experiment branch intact. Commit/push verified production changes and open a pull request.
