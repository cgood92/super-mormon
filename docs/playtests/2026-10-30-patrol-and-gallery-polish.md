# Patrol and gallery playtest fixes

Implemented the October 30 feedback: three generated gallery painting replacements; concise Lehonti race messages/objectives, aligned trailhead resets and exposed mountain terrace faces; auditorium signs at the actual entrances; a dedicated maidservant silhouette and long static hair; and Teancum's six-soldier rope challenge with armored patrol and dark-clothed opponents. Teancum's final costume follows the user's subsequent ninja/bandit direction, superseding the earlier concept sheet.

## Browser checks

- Mountain: ordinary controller movement climbed the full route to the first summit in 74 active seconds without a retry. The concise warning appeared. Continue returned the player to x28/z31.3/y0, facing the entrance at yawπ; the second-messenger message explained the increased speed. Close and distant terrace views were clean. All three climbs also pass actual stepPlayer traversal tests.
- Conference Center: ordinary walking from the upper story hall through the foyer reached the second-floor auditorium entrance. Its label sits above the real opening; the detached brown frame is absent.
- Rope challenge: ordinary controller movement from spawn heard the warning, led the patrol into the clearing, stationed all six soldiers using B, and contained all four opponents for four active seconds. Continue recorded story completion. No player-position teleporting or adventure-state mutation was used. Pausing between test-driver batches suspended simulation normally.
- Teancum: current hero/NPC geometry rendered at front, side, quarter and rear angles and through sharp run reversals. Hood and lower-face wrap cover the intended surfaces; the short cape stays attached above the legs. Earlier static rendering caught the nose tip and a detached cape, both corrected before the final inspection. Maidservant and patrol geometry also received rendered checks.
- All browser tabs opened for this work were closed. Unrelated tabs were preserved.

## Automated validation

After integrating main at 07d35ee, the full suite passed **543/543**, zero failures (406.2 seconds). Production build, changed-source Prettier and git diff whitespace checks passed. The existing Three.js chunk-size advisory remains.

New coverage includes rope polygon validity, concave containment, swept collisions/open gaps, fresh placement and recall, real traversal, stationary posts, escape/retry, clear-ground placement, once-only completion and disposal callbacks. Cinematics cover desktop/phone, several approach angles, entrance/watch/return, and recovery from an embedded camera. Mountain rays verify one exposed surface owner and agreement with physical support. Character checks cover inner costume layers, hero/NPC turns, resource disposal, and NPC/crowd vertex budgets.

The independent final review reported no material actionable findings. It used direct source inspection and 23 targeted tests; the optional local Scout daemon was unavailable. Scripture/artwork provenance and exact generated-painting prompts are recorded in docs/reference and docs/stories/war-level-sources.md.
