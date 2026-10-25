# Character foundation refactor

Keep approved character designs and gameplay physics; rebuild clothing coverage and facing/pose separation. Prove Nephi first, then check the cast.

1. Separate facing yaw from local body pose. Crawl/flip axes and offsets follow facing; head points along travel and hands/knees support the body across all headings and transitions.
2. Replace fully nested hidden clothing and reactive clearance patches with explicit visible costume surfaces. Keep intentional front opening/cuffs/legs, accepted silhouettes and existing moves. No cloth simulator.
3. Add a low-CPU repeatable motion review and full-cycle posed geometry tests across headings and hero/NPC/crowd qualities. Include acceleration, stops, sharp turns, reversals, crawl transitions, jump/climb/carry/swim/gestures and disposal.
4. Review combined changes; run tests/build/format; inspect actual rendering and normal play; close testing tabs; integrate and push verified result.

One Sol implementer owns clothing/model/visible rig. Another owns facing/pose driver and directional tests. Main agent integrates and inspects rendered acceptance. A fresh Sol reviewer checks the result.

Acceptance: no covered white fabric or footwear flashes; no oversized reactive hems; front/cuffs remain intentional. Crawl follows heading with grounded supports in every direction. Preserve gameplay physics and story behavior.

## Implemented and verified

Facing now rotates the actor root; crawl, flips, and limb poses remain local to that heading. Coated cast members have an upper tunic and explicit front insert, with trimmed buried trouser/boot geometry. Removed independent walking-cloth lag and reactive foot-clearance expansion. Crawl gathers the authored garment clear of bent shoes; seam-aware normals preserve smooth shading on recovery.

Verified 337/337 tests, TypeScript and production build. Regression checks cover full walking/turn/reversal cycles, every inner garment, hero/NPC/crowd qualities, crawl supports and heading, repeated crawl/stand, and normal seams. Reviewed rendered poses and normal keyboard gameplay in the gallery and Lehi playground, plus phone landscape layout in Jerusalem. Independent Sol review caught the normal-seam issue before completion. Temporary review page, browser tabs and preview server were removed/closed.
