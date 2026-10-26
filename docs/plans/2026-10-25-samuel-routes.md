# Samuel route and pacing revision

User request: replace the diagonal staircase with an irregular field of blocks across the whole wall, offering fairly easy left/right route choices and varied gaps. Reduce the wall-top message/dodge phase to 30 seconds.

- Sol layout agent owns layout data, visible/collision block generation and physical traversal tests. Fixed authored positions preserve repeatable routes. Blocks remain attached to the wall. Verify multiple ordinary-jump paths with direction reversals, not merely a connected graph or teleported test targets.
- Sol runtime agent owns the 30-second boundary, timer tests and current source notes. Preserve pause/retry behavior and gentle projectile spacing; believers should depart within the shorter scene.
- Main reviews the combined changes, runs appropriate tests and production build, and pushes the verified batch. The user will play the scene; no Chrome playthrough is needed for this revision.

Verified: 17 wall-attached stones span nearly the full wall. Three ordinary-jump routes start at the ground, reverse direction and reach the top; the shared starter offers left/right branches. Cleared a cross-branch overhead collision and narrowed one upper stone for headroom. A Sol review found no remaining blocker. All 351 tests, production build and repository formatting pass. No browser tabs were opened for this revision.
