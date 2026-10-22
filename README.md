# Super Mormon

An original third-person 3D adventure prototype. Run, jump, explore, and enter early Book of Mormon scenes through paintings in an imagined Conference Center gallery.

## Play locally

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5173/. A 2.6-second splash automatically gives way to the gallery; jump or use the action button to skip it. On mobile, the splash is followed by **Enter Full Screen (recommended)** and **Continue**. The first option requests full screen and landscape orientation where the browser supports them; either option starts play. Unsupported phone browsers retain their own chrome and orientation controls. All gameplay fits the viewport.

## Controls

| Action         | Keyboard / mouse        | Controller             | Touch           |
| -------------- | ----------------------- | ---------------------- | --------------- |
| Move           | WASD or arrows          | Left stick             | Left thumbstick |
| Jump           | Space (hold for height) | A / bottom face button | A button        |
| Crouch / crawl | Hold Shift or Z         | Hold LT or X           | Tap Z to toggle |
| Context action | E                       | B / right face button  | B button        |
| Camera         | Drag the scene or Q/C   | Right stick            | Drag the scene  |
| Recenter       | R                       | Left shoulder          | Camera button   |
| Pause          | Escape / P              | Start                  | Pause button    |

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

Walk up to a painting and jump into its canvas to enter. The canvases are physical surfaces: standing against one does not enter it, and jumping while touching its front does. The six stories unlock in order: **Jerusalem Streets → Laban’s Palace → Lehi’s House → The Treasure Offer → Jerusalem by Night → The Tree of Life**. Completed scenes remain available for replay.

- **Jerusalem:** play as Lehi, find his blue door, and avoid pursuers. Explore the same streets, palace, and house exterior that appear on later visits.
- **Laban’s palace:** play as Laman, enter the audience hall and speak with Laban, then escape through the palace corridor and city gate to the brothers. Guards and escape routes are imagined gameplay.
- **Lehi’s house:** play as Nephi, explore the rooms and upper gallery, gather five treasures, and return to the entrance. Furniture blocks movement and can also be jumped onto.
- **The Treasure Offer:** Nephi and his brothers carry gold and silver to Laban. He seizes their treasure; escape his servants through winding Jerusalem streets and gather inside a deep rock cave. Ground routes let the brothers follow around the buildings. Pursuit begins when you move after the refusal or a checkpoint return, giving you time to orient yourself. A brief dialogue bridges to the angel’s encouragement and Nephi’s resolve to return.
- **Jerusalem by Night:** search the neighborhood’s alleys for Laban. A brief scripture recap describes his death without depicting violence. Laban’s outer garments visibly transfer to Nephi; Laban remains covered in modest linen. Find Zoram, follow him through the palace corridor into the treasury, then carry the brass plates back to the waiting brothers. Guards notice you only at close range, move slowly, and give up quickly; the disguise ends their pursuit.

- **The Tree of Life:** play an interactive adaptation as Lehi. Use E / B beside the iron rod to hold it, walk the winding path through the mists, partake of the white fruit, and invite Sariah, Nephi, and Sam. After the family welcome, stay and explore the garden. Optional reflection spots overlook the spacious building across the gulf, sit beside the clear fountain, and consider the word of God. This scene has no coins, combat, or timer.

Pause offers restart and return-to-gallery controls. Completed adventures are saved locally under `super-mormon-v1`.

## Movement and exploration

All moves are available immediately in every story. Choose **Pause → Moves & practice** for a short moves guide. In the gallery, head **left** into the separate **Movement Studio**. Nearby lesson prompts explain each obstacle as you approach it. Find six gold discovery tokens, crawl beneath the arch, grab the ledge, climb the pole, and carry the practice bundle to the gold ring. These are optional practice exhibits, not additional story requirements. Discovery tokens reset when a scene reloads.

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

The hub is an imagined gallery inspired by the Conference Center at Temple Square, not a measured recreation. Its six original illustrative paintings represent the six story scenes. They are illustrations, not archaeological reconstructions.

