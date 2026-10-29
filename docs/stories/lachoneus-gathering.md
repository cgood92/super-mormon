# Lachoneus's Gathering

Primary sources read before building: [3 Nephi 3](https://www.churchofjesuschrist.org/study/scriptures/bofm/3-ne/3?lang=eng) and [3 Nephi 4](https://www.churchofjesuschrist.org/study/scriptures/bofm/3-ne/4?lang=eng).

3 Nephi 3:12–26 describes prayer, gathering households and provisions, fortifications and Gidgiddoni's refusal to attack the robbers in their own territory. 3 Nephi 4:1–4 describes abandoned lands and years of stored provisions; later events include battles and gratitude to God. The adventure ends at preparation. It neither changes a historical outcome nor depicts executions or invents a player-won victory.

The valley, architecture, spring, orchards, routes, watchtower, every spoken line, errands, individual family, costumes and player role are imagined adaptations. Three loads condense a vast communal undertaking; this is not an assertion about exact geography, farming, material culture or chronology. Lachoneus and Gidgiddoni use distinguishable approved Lehi/Moroni rigs as visual stand-ins, with explicit dialogue identifying them as later people. Unnamed supporting people are invented.

## Play

The 160 × 180 valley offers two refuge entrances, broad paths around a rock ridge, three stores, open courtyard rooms, seven inhabitants, a jumping stair lookout and optional discoveries. Interact picks up a single load. Reaching the granary deposits it automatically. Conversations provide context and route advice but never gate progress. Approaching the family recruits it; movement guides its collision-aware parent, and the child follows. Stay within ten paces and wait at turns. The family never dies, and it waits if left behind. A fall returns the current load and resets an unsheltered family while preserving deliveries and discoveries. Completion requires all deliveries and the family's physical arrival and fires once.

The blue beacon identifies the next supply, delivery or escort target. Objectives report loads, carrying state and family status. Runtime snapshots expose target coordinates, family position, delivered IDs, discoveries, phase and disposal state for QA.

## Verified route coordinates

Coordinates below are `(x,z)`; ground height is zero.

- Start `(0,-7)`. Orchard: `(-39,-7)` → `(-39,38)`. Return via `(-39,-7)` → `(0,-7)` → granary `(0,-37)`.
- Alternate eastern entrance: granary → `(0,-19)` → `(49,-19)` → `(49,12)` → `(40,12)` → east store `(40,16)`. Reverse to return. This avoids the stair platform and farm bin.
- South supply: granary → `(0,-7)` → `(16,-7)` → `(16,62)`, then reverse.
- Family: `(0,-7)` → `(-35,-7)` → `(-35,62)`. Lead slowly back through `(-35,-7)` → `(0,-7)` → `(0,-37)`, waiting at corners. Both refuge entrances are physical openings.
- Spring `(-59,28)` via western lane. Weaver court `(-24,-55)` through its southern doorway. Watchtower `(30,-35,y=3)` via `(30,-20)` then jump up the stair terraces.

`node --import tsx --test src/game/worlds/third-nephi/lachoneus-gathering.test.ts` verifies complete provision and escort routes with actual `stepPlayer` calls, repeated spawn interaction not completing, both entrances, wall blocking, lookout jumping/landing, optional spring, retry and idempotent resource disposal. Scene collision validation passes. The scene has one shared ground owner; foreground walls, bins, terraces, ridge, basin and tree trunks have shared visual/collision dimensions. Plants/fruit are batched by the shared landscape helper, which disposes instance buffers. Browser and aspect-ratio checks are handled by the integration coordinator.
