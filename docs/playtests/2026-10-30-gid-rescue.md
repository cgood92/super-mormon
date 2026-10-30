# City of Gid playtest changes — October 30, 2026

## Behavior

- Wine-drinking guards, including four guards around the courtyard, finish lying on the earth. Fall placement uses actual rendered bounds rather than raising a partially tilted actor.
- Arms attach to Moroni's animated right palm. Two deliveries require entering the city with existing jumps/wall-kicks, then dropping the arms on courtyard ground. Exterior, airborne and roof interactions do not deliver supplies.
- Two prisoners walk to each dropped bundle using collision-aware courtyard paths. Their swords attach at the palm. Drops no longer require a hidden throw point, cardinal direction or another dialogue.
- Once all four prisoners are armed, an automatic six-second dawn view shows the timber gate rising. Visible gate and collision lift together. Lighting changes with the sky. Prisoners follow the player inside, then use the gate to follow outside.
- Near the captain, the device's action button receives the surrender after everyone has emerged. Completion is bloodless and recorded once.

## Validation

- Six colocated tests cover grounded sleepers, arbitrary interior drops, exterior/air/roof rejection, collection behind houses/at walls, a complete `stepPlayer` supply route with wall-kicks both ways, gradual gate clearance, following/waiting, surrender, phone/desktop dawn framing, embedded camera recovery, hand sockets through turns, and equipment disposal.
- Normal browser playthrough used keyboard movement from spawn, wine/report/cache interactions, repeated wall-kicks for both deliveries and the return trip, automatic collection, the opened gate and surrender. Completion returned to the gallery with `gid` in the completed list. No story targets were teleported to and no saved progress was edited.
- Inspected rendered grounded guards, carried arms, prisoner swords and the phone portrait dawn view. Camera regression checks cover desktop and portrait throughout gate motion.
- Portrait startup workload: 583 draw calls, 755,504 triangles, 308 geometries, 15 textures at balanced render scale 1.25. This is a desktop-browser workload sample, not a physical phone frame-rate benchmark. No game console errors; the existing PCFSoftShadowMap deprecation warning remains.
- Full repository run: 527 tests passed. After the final follower assertion and socket/disposal coverage, the focused Gid + war-adventure run passed 12/12. Production build and changed-file formatting checks pass. Independent code review found no actionable issues; the final follow-before-exit adjustment has an additional regression assertion.

## Scripture and staging

See [source notes](../stories/war-level-sources.md). Alma 55 describes casting weapons in to the prisoners and surrender after the Lamanites see armed prisoners within and Nephites without. Carrying bundles inside, wall-kicks, collecting dropped bundles, the rising gate and pre-surrender procession are explicit gameplay adaptations.
