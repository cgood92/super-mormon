# Super Mormon prototype checks

## Current implementation

- The Conference Center has three public floors, side halls, an auditorium and roof gardens, all unlocked from the start. The auditorium uses curved seating and balcony fronts, continuous cream balcony soffits, concentric ceiling bands, and wood-cased organ towers. Its ground center aisle follows the seating rake, with filled stair structures connecting the foyer and stage. The six story paintings form one ground-floor gallery cluster and retain their sequential story locks. The auditorium has no paintings, coins or level objectives.
- Sign canvases match each plaque’s physical aspect ratio. Measured lettering wraps and fits inside the border, preserving the full text and natural letter proportions.
- Side-foyer escalators physically connect every floor and the roof. Small treads are walkable in either direction, with gentle upward carry while grounded. Shaft guards meet floor edges, and the roof arrival stays open. Original framed mountain landscapes line the side halls as non-interactive exhibits. Nine optional movement lessons, six practice tokens and carrying/delivery practice occupy the west side hall, away from the auditorium.
- The foyer’s stone checkerboard, black window mullions, cream columns, wood surrounds and circular fixtures interpret 19 supplied tour screenshots. The [Church architectural account](https://www.churchofjesuschrist.org/study/ensign/2000/10/the-conference-center-this-new-and-wonderful-hall?lang=eng) and [OLIN landscape description](https://theolinstudio.com/projects/lds-conference-center/) informed the building and roof treatment. This is an artistic public-area interpretation, not a measured blueprint.

- Six physical gallery canvases unlock in story order: Jerusalem Streets → Laban’s Palace → Lehi’s House → The Treasure Offer → Jerusalem by Night → The Tree of Life. Each canvas blocks walking; entry requires airborne contact with its front. Locked scenes retain their prompts and remain inaccessible.
- Streets, Palace, Treasure Offer, and Night use the exact same Jerusalem geometry from `src/super/jerusalem.ts`. All four contain Lehi’s house exterior, the palace audience hall, corridor exits, city gate, and an interior treasury. Lighting, actors, and story objectives vary. The explorable house interior remains a separate scene.
- In the night story, Nephi receives Laban’s actual outer garments. The visible Laban rig changes to modest linen underclothing as Nephi takes on the matching outfit. His death remains a brief text recap rather than an interactive act.
- Treasure Offer servants wait until the player moves after the refusal or a checkpoint return before pursuit arms. Treasure seizure persists after a catch.
- The Tree of Life is a peaceful interactive adaptation as Lehi. Hold E / B / touch B to hold the rod; releasing detaches. Normal walking supplies forward motion, with bounded lateral assistance. Follow the winding path through localized mist and partake of the white fruit beneath the center of the climbable tree. Partaking directly completes the mission and welcomes Sariah, Nephi, and Sam, leaving the garden open for free exploration without a separate beckoning step. Laman and Lemuel remain apart and do not partake.
- The tree has spreading branches, luminous foliage, and individual white fruit. The spacious building is elevated across a separated gulf, with a bridge and stair route to its main floor; upper storeys are scenic. Crowds use instanced geometry, named family members offer conversations and nearby figures wave. Mist becomes thicker off the path. A safe overlook and clear living fountain offer optional reflection. There are no coins, combat, or timers in this scene. Entering the gulf gently returns the player to a saved safe point without resetting progress.
- Level builders load in chunks on demand, with only the active level constructed. Gallery paintings load their images when first rendered. Six gallery derivatives total 1.28 MB versus 15.56 MB for the retained originals, a 91.7% reduction. See [developer performance checks](performance-checks.md) for opt-in FPS, render workload, and scene resource trends.
- The hub uses a closer camera preset (distance 9.5, elevation 0.22, target height 2) and the camera far clip is 320 units. Story camera behavior is unchanged; Tree of Life selects its existing streets preset. World disposal releases the mist texture, meshes, materials, and lights and restores prior background/fog; runtime disposal removes and releases character rigs.

## Latest browser verification

The revised auditorium was walked from the ground foyer along its raked center aisle to the stage. The center aisle no longer forms a trench, and the balcony undersides present continuous cream soffits.

Using normal virtual-controller input, the new Conference Center was traversed from the opening foyer through the auditorium, the escalators, both balconies and the roof. The rooftop path to a fountain was also walked. All public areas were accessible with the existing five-story test save. A painting entered Jerusalem successfully.

At 667×375 mobile landscape, the full-screen prompt and gameplay fit without page overflow. No console errors or warnings were reported. Repeated hub → Jerusalem → hub visits returned to the same settled renderer counts: 191 geometries and 17 textures at the same spawn view. This is a desktop browser check, not physical phone performance testing.

Earlier normal-input checks covered the shared Jerusalem stories and the expanded Tree of Life rod, fruit, family conversations, building round trip and tree climbing. Those gameplay scenes retain their prior behavior.

## Automated checks

Run `npm test`, `npm run build`, and `npm run format:check` for the current result. Tests cover:

- Conference Center routes from spawn to all six painting fronts and jump entry, all auditorium floor entrances, and the roof; grounded escalator carry; roof and upper-floor shaft guards; and ground building boundaries.
- Auditorium center and side entrances on all three floors, the stage route, filled seating and stair structures, continuous balcony guards and soffits, and roof clearance. Sign layout checks cover wide banners, long captions, wrapping, Unicode, texture limits, and text bounds.
- Camera-relative movement, acceleration/stopping, variable jumps, coyote time, buffering, stairs, walls, raised platforms, and ceiling clearance.
- Long jumps, backflips, side somersaults, jump chains, wall kicks, crouch/crawl clearance, ledge traversal, pole climbing, and carried-object physics.
- Controller and touch input edges, lost pointer capture, key repeat, modal activation, N64 calibration and glyphs, and menu navigation.
- Character proportions, animation, modest garment transfer, chronological unlocking, physical painting collision and airborne contact entry, shared Jerusalem geometry, city/palace/treasury routes, and story phases.
- Tree of Life spacing and separated waters; held-action rod attachment and release without autonomous movement; bounded correction; checkpoint rescue preserving progression; actual player physics walking the full rod route and the bridge/stair route to the building’s main floor; centered fruit interaction and direct completion; tree climbing; and continued exploration.
- Lazy scene preparation without changing the active scene, gallery image derivatives, and opt-in performance snapshots including bounded resource trends and unavailable heap reporting.

The automated suite contains 161 tests. Run the commands above to verify the current checkout, including the production build and formatting. Browser viewport checks and developer diagnostics do not establish performance or comfort on a physical phone.

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

Earlier browser visits using the previous small gallery kept resource counts stable across gallery → vision → gallery transitions after shadow-target cleanup. Those measurements predate the new Conference Center and do not establish its resource counts or physical-device performance.

The next auditorium refinement follows the supplied front-stage photos: paired side stairs replace the central flight, and choir/presiding chairs face the audience. Browser input traversed both stair routes and checked the balcony trim from the stage side. A ray-based regression verifies that the cream and wood fascia no longer share coincident visible faces; another test verifies actual rendered chair backrest positions.

## Ship adventures — October 22, 2026

Sol agents implemented the shared vessel, Bountiful construction, ocean voyage, and gallery integration. An isolated browser profile completed the new stories through ordinary public controller input, without teleporting or changing runtime state: six individually aligned timbers, beach boarding stairs, ship exploration and helm completion; then below-deck brothers, return to Nephi, prayer, Liahona, and five sustained steering passages. All eight completion records persisted and post-arrival exploration remained playable. QA caught a final-timber snapshot failure while the completion dialog was open; a deferred-dialog regression covers the fix.

The dedicated ground-floor movement studio was reached on foot. Both auditorium side-stair clearance and continuous front/side red carpet have geometry regressions; a browser route walked the center aisle to the right stage stair and onto the stage. Landscape viewport emulation at 852 × 393 had no page scrolling; this is not a physical-phone performance measurement.

Final checks: 175 tests passed, production build passed, formatting passed. Ship model and new scenes load as separate chunks. Ship architecture and the child viewpoint are imagined; the scriptural sequence and fourth-day release follow 1 Nephi 17–18.

## Physical scenery, story staging and radial darkness — October 22, 2026

Foreground scenery now has explicit physical intent. Shared builders produce matching visible surfaces and colliders, and validation rejects missing registrations for named rock/trunk scenery. Regressions exercise walking into/around palms, climbing and jumping onto rock terraces, individually fitted cave surfaces, unique exposed rock/platform surfaces, scaled rooftop trunks, and instance-buffer disposal. Repeated rock tiers are batched per rock. Project acceptance rules live in `AGENTS.md`.

Story dialogue uses staged camera framing and temporary actor gestures, with a short watch period and adaptive Continue control. The camera and poses restore before narrative callbacks advance. Browser routes checked Laban's palace and the treasure offer, mountain prayer, ore, forge and reconciliation, night search, and voyage opening; mobile landscape captions fit without panel or page scrolling. Unit tests cover interruption, camera/pose restoration and prop animation.

Tree darkness now measures world-space distance from the player, preserving a small visible patch through a full camera orbit. Browser checks rotated from approximately 3.14 to 9.48 radians at (-42, 65), then walked to the garden, partook of fruit, crossed the river, ascended the eastern stairs and stood on the building at y16.2. The entry landing and crossing now join adjacent surfaces without coplanar overlap. Shader hooks initialize before opening dialogue and restore when leaving the scene.
