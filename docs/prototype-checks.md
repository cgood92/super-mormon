# Super Mormon prototype checks

This prototype replaces the earlier mini-game catalog. Source modules are `src/super/physics.ts`, `input.ts`, `character.ts`, `camera.ts`, `interactions.ts`, `art.ts`, `worlds.ts`, and the application in `src/main.ts`.

## Verified

- 105 automated tests: analog camera-relative movement, acceleration and stopping, variable-height jumping, coyote time and jump buffering, short stairs, walls, raised platforms, ceiling clearance, touch and controller edges, lost pointer capture, key repeat, native modal button activation, character animation and height, camera obstruction and lateral movement without spiraling, world routes, chronological unlocking, advanced jumps, crouch collision and visual bounds, ledge/pole traversal, carry-object physics, N64 profile validation, capture/release behavior, controller glyphs, menu navigation, and story mission phases.
- Gallery launch points and real browser running-jump entry through paintings into all three scenes.
- House controller playthrough: four lower treasures, upper gallery and fifth treasure, entrance completion, saved progress, and return to gallery. Uses the real `Input` polling and frame loop; no teleporting or direct changes to runtime state.
- Lehi street controller playthrough to his door, including guard pursuit and completion.
- Laman controller playthrough: approach around the benches, dialogue remains visible, escape by jumping all three low obstacles, reach brothers beyond the gate, completion.
- Browser checks caught and fixed reversed camera-relative strafing, excessive continuous orbit speed, camera spiraling, a blocked roof landing, tall-chest line of sight, and focused-button Space behavior.
- Mobile touch viewport 667×375: full-viewport gameplay, no page scrolling, visible movement/jump/action/recenter controls and objectives. No browser console errors or warnings in the final layout check.
- Production TypeScript/Vite build and Prettier checks pass.
- October 21 feedback: new scene paintings load successfully; locked painting prompt blocks entry on a fresh save; real controller street completion unlocks palace, house remains locked, palace completion unlocks house and browser enters it. Completed legacy saves retain replay access.
- Caught sequence observed in the browser through all three phases (caught, wipe, safe spot), followed by restored controls and checkpoint state. Uses one soft transition rather than repeated flashing; reduced-motion styles remove animated transitions.

## Advanced moves, October 21

- Browser keyboard/controller input confirms crouch/crawl through the gallery arch, forced crouch after release under its ceiling, long jump, backflip, side somersault, consecutive jump/double/triple chain, wall kick, practice-block ledge traversal, pole climbing and jump detach. No runtime teleport or state setters used.
- Optional gallery discovery tokens collected through crawling, pole climbing, jumping and ledge traversal. Carrying, throwing with an airborne trajectory, picking up again, crouch-setting-down and completing the delivery ring were played through.
- Fresh house controller regression: four lower treasures, stairs, fifth upper treasure, return and completion all work with the advanced movement engine.
- Streets and palace controller regressions also complete: Lehi reaches his blue door; Laman speaks with Laban, jumps the three benches, and reaches his brothers.
- Mobile 667×375 landscape: no page overflow; crouch toggles through the actual button, button state is visible, and the moves guide fits without internal scrolling. No browser warnings or errors in this check. Physical phone comfort remains a playtest question.
- Review fixes include visible ledge hang before automatic pull-up, forced-crouch crawl speed and animation, climb ceiling collision, NPC traversal opt-out, swept ledge pull clearance, and a minimum long-jump boost for touch crouch toggle.

## Playtest driver

`tests/super-playthrough.js` supplies legal virtual controller input and observes a read-only runtime snapshot. Use a preview URL with `?playtest` to enable the snapshot, then import the driver from the Vite development server. The world/physics tests also exercise the actual level solids directly.

Physical phone and controller testing is still useful for judging comfort and game feel. The splash automatically enters the gallery; browser-native full screen and orientation locking require a user gesture and device support. Full screen remains available in Pause. The hub is an imagined Conference Center gallery; ancient routes, buildings, treasure placements and guard encounters are artistic gameplay adaptations. No Nintendo assets or level layouts are used.