Ancient rooms, streets, and furnishings are original low-poly artistic interpretations informed by Iron Age Judah around 600 BC: flat roofs, stone and plaster walls, timber, pottery, courtyard architecture, and open clay lamps. The layouts, exact houses, routes, clothing colors, and palace plans are invented rather than verified reconstructions. Reference: [Harvard Museum, Houses of Ancient Israel](https://hmane.harvard.edu/houses-ancient-israel), [Metropolitan Museum, Iron Age II ceramic lamp](https://www.metmuseum.org/art/collection/search/323172).

The scripture distinguishes Laman fleeing Laban’s threat in **1 Nephi 3:11–14** from the later servants’ pursuit after the treasures are offered in **3:22–27**. The prototype depicts the first encounter with invented guards for play and gives the later treasure offer its own chase. The treasure gathering is inspired by the family’s gold, silver, and precious things; specific objects and hiding places are invented. The Lehi homeward chase is also an imagined activity. The night scene follows **1 Nephi 4** in its essential sequence: Laban dies before Nephi wears his garments, Nephi obtains the records with Zoram, and Zoram joins the family. It presents the death in a short text recap rather than an interactive act. [Read 1 Nephi 3](https://www.churchofjesuschrist.org/study/scriptures/bofm/1-ne/3?lang=eng) and [1 Nephi 4](https://www.churchofjesuschrist.org/study/scriptures/bofm/1-ne/4?lang=eng).

The four Jerusalem visits—Streets, Palace, Treasure Offer, and Night—construct the exact same city geometry, including Lehi’s house exterior, palace audience hall, connecting corridors, city exits, and an interior treasury. Story actors, objectives, and lighting change between visits. Lehi’s explorable house interior is a separate scene.

The Tree of Life is an artistic, interactive adaptation rather than a claim that Lehi himself followed the iron rod in the scriptural account. Its rod mechanic lets the player explore the experience of those who held fast. [1 Nephi 8](https://www.churchofjesuschrist.org/study/scriptures/bofm/1-ne/8?lang=eng) describes the white fruit, family invitation, mists, and elevated building; Sariah, Nephi, and Sam partake, while Laman and Lemuel do not. [1 Nephi 11:21–25](https://www.churchofjesuschrist.org/study/scriptures/bofm/1-ne/11?lang=eng) explains the tree and living waters as representations of God’s love. The clear fountain is separate from the dark river and gulf: [1 Nephi 12:18](https://www.churchofjesuschrist.org/study/scriptures/bofm/1-ne/12?lang=eng) describes the separating gulf, and [1 Nephi 15:23–28](https://www.churchofjesuschrist.org/study/scriptures/bofm/1-ne/15?lang=eng) explains the rod as God’s word and the river’s water as filthiness. Falling toward the gulf gently returns the player to firm ground without losing progress.

The existing camera behavior in `src/super/camera.ts` is unchanged; the Tree of Life uses the existing streets camera preset. Scene disposal removes the vision’s mist, meshes, materials, lights, and actors and restores the prior background and fog.

## Verify

```sh
npm test
npm run build
npm run format:check
```

Physics tests cover camera-relative movement, collision, jumping, step climbing and ceiling clearance. Camera tests cover wall obstruction and movement/orbit behavior. Browser and route checks are recorded in `docs/prototype-checks.md`.

## Deploy on GitHub Pages

The GitHub Actions workflow checks formatting, runs tests, and builds on pull requests and pushes to `main`. A successful push to `main` (or a manual run from `main`) also deploys the static `dist` folder to GitHub Pages. In the repository's **Settings → Pages**, set **Build and deployment → Source** to **GitHub Actions**. The expected project URL is `https://cgood92.github.io/super-mormon/` once the first deployment succeeds.

Local development serves at `/`. The workflow builds with `VITE_BASE_PATH=/super-mormon/` so scripts, styles, and gallery paintings load under the GitHub Pages project path. To reproduce that build locally, run `VITE_BASE_PATH=/super-mormon/ npm run build`.
