# Movement and camera playground (throwaway)

Run `npm run dev -- --port 5178`, then visit `/tools/movement-lab/index.html` for the three-way movement comparison or `/tools/movement-lab/camera.html` for the single-player camera experiment.

These developer pages do not load story progress or write saves. The production controller, character rig and camera are unchanged. `physics.ts`, `motion.ts`, and `rig.ts` are deliberately isolated experimental copies; they should be consolidated into the production modules only after playtesting settles the behavior. The camera page uses movement preset 1 and its current 17-degree full-speed travel lean.

## Research (2026-10-31)

The user's reference is [Super Mario 64, this browser port](https://notan127.github.io/SM64-PC-Port-WebGL/). The port's [repository](https://github.com/notan127/SM64-PC-Port-WebGL) publishes the playable bundle. For readable implementation evidence, consult the independently reconstructed [n64decomp/sm64 code](https://github.com/n64decomp/sm64), rather than assuming the bundle matches a particular upstream revision.

- [`mario.c`, `update_mario_joystick_inputs`](https://github.com/n64decomp/sm64/blob/master/src/game/mario.c): intended direction includes camera yaw; stick magnitude is squared before becoming intended movement magnitude.
- [`mario_actions_moving.c`, `update_walking_speed`, turning/braking actions](https://github.com/n64decomp/sm64/blob/master/src/game/mario_actions_moving.c): speed approaches a target, facing changes at a bounded rate, and sharp reversals/braking use distinct action states. The prototype retains our chosen controller, not these exact constants or actions.
- [`camera.c`, `update_default_camera`, `pan_ahead_of_player`](https://github.com/n64decomp/sm64/blob/master/src/game/camera.c): default camera position is updated using the previous camera-to-player geometry. Focus/panning and movement-reference yaw are separate concerns. Camera modes, floor height and obstruction handling change the result across areas; a single constant automatic-behind rule does not describe all of SM64.
- [Nintendo's Super Mario 64 manual](https://www.nintendo.com/eu/media/downloads/games_8/emanuals/nintendo_8/Manual_Nintendo64_SuperMario64_EN.pdf): analog movement and C-button control of the camera are player-facing features.

## Independently tuned experiment

`TrailingCamera` preserves the prior horizontal camera position before restoring its follow distance. Camera-to-player yaw supplies the next movement frame. Sideward input is tangent to that relationship, so it produces a circle; forward input pulls the camera along. The experiment uses a 7.2–7.9-unit follow distance, roughly 11-degree downward view, 58-degree FOV, limited velocity look-ahead and smoothed jump elevation. These values and the leash model are our approximation, not Nintendo specifications. The optional magnitude curve is quadratic after the existing game's deadzone processing. Keyboard input remains full strength. The existing `Input` class supplies keyboard, touch, gamepad and calibrated N64-controller support.

Switching cameras changes only the camera; both use the selected movement preset. Use the analog stick with a mouse or thumb, or a connected controller. Q/C or right-stick/look dragging orbit the view, R recenters, Space jumps. Demo buttons hold left or forward until stopped; actual movement takes over. A map shows player and camera traces.

## Verification and limits

TypeScript check passed. Browser checks exercised keyboard left/forward, recentering, touch-stick event routing and half deflection, both camera modes, pause-on-hidden handling, desktop and phone framing. A 10-second solver run circled 467 degrees at a maximum radius of 7.9 units while the camera moved about 0.59 units from its initial position. Half stick produced 1.625 units/sec with the curve versus 3.25 without it. The physical gamepad path is reused but no connected hardware was exercised.

The arena is intentionally an open flat physics floor with painted reference lines, without new solid scenery. Camera geometry avoidance calls existing helpers, but obstacle recovery, stairs, indoor routes and story-camera transitions have not been accepted here. This prototype is for movement/camera feel, not production scene validation. No new automated test suite was added. Hidden pages stop rendering and accumulating time; page teardown disposes the rig, GPU resources and input handlers.
