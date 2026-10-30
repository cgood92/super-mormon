# Final six adventures — overnight verification

Resumed at 2:15 a.m. Mountain on October30. Three Sol builders implemented two worlds each under exclusive file ownership; coordinator integrated the 32-story order, both dispatch paths, chapter labels, free exploration, gallery art and player booklet. Existing cast profiles were reused without costume changes.

## Actual gameplay checks

All route tests use real `stepPlayer`, with semantic scenery collision validation, once-only completion and inert disposed runtimes. Browser tests use `/tools/qa/playthrough.js` to supply ordinary controller input and read snapshots. No player-position teleporting or runtime state mutation was used.

- **Jared’s Wilderness Journey:** real animal pair follows through canyon/gate to shore; fish and seeds carried through alternate paths. Browser completed both supplies and animals. Optional ridge stairs, marsh/hives and solid animal geometry inspected. Fair cargo recovery tested.
- **The Barge Builders:** eight represented closed vessels; three different material fits reached through work platforms, then an actual airflow route/vent close. Browser completed all fits and air test. Optional loft and relocated bluff landed on their supported surfaces. Phone390×844 inspected. Final geometry adjustments rechecked with continuous physics routes.
- **Shelem:** full12m ascent with all16 stones together in a secured tray; reverent illumination; distinct east-stair return completed in browser. All three optional sites, wind recovery, ladder climb and landing tested. No collectible stone hunt or scored miracle.
- **Light upon the Waters:** supply lashing, animal feed, calm vent opening/manual closing and compressed344-day arrival completed on desktop and phone. Beach lookout reached at y3. Home returns correctly to its third-floor painting; a normal jump reentry succeeded.
- **Ether’s Refuge:** desktop/phone observation routes, actual cover/crouch/solid-occlusion stealth, return writing completion; all three discoveries reached on phone, no recoveries in the completed route. The destruction remains an unchangeable narrated event.
- **Moroni’s Farewell:** physical timber pivot, carrying crossing, shelter writing and dawn reached on desktop and phone; all three optional places reached on desktop, no recoveries. Records rest on a physical table after writing. Moroni is Mormon’s son, not CaptainMoroni; no exact burial location claimed.

Workers’ targeted scene suites all pass. After the final review fixes, the coordinator full suite passed519/519 with zero failures (373.6s); production build, formatting and whitespace checks passed. Release state is tracked in PR31.

## Gallery and camera checks

The coordinator used an explicit prior31-story save fixture solely in the isolated `overnight-gallery-qa` browser context. User progress was untouched. Starting at the real gallery entrance, the controller walked both public stair flights and the third-floor west hallway, then jumped into Moroni’s painting normally and completed the pivot, carrying crossing, shelter writing and dawn through controller input. A short detour to x48 around the upper stair exit preserved a continuous supported route. All32 portal routes and jump contacts also pass the cross-world physics test.

The existing QA `enter()` helper assumes a ground-floor starting position. It cannot be used unchanged after Home returns to an upper-floor painting; initial reports of a trapped return were driver errors. Immediate Crossing return was verified at(70.38,24,-70), then the outward hall approach and reentry worked. No production return-spawn change was needed.

Standard collision-aware cameras are used; no new authored cinematic path was introduced. Desktop and portrait scene views were inspected. Moroni sample:121 render calls,257236 triangles,59 geometries,4 textures at the inspected desktop view; emulated viewport diagnostics are not an on-device FPS guarantee. Repeated foliage/wood details are instanced, with instance-buffer disposal covered by tests.

## Independent review and fixes

The adversarial reviewer inspected all six scenes, integration and source notes. Two findings were fixed and independently re-reviewed:

1. Final Shelem treads overlapped terrace tops coplanarly. Regression raycasts first reproduced two owners, then fitted stair intervals ended exactly at shelf edges. All reported joins and the return join now have one physical owner and one rendered top hit; full traversal remains green.
2. The boatyard had a brother-of-Jared NPC while the player was the same person. An identity regression reproduced the duplication; the NPC is now an unnamed Shipwright using a distinct approved rig, with Jared still present and the player identity retained.

A stale gallery test assumed an unassigned landscape at a now-occupied bay. It now derives actual unassigned bays from portal assignments, verifies real frame collision, and checks jumps against those bays. No gameplay collision was weakened.

## Paintings and cleanup

Six original built-in imagegen paintings were generated, inspected and saved as768×1024 JPEGs below400000 bytes. A crossing-art edit removed extra lights so two stones remain, one at each end. Full prompts and artistic-interpretation notes are in `docs/reference/final-gallery-paintings.md`; all originals are retained outside deployment. No final placeholder artwork.

Each worker closed only its own QA tabs and restored controller overrides. Coordinator closes its own local/public verification tabs and stops the local server after release. Unrelated Workfront tabs are preserved.
