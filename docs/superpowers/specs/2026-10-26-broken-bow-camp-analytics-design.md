# Broken Bow, canvas camps, crawl silhouette, and gameplay analytics

## Intent and implementation batches

Implement Clint’s October 26 playtest notes in four independently verifiable batches: character equipment/crawl, shared canvas tents, Broken Bow adventure, and Google Analytics. Preserve Three.js/TypeScript/Vite and the personal GitHub Pages deployment. Use Sol agents for independent implementation. This document captures the requested behavior before implementation.

## Broken Bow

1. Start as Nephi holding an intact steel bow. Objective: “Climb the mountain for target practice.” Arms hold the grip while walking; aiming draws an arrow from the other hand.
2. Replace the uniform staircase with irregular boulders, crevices and terraces, including readable jumps, generous landings, a safe descent and fair fall recovery. No advanced move is required. Reuse the mountain for hunting.
3. At the summit practice ledge, count actual released arrows regardless of hits. Exactly the third practice shot snaps the steel bow. Preserve hold-to-draw/release controls and arrow gravity. Pre-practice attempts do not count.
4. Animate the snap and show a short acted family complaint sequence. Return control on the mountain; Nephi must descend. Do not teleport him into camp or alter saved progress. Cameras must safely frame subjects through entrance, watching and return at phone/desktop aspects.
5. Put flexible bow wood and a straight arrow stick in distinct areas separated by a meaningful walk. Use existing nearby interaction controls to collect. After the second pickup, automatically prepare the wooden bow and arrow. Remove the bench and three crafting interactions.
6. Ask Lehi where to find food, then consult the Liahona by the tents, away from Lehi. Preserve that order and readable objectives. The Liahona provides written direction, rather than speaking as a character.
7. Climb again and hunt three animals using the current moving targets and ballistic simulation. Preserve fair repeated shots. Carry recognizable non-graphic hunted animals, or a carcass-shaped wrapped load, secured on the back below the head, following rendered torso/facing. Size and orient the load so it does not cover the head or clip through Nephi.
8. Arriving back at the family with all provisions automatically triggers the closing encounter and completes once. No E press. Arrival includes elevation and grounded checks.

Expand the camp/foothills with canvas shelters, household props, a sheltered side path, a lookout and a brief optional family conversation. Keep the main route clear. Named cast presence must fit chronology; unnamed inhabitants are fine. Preserve gallery painting placement and keep objectives out of the auditorium.

