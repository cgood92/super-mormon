# Super Mormon

An original third-person 3D adventure prototype. Run, jump, explore, and enter early Book of Mormon scenes through paintings in an imagined Conference Center gallery.

## Play locally

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5173/ and choose **Enter the gallery**. Starting requests full screen and landscape orientation where the browser supports them. Unsupported phone browsers retain their own chrome and orientation controls. All gameplay fits the viewport.

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

**N64 USB controllers:** choose **Set up N64 controller** on the title screen or in Pause. Press and release each requested button, then press A to save. The mapping is saved for that controller in this browser. Unmapped controllers offer setup when gameplay starts; no macOS remapping is required.

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

Jump toward a painting to enter its scene. The stories unlock in order: Jerusalem Streets, Laban’s Palace, then Lehi’s House. Completed scenes remain available for replay.

- **Jerusalem:** play as Lehi, find his blue door, and avoid pursuers. Optional stairs and ledges offer higher routes.
- **Laban’s palace:** play as Laman, approach Laban and talk, then flee through the gate to the brothers outside the city. Guards and the obstacle route are imagined gameplay.
- **Lehi’s house:** play as Nephi, explore the rooms and upper gallery, gather five treasures, and return to the entrance. Furniture blocks movement and can also be jumped onto.

Pause offers restart and return-to-gallery controls. Completed adventures are saved locally under `super-mormon-v1`.

## Movement and exploration

All moves are available immediately in every story. Choose **Pause → Moves & practice** for a short moves guide. In the gallery's optional movement garden, find six gold discovery tokens, crawl beneath the arch, grab the ledge, climb the pole, and carry the practice bundle to the gold ring. These are practice exhibits, not additional story requirements. Discovery tokens reset when a scene reloads.

- Run + crouch + jump: long jump. Stationary crouch + jump: backflip.
- Reverse direction while running + jump: side somersault.
- Jump again immediately after landing: double jump; keep running and chain another for a triple jump.
- Jump toward a wall and press jump again: wall kick.
- Catch a ledge while descending toward it, then move toward it or jump to pull up. Crouch releases.
- Jump toward a climbable palm or pole, move up/down to climb, jump away or crouch to let go.
- E / B picks up a nearby supply bundle, then throws it. Crouch + E / B sets it down. Objects collide with furniture and walls; bundle delivery is optional.

The streets have optional rooftop/palm discoveries, the palace has climbable courtyard palms, and each story has a supply bundle to try carrying. Lehi's five treasure objectives remain the main house activity.

## Story and visual treatment

The new code replaces the previous collection of mini-games. It uses original low-poly models, run/jump animation, camera-relative analog movement, variable-height jumps, and a camera that follows from above and avoids walls. It contains no Nintendo characters, models, textures, music, or level layouts.

The hub is an imagined gallery inspired by the Conference Center at Temple Square, not a measured recreation. Its three original generated paintings depict the corresponding gameplay scenes: Lehi reaching home, Laman escaping the palace, and Nephi finding family treasures. They are illustrations, not archaeological reconstructions.

Ancient rooms, streets, and furnishings are artistic interpretations informed by Iron Age Judah around 600 BC: flat roofs, stone and plaster walls, timber, pottery, courtyard architecture, and open clay lamps. Exact houses, routes, clothing colors, and palace plans are not verified reconstructions. Reference: [Harvard Museum, Houses of Ancient Israel](https://hmane.harvard.edu/houses-ancient-israel), [Metropolitan Museum, Iron Age II ceramic lamp](https://www.metmuseum.org/art/collection/search/323172).

The scripture distinguishes Laman fleeing Laban’s threat in **1 Nephi 3:11–14** from the later servants’ pursuit after the treasures are offered in **3:22–27**. This prototype depicts the first encounter with invented guards for play. The treasure gathering is inspired by the family’s gold, silver, and precious things; specific objects and hiding places are invented. The Lehi homeward chase is also an imagined activity. [Read 1 Nephi 3](https://www.churchofjesuschrist.org/study/scriptures/bofm/1-ne/3?lang=eng).

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
