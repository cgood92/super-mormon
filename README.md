# Super Mormon

An original third-person 3D adventure prototype. Run, jump, explore, and enter early Book of Mormon scenes through paintings in an original interpretation of the Conference Center.

## Play locally

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5173/. A 2.6-second splash automatically gives way to the gallery; jump or use the action button to skip it. On mobile, the splash is followed by **Enter Full Screen (recommended)** and **Continue**. The first option requests full screen and landscape orientation where the browser supports them; either option starts play. Unsupported phone browsers retain their own chrome and orientation controls. All gameplay fits the viewport.

## Controls

| Action         | Keyboard / mouse        | Controller             | Touch                   |
| -------------- | ----------------------- | ---------------------- | ----------------------- |
| Move           | WASD or arrows          | Left stick             | Left thumbstick         |
| Jump           | Space (hold for height) | A / bottom face button | A button                |
| Crouch / crawl | Hold Shift or Z         | Hold LT or X           | Tap Z to toggle         |
| Context action | E (hold for iron rod)   | B / right face button  | B button (hold for rod) |
| Camera         | Drag the scene or Q/C   | Right stick            | Drag the scene          |
| Recenter       | R                       | Left shoulder          | Camera button           |
| Pause          | Escape / P              | Start                  | Pause button            |

**N64 USB controllers:** the measured `0810:e501` USB profile (10 buttons, 2 axes) works out of the box. For another adapter, choose **Pause → Set up N64 controller**, press and release each requested button, then press A to save. Calibration is stored for that controller in this browser and takes priority over the built-in profile. Unrecognized nonstandard adapters offer setup when gameplay starts; no macOS remapping is required. Menus can be navigated with the joystick and confirmed with A. On-screen hints and button glyphs change with the active keyboard, touch, generic gamepad, or N64 controls.

| N64 control      | Game action                                                 |
| ---------------- | ----------------------------------------------------------- |
| Analog stick     | Move                                                        |
| A                | Jump, confirm dialogue                                      |
| B                | Talk, gather, pick up, throw                                |
| Z                | Hold to crouch/crawl; combine with A for long jump/backflip |
| Start            | Pause                                                       |
| C-left / C-right | Rotate camera one step                                      |
| C-up / C-down    | Closer / wider camera distance                              |
| R                | Recenter camera                                             |

This uses the N64 buttons for the corresponding existing game actions. The camera's close/wide views and recenter action are adaptations, not a complete recreation of Mario 64's first-person and camera-mode system. Generic USB adapters can report the same physical buttons under different numbers, so setup learns them rather than guessing from the device name.

The Conference Center opens with all three public floors, the auditorium and roof gardens available immediately. Eight story paintings occupy the ground-floor gallery and adjoining east foyer. The two new ship paintings sit to the right of the original six. Walk up to a painting and jump into its canvas to enter. The canvases are physical surfaces: standing against one does not enter it, and jumping while touching its front does. The eight stories unlock in order: **Jerusalem Streets → Laban’s Palace → Lehi’s House → The Treasure Offer → Jerusalem by Night → The Tree of Life → Building the Ship → The Ocean Voyage**. Completed scenes remain available for replay.

- **Jerusalem:** play as Lehi, find his blue door, and avoid pursuers. Explore the same streets, palace, and house exterior that appear on later visits.
- **Laban’s palace:** play as Laman, enter the audience hall and speak with Laban, then escape through the palace corridor and city gate to the brothers. Guards and escape routes are imagined gameplay.
- **Lehi’s house:** play as Nephi, explore the rooms and upper gallery, gather five treasures, and return to the entrance. Furniture blocks movement and can also be jumped onto.
- **The Treasure Offer:** Nephi and his brothers carry gold and silver to Laban. He seizes their treasure; escape his servants through winding Jerusalem streets and gather inside a deep rock cave. Ground routes let the brothers follow around the buildings. Pursuit begins when you move after the refusal or a checkpoint return, giving you time to orient yourself. A brief dialogue bridges to the angel’s encouragement and Nephi’s resolve to return.
- **Jerusalem by Night:** search the neighborhood’s alleys for Laban. A brief scripture recap describes his death without depicting violence. Laban’s outer garments visibly transfer to Nephi; Laban remains covered in modest linen. Find Zoram, follow him through the palace corridor into the treasury, then carry the brass plates back to the waiting brothers. Guards notice you only at close range, move slowly, and give up quickly; the disguise ends their pursuit.

- **The Tree of Life:** play an interactive adaptation as Lehi. Hold E / B / the touch B button beside the iron rod while walking the winding path through the mists; releasing the button detaches. The white fruit interaction is centered beneath the tree, which can also be climbed. Partaking completes the scene directly and welcomes Sariah, Nephi, and Sam without a separate beckoning step. Stay in the garden to talk with the family, watch nearby figures wave, and explore. A bridge and stair route reaches the spacious building’s main floor; its upper storeys are scenic. Instanced crowds populate the vision, and mist thickens away from the path. Optional reflection spots overlook the building and sit beside the clear fountain. This scene has no coins, combat, or timer.

