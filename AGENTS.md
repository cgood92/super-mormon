# Scenery acceptance rules

- Build foreground solid scenery with shared geometry-and-collision helpers in `src/super/scenery.ts`. Use one dimension source for its visible surface and physical support. Register deliberate decoration/backdrops explicitly with a reason; do not turn all render meshes into enclosing AABBs.
- Trees must have solid trunks. Add climbables for trees intended to be climbed. Rocks and mountains need matching walkable terraces or carefully fitted physical surfaces, preserving story routes and clear paths around obstacles.
- New scenery must pass semantic collision validation and actual `stepPlayer` traversal checks (blocked walking, walking around, landing, and climbing as appropriate). Verify a normal player browser route, rather than only teleporting to story targets.
- Each walk surface has one owner. Avoid coplanar overlapping floor meshes; remove the duplicate or separate surfaces with real thickness. Check close and distant views and raycast representative surfaces to catch duplicate hits/z-fighting.
- Preserve the user's GitLab (`glab`), DataDog (`pup`), Slack approval, VPN/network escalation, and worktree preferences supplied in the chat.
- Batch repeated rock tiers and plants where practical. Dispose instance buffers as well as geometry/materials when leaving a world. Check render workload after adding physical scenery so correctness does not quietly undermine mobile performance.
- Cinematic cameras must frame the player, stay clear of solid and opaque rendered geometry, and validate the entire entrance/watch/return path. Exercise shots from multiple approach angles and phone/desktop aspect ratios. Test recovery from an initially embedded camera and props that move into the shot; never assume a focus point is outside scenery.
- Close browser tabs opened for testing as soon as their checks are finished. Preserve the user's unrelated tabs. Hidden game pages must not keep rendering or accumulating elapsed simulation time.
