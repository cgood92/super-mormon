# Movement and camera feel

The game uses the movement and camera behavior approved in the October 31 playtests. Ground acceleration/braking/reversal/cornering are 22/38/52/45, with a maximum ground speed of 6.5. Ordinary facing turns toward input while momentum finishes braking. Character lean follows world travel rather than the actor's heading, reaching about 17° at full speed, and relaxes smoothly at rest. Special poses retain their own movement and animation rules.

The follow camera preserves its previous horizontal eye as the movement reference, producing an arc on sustained sideways input and trailing behind forward movement. It uses a lower view, a modest speed-dependent pullback and look-ahead. Manual orbit, stepped camera buttons, zoom and recenter remain available. Authored scenes own the camera while active; follow resumes using the visible eye and eases back to distance. During ordinary following, only the camera eye’s physical movement is checked against solids. A column or building may briefly hide the character without triggering zoom, pitch changes or a search for another view. The eye takes a short, bounded sidestep around a narrow prop when its own path is blocked; broad walls remain barriers. An embedded eye recovers locally to physical safety.

At rest, the default camera turns toward the character’s facing direction at up to 42.1875°/s, or 5.2734375°/s with movement input held against an obstacle. These convert SM64’s goal-angle steps at 30 Hz; our camera uses continuous time and our own physical collision. Moving input retains the geometric trailing behavior. Manual camera positioning suspends idle centering until movement resumes; explicit recenter remains available. Walls may stop the turn.

The palace has four authored camera areas: west passage, audience hall, treasury vestibule and northern treasury. Doorway hysteresis prevents mode chatter. Each transition chooses a clear interior/exterior anchor with a player sightline; a blocked route permits an intentional cut. A transition-only local recovery handles blocked anchors. Indoor eye travel stays within the room and retains swept collision. Held movement keeps its prior world direction through a room cut until release, a deliberate direction change or manual camera input. Authored story cameras retain ownership.

Analog movement strength is squared after the input deadzone while retaining direction. Keyboard input stays full strength. The shared controls support keyboard, gamepad, calibrated N64 profiles and touch.

The throwaway playgrounds were removed after promotion so the game has one physics solver, character motion driver and follow camera. Their original source and research measurements remain in commit 392be6c. The existing developer character visual QA page remains available for rendered costume checks.

## Research (2026-10-31)

The user's reference is [Super Mario 64, this browser port](https://notan127.github.io/SM64-PC-Port-WebGL/). The port's [repository](https://github.com/notan127/SM64-PC-Port-WebGL) publishes the playable bundle. For readable implementation evidence, consult the independently reconstructed [n64decomp/sm64 code](https://github.com/n64decomp/sm64), rather than assuming the bundle matches a particular upstream revision.

- [`mario.c`, `update_mario_joystick_inputs`](https://github.com/n64decomp/sm64/blob/master/src/game/mario.c): intended direction includes camera yaw; stick magnitude is squared before becoming intended movement magnitude.
- [`mario_actions_moving.c`, `update_walking_speed`, turning/braking actions](https://github.com/n64decomp/sm64/blob/master/src/game/mario_actions_moving.c): speed approaches a target, facing changes at a bounded rate, and sharp reversals/braking use distinct action states. The prototype retains our chosen controller, not these exact constants or actions.
- [`camera.c`, `update_default_camera`, `pan_ahead_of_player`](https://github.com/n64decomp/sm64/blob/master/src/game/camera.c): default camera position is updated using the previous camera-to-player geometry. Focus/panning and movement-reference yaw are separate concerns. Camera modes, floor height and obstruction handling change the result across areas; a single constant automatic-behind rule does not describe all of SM64.
- [`camera.c`, stationary yaw and room triggers](https://github.com/n64decomp/sm64/blob/master/src/game/camera.c#L1994-L2085): neutral/default goal yaw advances by 0x100 angle units per 30 Hz frame; held stick uses 0x20 while stationary. Castle and Big Boo’s Haunt use authored doorway/room camera modes and transition rules. Our palace rooms apply that design approach with game-specific anchors.
- [Nintendo's Super Mario 64 manual](https://www.nintendo.com/eu/media/downloads/games_8/emanuals/nintendo_8/Manual_Nintendo64_SuperMario64_EN.pdf): analog movement and C-button control of the camera are player-facing features.

## Scope

This is an independently tuned approximation of the feel, not a Nintendo code or asset port. Story chronology, progress and scene contents are unchanged. Normal gallery/story entry, collision, special moves, authored camera transitions, clothing and hidden-page behavior must be verified when changing these systems.

## Verification

The production integration passed all 683 tests, the production build, changed-file formatting and independent review. Browser checks covered gallery walking and painting entry, Jerusalem story entry, house walls/corners on a phone, and the mountain's jump route. Static rendered QA covers full-speed hero/NPC Lehi turns and reversals alongside Nephi crawl/stand seams. Hidden-page verification showed unchanged rendered-frame and simulation-time counters. Repeated banked-turn tests prevent detached shoes, and high-speed costume checks retain covered cuffs while preserving the open coat front.

Conference Center column traversal is checked separately from sightline visibility: merely hiding the player never changes follow distance or pitch. Physical eye travel stays swept clear, with a short locked sidestep around narrow columns. The repeated browser route stayed at roughly 9–10 m instead of jumping inward to less than 2 m.

Palace camera acceptance also covers normal keyboard walking from the city spawn around the west entrance, through the audience hall and both treasury chambers, and back outside, on desktop and portrait phone views. Focused checks cover stationary yaw rates, manual idle positioning, blocked transition anchors and movement continuity across camera cuts.

The room/stationary-camera iteration passed the full 700-test suite, the production build, and 71 final focused camera/room checks including the additional blocked-anchor and integrated return-route regressions. Independent review approved the final changes.