Primary source: [1 Nephi 16:17–32](https://www.churchofjesuschrist.org/study/scriptures/bofm/1-ne/16?lang=eng). Scripture describes the broken steel bow, family murmuring, wooden bow and stick arrow, counsel, guidance on the ball, mountain ascent and return with food. Three-shot target practice is an invented playable opening requested by Clint. Dialogue, scenery, tent appearance, species and chronology compression are artistic interpretation. Record this distinction in repository story notes; do not claim established geography.

## Character equipment and crawl

Expose typed hand/back equipment sockets from the sculpted rig through the adventure integration. Account for avatar replacement. Attach equipment to animated bones rather than positioning props independently before avatar animation. Derive projectile release from the nock transform. Clean up equipment and poses on phase change, retry and disposal.

Root cause of flat crawl: `playable-lehi.ts` gathers low rear coat vertices into a narrow band and pushes them forward. A probe compressed 3,470 rear vertices from a 0.325m vertical span to 0.058m. Replace flattening with smooth localized clearance around bent legs while retaining rear curvature and restoring authored upright geometry. Check upper tunic/cuffs/front insert, trousers and footwear separately. Preserve intentional openings, seam normals, root facing yaw and local body rotations. No buried full skirt, hidden tall boot shafts, per-step hem AABB expansion or independently lagging inner fabric.

## Shared tents

Add a dimension-driven canvas tent helper in `src/super/scenery.ts`, used by Bountiful’s `family-camp.ts` and Broken Bow. Separate geometry from layout: the existing Bountiful tent coordinates overlap the Broken Bow mountain if reused unchanged.

Use sewn sloping/sagging canvas panels, poles, tied entrance flaps and restrained ropes/trim. Preserve open doorways/interiors and Bountiful circulation. Roofs support landing and movement. Derive rendering and fitted thin support bands from one roof profile, or extend the surface primitive if required. Never enclose an entire tent in a collision box. Each walk surface has one owner; avoid coplanar duplicate roofs/floors. Register decoration with explicit reasons.

Root cause of roof falls: current `family-camp.ts` cone canopies are decoration without collision. A `stepPlayer` drop onto a tent center lands on the ground inside it.

## Google Analytics

Use GA4 directly via Google’s web tag. Create/reuse an owner-selected property and web stream for `https://cgood92.github.io/super-mormon/`. Configure the deployment build with the public measurement ID; keep OAuth/API credentials out of source and browser bundles.

Require all of: production build, exact allowed host and game entry path, and no developer/testing entry parameters (`scene`, `playtest`, `performance`, or equivalent). Localhost, local builds, previews, cast/pose tools and test sessions must not load the tag or send events. No durable local analytics queue or separate player identifier. Bound any transient tag-loading buffer and fail safely when blocked. Omit full URLs/query strings, personal text, saved progress payloads and position trails. Disable advertising personalization/signals. Verify Google’s applicable requirements for this child-directed game before enabling collection.

Use stable level IDs and low-cardinality parameters. Count successful behavior, not button presses:

| Event | Meaning |
| --- | --- |
| `level_start` | Successful playable entry, level and first/replay/retry reason |
| `level_end` | Successful completion, active seconds and attempt summary |
| `level_exit` | Unfinished exit, destination/reason, phase and active seconds |
| `level_retry` | Actual manual retry/checkpoint reset and reason |
| `play_time` | Incremental active seconds since previous checkpoint, never repeated cumulative totals |
| `move_used` | Successful jump variants, ground pound, pound jump, pound kick, wall kick, crouch/backflip, crawl, ledge/tree climb |
| `camera_used` | Intentional rotate gesture/recenter, excluding automatic follow and cinematics |
| `secret_found` | First discovery in a session, stable secret ID |
| `activity_used` | Successful organ use, optional conversation or other side activity |
| `story_step` | Objective phase reached, for exit/difficulty analysis |

Group continuous crawl/climb/camera activity into episodes, not frame events. Distinguish tree climbing from poles/vines/ship climbing. Use authoritative completion and discovery hooks. Metrics inform playtesting; counts alone do not establish enjoyment.

Active time excludes loading, pause menus, hidden tabs and cinematics/dialogue, matching the existing `levelTime` clock. Flush incremental time on pauses/exits; avoid duplicate pagehide/visibility/completion/gallery accounting. Page closure is best effort and distinct from explicit gallery return. Emit successful completion at the committed completion state, after any preliminary cinematic. Reset/carry timing consistently across checkpoint retries.

Configure event-scoped dimensions for level, move, camera action, secret/activity, phase and exit reason, and active-seconds metrics. Create reports/explorations for starts/completions, completion rate, active time by level/attempt, unfinished gallery returns, move adoption, camera usage, tree climbing and hidden activities. Use GA’s session/first-visit data for aggregate returning-player analysis. Verify live events through Realtime/DebugView; keep ordinary local QA disabled.

The official Analytics MCP supports reporting/property inspection and annotations; its documented tools do not perform the full initial account/property/stream setup. Chrome is the simplest setup route once Clint signs in. Sources: [Google event setup](https://developers.google.com/analytics/devguides/collection/ga4/events), [official Analytics MCP](https://github.com/googleanalytics/google-analytics-mcp), [property creation API](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1alpha/properties/create).

## Verification and delivery

- Establish baseline in the isolated worktree based on main. Coordinate shared rig/tent interfaces before independent edits.
- Behavioral regressions: third-shot break even on misses, ordered phases/counsel, automatic crafting/arrival, completion once, equipment following hand/back and crawl rear curvature/inner garment containment.
- Semantic collision validation and actual `stepPlayer` routes: blocked walking, walking around obstacles, jump/ledge landings, descent, tent entry and roof landings at multiple positions. Raycast representative surfaces for duplicates and support mismatch.
- Normal controller-driven browser route through Broken Bow, including retry/completion. Inspect hand contact, bundle position, close/distant scenery, mobile/desktop and cinematic path recovery. Check player/NPC crawl at cardinal/diagonal headings, crawl-to-stand, sharp turns and reversals with velocity lag.
- Check mobile rendering workload, instance buffers and disposal. Hidden test pages stop rendering/time accumulation; close only own testing tabs.
- Injected analytics transport tests: production gate/dev exclusions, move deduplication, gesture grouping, pause/hidden timing, exit/completion races, blocked tag and discovery deduplication. Inspect production network events after property setup.
- Run formatting, relevant/full tests and production build. Commit/push verified batches to personal GitHub and provide a reviewable PR. Avoid repeated pipeline polling.

## Account input still needed

Clint signs into analytics.google.com in the Chrome browser exposed to DevTools and identifies an existing property or authorizes a new Super Mormon property. Sign-in and any required account terms remain with Clint. No property, measurement ID, tag or production events have yet been configured or verified.