- **Building the Ship:** help Nephi pray, make tools, reconcile with his brothers, and align timbers at Bountiful. Stay to explore the shore and completed vessel.
- **The Ocean Voyage:** explore the ship as an imagined child, help the family release Nephi during the storm, then guide the ship toward the promised land.

Pause offers restart and return-to-gallery controls. Completed adventures are saved locally under `super-mormon-v1`.

## Movement and exploration

All moves are available immediately in every story. Choose **Pause → Moves & practice** for a short moves guide. In the Conference Center, head **left**, take the south foyer into the west side hall, and follow the **Optional Movement Studio** sign. Its nine lessons sit apart from the main foyer. Nearby lesson prompts explain each obstacle as you approach it. Find six gold discovery tokens, crawl beneath the arch, grab the ledge, climb the pole, and carry the practice bundle to the gold ring. These are optional practice exhibits, not additional story requirements. Discovery tokens reset when a scene reloads.

- Run + crouch + jump: long jump. Stationary crouch + jump: backflip.
- Reverse direction while running + jump: side somersault.
- Jump again immediately after landing: double jump; keep running and chain another for a triple jump.
- Jump toward a wall and press jump again: wall kick.
- Catch a ledge while descending toward it, then move toward it or jump to pull up. Crouch releases.
- Jump toward a climbable palm or pole, move up/down to climb, jump away or crouch to let go.
- E / B picks up a nearby supply bundle, then throws it. Crouch + E / B sets it down. Objects collide with furniture and walls; bundle delivery is optional.

The Movement Studio contains optional traversal and carrying practice. Lehi’s five treasure objectives remain the main house activity. The Tree of Life uses peaceful exploration and reflection without collectible rewards.

## Story and visual treatment

The new code replaces the previous collection of mini-games. It uses original low-poly models, run/jump animation, camera-relative analog movement, variable-height jumps, and a camera that follows from above and avoids walls. It contains no Nintendo characters, models, textures, music, or level layouts.