## N64 controller mapping

The connected physical device reports `usb gamepad (Vendor: 0810 Product: e501)` with two axes, ten buttons, and an empty browser mapping. The user's saved calibration was read from the local and deployed game origins: A=5, B=4, Z=8, Start=9, R=7, C-left=3, C-right=1, C-up=0, C-down=2. That measured profile is now the built-in default for the matching ID and button/axis counts. Browser-saved calibration takes priority; other raw adapters retain setup because the chipset ID alone does not establish button labels.

Earlier browser testing used a virtual raw controller with deliberately scrambled button indices. The complete nine-button setup was played through with fresh presses/releases and saved with the mapped A button. Gameplay then verified A jump, B with no camera change, Z crouch, Start pause, C-left 45-degree orbit, C-up closer camera with no jump, and C-down with no crouch. The dialog fits 667×375 without scrolling.

## Latest feedback and new missions

- Mobile startup: after the splash, a two-button dialog offers Enter Full Screen (recommended) or Continue. Browser checks at 667×375 and 390×844 show no page overflow; a real button click enters native fullscreen and requests landscape, while Continue resumes play. Desktop 1728×997 enters the gallery directly.
- Automatic splash enters the gallery without a start button. Chapter heading fades after ten seconds, and the objective moves upward and grows. Stories, Treasures and Tokens have text labels.
- A virtual raw pad matching the measured adapter, with no saved calibration, selects N64 glyphs and jumps using button 5. Keyboard glyphs disappear on connection and return on disconnect. Blue A, green B and yellow C shapes are rendered; joystick down selects Moves & practice and A opens it.
- The left studio is reachable through its open doorway. Nearby lessons explain the actual buttons for crawl, ledge, pole, jump chains, wall kicks, carrying, long jump, backflip and side somersault. Mobile 667×375 gameplay, lesson and Pause layouts fit without page scrolling.
- Real browser controller-input playthrough of The Treasure Offer: approach Laban with three following brothers, refusal dialogue, servant pursuit, crossing the city gate, gathering in the cave, completion and unlocking Jerusalem by Night. The revised neighborhood requires turns through side streets while servants pursue from Laban’s court.
- Real browser controller-input playthrough of Jerusalem by Night: enter the gate, find Laban, brief scripture recap and disguise, speak to Zoram, wait for him at the records, collect and carry the brass plates, return through the gate with Zoram, rejoin the brothers and complete the scene. The isolated test save began with the three legacy scenes completed; trade and night were completed through movement and actions without runtime teleporting.
- Review and regression checks cover gate crossing before completion, companion arrival before gathering, NPC routes around walls, airborne clearance of guards, younger clean-shaven Nephi, waving brothers, eased C-camera steps, and camera collision during orbit/zoom easing.

## Denser Jerusalem and carried treasure

- Browser controller-input playthrough confirms four separate carried treasure parcels on approach, transfer to Laban’s court on refusal, empty hands during pursuit, the winding eastern escape, and all three brothers following into the deeper rock cave. The western route is also verified through the actual player physics.
- Both story scenes share a denser Jerusalem neighborhood with plaster dwellings, flat roofs, palms and an indigo doorway. The cave uses irregular faceted rock sides and roof around a walkable chamber, with a darker interior floor.
- The nighttime browser playthrough searches the western alleys for Laban, crosses the neighborhood to Zoram and the treasury, then returns through the winding streets and gate with the plates and Zoram. Both missions completed without runtime teleporting. No browser errors or warnings were observed.
- Regression coverage includes distinct idle follower positions, treasure seizure persisting after a catch, slower short-range night guards with a short leash, wall-aware prompts/interactions/detection/contact, clear actor spawns, two walkable daytime escape routes, cave clearance and the complete nighttime ground route.
