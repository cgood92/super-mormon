# Super Mormon prototype checks

This prototype replaces the earlier mini-game catalog. Source modules are `src/super/physics.ts`, `input.ts`, `character.ts`, `camera.ts`, `interactions.ts`, `art.ts`, `worlds.ts`, and the application in `src/main.ts`.

## Verified

- 74 automated tests: analog camera-relative movement, acceleration and stopping, variable-height jumping, coyote time and jump buffering, short stairs, walls, raised platforms, ceiling clearance, touch and controller edges, lost pointer capture, key repeat, native modal button activation, character animation and height, camera obstruction and lateral movement without spiraling, world routes, chronological unlocking, advanced jumps, crouch collision and visual bounds, ledge/pole traversal, carry-object physics, N64 profile validation, capture/release behavior, and camera distance controls.
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

Physical phone and controller testing is still useful for judging comfort and game feel. Full screen and orientation locking are requested after Start; actual support depends on the browser/device. The hub is an imagined Conference Center gallery; ancient routes, buildings, treasure placements and guard encounters are artistic gameplay adaptations. No Nintendo assets or level layouts are used.

## N64 controller mapping

The connected physical device reports `usb gamepad (Vendor: 0810 Product: e501)` with two axes, ten buttons, and an empty browser mapping. This identifies raw controller input, not physical button labels. No fixed mapping was guessed from this shared chipset ID.

Browser test used a virtual raw controller with deliberately scrambled button indices. The complete nine-button setup was played through with fresh presses/releases and saved with the mapped A button. Gameplay then verified A jump, B with no camera change, Z crouch, Start pause, C-left 45-degree orbit, C-up closer camera with no jump, and C-down with no crouch. The dialog fits 667×375 without scrolling, and the console has no errors or warnings. The user must perform calibration on the real controller to establish its physical labels.
