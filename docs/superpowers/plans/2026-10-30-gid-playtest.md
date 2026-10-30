# City of Gid implementation plan

Goal: Two readable deliveries inside Gid, followed by dawn, a slowly opening gate, armed followers and bloodless surrender.

Architecture: Keep Gid adventure state local. Attach props to hand sockets; use stepPlayer for collectors and followers. Preserve existing walls/jumping and use the adventure camera for dawn.

Source: Alma 55:4–24 and user feedback on October 30, 2026. Interior delivery and the opening-gate procession are gameplay adaptations.

- [x] Failing colocated tests for sleeping poses, arbitrary interior drops, automatic collection, two deliveries, gradual gate collision, following and surrender interaction.
- [x] Fix poses/equipment, replace fixed throw points, add sleeping city guards and surrounding soldiers.
- [x] Add automatic dawn/gate shot and collision-aware escort.
- [x] Verify physics routes and rendered desktop/phone poses and camera; update source/playtest notes.
- [x] Tests/build and independent diff review. Deliver the verified branch through a pushed commit and PR.

Review focus: air/roof drops, drops against scenery, gate bottleneck, props on turns, repeated input, disposal, portrait camera safety.