The hub interprets the Conference Center at Temple Square through three connected public floors, broad foyers and side halls, a large column-free auditorium with curved seating tiers, continuous balcony fronts, concentric ceiling bands and wood-cased organ towers, and landscaped roof terraces. Original wood-framed mountain landscapes fill the side halls as non-interactive exhibits. Diagonal stone floors, tall black-mullioned windows, cream columns, warm wood surrounds and circular ceiling fixtures draw on the 19 supplied tour screenshots. The architecture and landscape also reference the [Church’s architectural account](https://www.churchofjesuschrist.org/study/ensign/2000/10/the-conference-center-this-new-and-wonderful-hall?lang=eng) and [OLIN’s landscape design](https://theolinstudio.com/projects/lds-conference-center/). This is an original artistic interpretation with invented proportions and circulation, not an accurate blueprint. Its six original story paintings are illustrations, not archaeological reconstructions.

From the starting foyer, pass around the story-gallery wall to reach the auditorium entrance. Escalators at the sides of the foyer connect the public floors and roof; their treads gently carry grounded visitors upward while ordinary walking remains available in either direction. On the roof, paths lead through meadow planting, trees, terraces and water features. The auditorium is an exploration space without story paintings, coins or level objectives. Building access is independent of the eight stories’ sequential unlocks. The auditorium’s raked center aisle follows the seating terraces, with walkable stairs connecting the foyer and stage. Plaque lettering keeps its natural proportions and wraps to fit each sign.

Ancient rooms, streets, and furnishings are original low-poly artistic interpretations informed by Iron Age Judah around 600 BC: flat roofs, stone and plaster walls, timber, pottery, courtyard architecture, and open clay lamps. The layouts, exact houses, routes, clothing colors, and palace plans are invented rather than verified reconstructions. Reference: [Harvard Museum, Houses of Ancient Israel](https://hmane.harvard.edu/houses-ancient-israel), [Metropolitan Museum, Iron Age II ceramic lamp](https://www.metmuseum.org/art/collection/search/323172).

The scripture distinguishes Laman fleeing Laban’s threat in **1 Nephi 3:11–14** from the later servants’ pursuit after the treasures are offered in **3:22–27**. The prototype depicts the first encounter with invented guards for play and gives the later treasure offer its own chase. The treasure gathering is inspired by the family’s gold, silver, and precious things; specific objects and hiding places are invented. The Lehi homeward chase is also an imagined activity. The night scene follows **1 Nephi 4** in its essential sequence: Laban dies before Nephi wears his garments, Nephi obtains the records with Zoram, and Zoram joins the family. It presents the death in a short text recap rather than an interactive act. [Read 1 Nephi 3](https://www.churchofjesuschrist.org/study/scriptures/bofm/1-ne/3?lang=eng) and [1 Nephi 4](https://www.churchofjesuschrist.org/study/scriptures/bofm/1-ne/4?lang=eng).

The four Jerusalem visits—Streets, Palace, Treasure Offer, and Night—construct the exact same city geometry, including Lehi’s house exterior, palace audience hall, connecting corridors, city exits, and an interior treasury. Story actors, objectives, and lighting change between visits. Lehi’s explorable house interior is a separate scene.

The Tree of Life is an artistic, interactive adaptation rather than a claim that Lehi himself followed the iron rod in the scriptural account. Its rod mechanic lets the player explore the experience of those who held fast. [1 Nephi 8](https://www.churchofjesuschrist.org/study/scriptures/bofm/1-ne/8?lang=eng) describes the white fruit, family invitation, mists, and elevated building; Sariah, Nephi, and Sam partake, while Laman and Lemuel do not. [1 Nephi 11:21–25](https://www.churchofjesuschrist.org/study/scriptures/bofm/1-ne/11?lang=eng) explains the tree and living waters as representations of God’s love. The clear fountain is separate from the dark river and gulf: [1 Nephi 12:18](https://www.churchofjesuschrist.org/study/scriptures/bofm/1-ne/12?lang=eng) describes the separating gulf, and [1 Nephi 15:23–28](https://www.churchofjesuschrist.org/study/scriptures/bofm/1-ne/15?lang=eng) explains the rod as God’s word and the river’s water as filthiness. Falling toward the gulf gently returns the player to firm ground without losing progress.

The ship chapters draw on [1 Nephi 17](https://www.churchofjesuschrist.org/study/scriptures/bofm/1-ne/17?lang=eng) and [1 Nephi 18](https://www.churchofjesuschrist.org/study/scriptures/bofm/1-ne/18?lang=eng). The hull, rooms, rigging, timber alignment, and steering course are speculative designs for play; the scripture does not specify the ship’s architecture. The child player character is fictional. The storm sequence follows the account’s release of Nephi on the fourth day, followed by his prayer and the calming of the storm (1 Nephi 18:13–21).

The Conference Center uses a broader camera preset (distance 9.5, elevation 0.22, target height 2) and a 320-unit far clip for the larger building. Story camera behavior remains unchanged; the Tree of Life uses the existing streets preset. Scene disposal releases owned rendering resources and restores the prior background and fog.

## Verify

```sh
npm test
npm run build
npm run format:check
```

Physics tests cover camera-relative movement, collision, jumping, step climbing and ceiling clearance. Camera tests cover wall obstruction and movement/orbit behavior. Browser and route checks are recorded in [prototype checks](docs/prototype-checks.md).

Scene code loads in level chunks as needed; the runtime builds only the active scene. Gallery paintings request their images when first rendered. The six gallery derivatives total 1.28 MB, down from 15.56 MB for the originals (91.7% smaller); the originals are retained. For opt-in development FPS, render workload, and repeated-scene resource checks, see [performance checks](docs/performance-checks.md). These diagnostics do not establish physical phone performance.

## Deploy on GitHub Pages

The GitHub Actions workflow checks formatting, runs tests, and builds on pull requests and pushes to `main`. A successful push to `main` (or a manual run from `main`) also deploys the static `dist` folder to GitHub Pages. In the repository's **Settings → Pages**, set **Build and deployment → Source** to **GitHub Actions**. Before uploading, deployment restores the durable `pages-assets` branch, adds this build's content-addressed `dist/assets` files, and publishes their union. Existing tabs keep their original code and can enter previously unvisited paintings after subsequent deployments; new page loads get the latest HTML and code. There is no forced refresh or change to saved progress. The archive is committed before deployment and never automatically expires or prunes assets. On first use, it seeds itself from all available, unexpired main-branch Pages artifacts so recently opened tabs are covered too. Initialization verifies that the currently live deployment is included and stops if its artifact is unavailable. Code already removed by older deployments cannot be recovered this way.

The workflow needs `contents: write` to maintain `pages-assets` and `actions: read` and `deployments: read` for the initial artifact seed. Keep that branch: do not delete it or reset it to only the latest build. Archive restoration, immutable filename collisions, push failures, or a combined site larger than 900 MiB stop deployment instead of publishing a broken site. If storage approaches that limit, migrate the archive to durable hosting; do not expire old code silently. Retention adds deployment storage, not extra downloads on startup. Public files outside Vite's hashed `assets` directory (such as painting images) still use stable paths; keep those paths available when changing them.

The expected project URL is `https://cgood92.github.io/super-mormon/` once the first deployment succeeds.

Local development serves at `/`. The workflow builds with `VITE_BASE_PATH=/super-mormon/` so scripts, styles, and gallery paintings load under the GitHub Pages project path. To reproduce that build locally, run `VITE_BASE_PATH=/super-mormon/ npm run build`.
