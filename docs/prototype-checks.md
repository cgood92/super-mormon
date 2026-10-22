# Super Mormon prototype checks

## Current implementation

- Six physical gallery canvases unlock in story order: Jerusalem Streets → Laban’s Palace → Lehi’s House → The Treasure Offer → Jerusalem by Night → The Tree of Life. Each canvas blocks walking; entry requires airborne contact with its front. Locked scenes retain their prompts and remain inaccessible.
- Streets, Palace, Treasure Offer, and Night use the exact same Jerusalem geometry from `src/super/jerusalem.ts`. All four contain Lehi’s house exterior, the palace audience hall, corridor exits, city gate, and an interior treasury. Lighting, actors, and story objectives vary. The explorable house interior remains a separate scene.
- In the night story, Nephi receives Laban’s actual outer garments. The visible Laban rig changes to modest linen underclothing as Nephi takes on the matching outfit. His death remains a brief text recap rather than an interactive act.
- Treasure Offer servants wait until the player moves after the refusal or a checkpoint return before pursuit arms. Treasure seizure persists after a catch.
- The Tree of Life is a peaceful interactive adaptation as Lehi. E / B toggles holding the rod; normal walking supplies forward motion, with bounded lateral assistance. Follow the winding path through localized mist, partake of the white fruit, and beckon to Sariah, Nephi, and Sam. The family welcome completes the mission and leaves the garden open for free exploration. Laman and Lemuel remain apart and do not partake.
- The tree has spreading branches, luminous foliage, and individual white fruit. The spacious building is elevated across a separated gulf, with silent pointing figures. A safe overlook and clear living fountain offer optional reflection. There are no coins, combat, or timers in this scene. Entering the gulf gently returns the player to a saved safe point without resetting progress.
- The existing `src/super/camera.ts` is unchanged; Tree of Life selects its existing streets preset. World disposal releases the mist texture, meshes, materials, and lights and restores prior background/fog; runtime disposal removes and releases character rigs.

## Latest browser verification

The following checks were performed against the revised implementation using normal browser input:

- Stand against a gallery painting: it physically stops movement and does not enter. Jump while touching its front: the unlocked scene opens.
- Lehi reaches his home through the revised shared city.
- Laman approaches the palace audience, speaks with Laban, and escapes through the palace/city route.
- Tree of Life: complete the full iron-rod route through the mists, partake of the fruit, invite the family, and continue exploring after completion. Reach the fountain and open its reflection dialogue.

The revised Treasure Offer completed through the shared palace’s western corridor, city gate and deep cave with all three brothers. A fresh refusal followed by 11 seconds idle left guards at their spawns with pursuit unarmed; moving then began the escape normally. The checkpoint-idle regression also covers the retry case.

The revised nighttime scene completed through normal input: Laban outside the palace, the garment transfer, Zoram in the separate treasury, brass plates, and the return through the same corridors and city gate with Zoram following. These checks used isolated test saves with earlier stories completed; no runtime teleporting was used. The Tree of Life opening was also checked at 667×375 with no page overflow or clipped buttons.

## Automated checks

Run `npm test`, `npm run build`, and `npm run format:check` for the current result. Tests cover:

- Camera-relative movement, acceleration/stopping, variable jumps, coyote time, buffering, stairs, walls, raised platforms, and ceiling clearance.
- Long jumps, backflips, side somersaults, jump chains, wall kicks, crouch/crawl clearance, ledge traversal, pole climbing, and carried-object physics.
- Controller and touch input edges, lost pointer capture, key repeat, modal activation, N64 calibration and glyphs, and menu navigation.
- Character proportions, animation, modest garment transfer, chronological unlocking, physical painting collision and airborne contact entry, shared Jerusalem geometry, city/palace/treasury routes, and story phases.
- Tree of Life spacing and separated waters; holding the rod without autonomous movement; bounded correction; checkpoint rescue preserving progression; actual player physics walking the full rod route; fruit and family completion; and continued walking to the fountain and overlook.

All 113 automated tests pass, including the three dedicated Tree of Life tests. The production build, formatting checks, and diff whitespace check pass.

## Scriptural treatment

This is an artistic adaptation, not a literal claim that Lehi himself followed the rod. The rod mechanic adapts the experience of people in his vision for exploration.

- [1 Nephi 8](https://www.churchofjesuschrist.org/study/scriptures/bofm/1-ne/8?lang=eng): white fruit, joy, family invitation, rod, mist, and mocking figures in an elevated building. Sariah, Nephi, and Sam partake; Laman and Lemuel do not.
- [1 Nephi 11:21–25](https://www.churchofjesuschrist.org/study/scriptures/bofm/1-ne/11?lang=eng): the tree and living waters represent God’s love. The scene places its clear fountain near the tree.
- [1 Nephi 12:18](https://www.churchofjesuschrist.org/study/scriptures/bofm/1-ne/12?lang=eng): the great gulf separates the building from the tree.
- [1 Nephi 15:23–28](https://www.churchofjesuschrist.org/study/scriptures/bofm/1-ne/15?lang=eng): the rod represents God’s word; the river water represents filthiness. The scene distinguishes the dark river/gulf from the clear living fountain.

The earlier Jerusalem stories distinguish Laman’s threatened first visit in 1 Nephi 3:11–14 from the servants’ pursuit after the treasure offer in 3:22–27. Guard placements, architecture, routes, furniture, and specific treasure hiding places are invented. The night sequence follows 1 Nephi 4 through the recap, garments, records, Zoram, and return.

## Previous device and movement checks

Earlier checks verified advanced movement and the Movement Studio through real input: crawl under the arch, forced crouch beneath a ceiling, long jump, backflip, side somersault, jump chains, wall kick, ledge traversal, pole detach, carrying, throwing, setting down, and optional delivery. These checks predate the current story geometry changes.

Mobile checks at 667×375 and 390×844 found no page overflow. The splash offers Enter Full Screen or Continue on mobile; native full screen and orientation locking depend on browser support and a user gesture. Physical phone comfort remains a playtest question.

The measured N64 adapter is `0810:e501`, with two axes and ten buttons. Its built-in mapping is A=5, B=4, Z=8, Start=9, R=7, C-left=3, C-right=1, C-up=0, C-down=2. Browser-saved calibration takes priority. Earlier virtual-controller checks verified setup with scrambled indices, menu navigation, jump/action/crouch/pause, camera steps, and zoom.

`tests/super-playthrough.js` supplies legal virtual-controller input and reads a runtime snapshot. Open a preview with `?playtest` and import the driver from the development server. Physical phone and controller playtests remain useful for comfort and game feel.
