# Christ at Bountiful

Primary sources read:

- [3 Nephi 8](https://www.churchofjesuschrist.org/study/scriptures/bofm/3-ne/8?lang=eng), [9](https://www.churchofjesuschrist.org/study/scriptures/bofm/3-ne/9?lang=eng), and [10](https://www.churchofjesuschrist.org/study/scriptures/bofm/3-ne/10?lang=eng): destruction, darkness, grief, the invitation to turn to Christ, and the end of darkness. The scene acknowledges loss respectfully; these events are not playable spectacle or changeable outcomes.
- [3 Nephi 11:1–17](https://www.churchofjesuschrist.org/study/scriptures/bofm/3-ne/11?lang=eng): people around Bountiful's temple discuss the great changes, hear the Father's voice, see Christ descend in a white robe, and approach Him individually.
- [3 Nephi 17:1–24](https://www.churchofjesuschrist.org/study/scriptures/bofm/3-ne/17?lang=eng): pondering and prayer, Christ's compassion and healing, His prayer, and the blessing of children.

The temple plan, garden beds, stairs, terraces, open rest rooms, costumes, water delivery, dialogue and walk-home companion are imagined. No known archaeological location or exact temple architecture is asserted. All inhabitants are unnamed adaptations using approved sculpted cast roles, not appearances of the historical people who elsewhere use those rigs. The player is an imagined visitor, not Christ or a named scripture figure.

The two sacred narrations condense intervening teaching between chapters 11 and 17, explicitly calling the second moment later in His ministry. The soft court light is a representational tableau, not a rendered divine person or a claim about His historical appearance. There is no approved Christ character rig; the Conference Center's Thorvaldsen-inspired marble statue is not repurposed as a living actor. No invented divine speech or unwritten prayer is performed. The player retains the usual safe third-person camera; this scene introduces no cinematic camera transitions.

## Play and QA route

Enter at `(0,0,48)`, pass between raised garden beds and benches, and walk north to `(0,0,-12)`. Entering the court witnesses the source-grounded presentation automatically, independently of conversations, discoveries and water delivery. Repeated interaction at spawn cannot advance the story.

After the witness, find the neighbor at `(31,0,-25)` and offer to walk home. Walk east to `(42,0,-25)`, south along the wide outer path to `(42,0,43)`, then west to the home gate `(30,0,43)`. The visible neighbor follows with collision clearance checks, waits when separated by obstacles or out of range, and catches up when the player returns. There is no timer or failure penalty. Reaching home together completes exactly once; free exploration continues.

Optional water delivery: visit the vessel near `(-29,0,25)`, interact, walk west to `(-42,0,25)`, north to `(-42,0,-24)`, then east to the shelter at `(-29,0,-24)`. The vessel disappears while carried; arrival delivers automatically. Four optional inhabitants have distinct brief conversations. These errands never unlock the sacred witness.

Terrace exploration: from the shelter walk to `(-22,0,-10)`, then north up ten physical 0.3-unit stairs to `(-22,3,-42)`. Step off the east edge to `(-15,0,-42)` for a real landing. The eastern room is reached through its open south doorway at `(25,0,-40)`; discover it at `(25,0,-46)`. Snapshot fields expose `phase`, `witnessed`, `neighbor`, `following`, `escorted`, `watered`, `discoveries`, `conversations`, `pending` and `places`; world landmarks expose the same destinations.

All foreground architecture, benches, garden beds, vessel stand and tree trunks share render/collision dimensions. Herb canopies are explicitly registered shallow decoration over solid beds; high leaves are above walking height. Ground owns the court floor. Raised terrace, porch, stairs and roofs have real thickness. Shared disposal releases geometries/materials, character rigs and lights; pending callbacks are guarded after runtime/world disposal.

## Verification

`node --import tsx --test src/game/worlds/third-nephi/christ-bountiful.test.ts` exercises actual `stepPlayer` main routes, escort motion and completion once; independent witness; optional water, terrace climbing, room discovery and landing; direct garden collision; semantic scenery validation; and disposal while a narration callback is pending. `npx tsc --noEmit` passes. Browser desktop/phone visual QA belongs to the coordinator's integrated build, including side and quarter character views and representative floor raycasts.
