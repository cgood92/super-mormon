# Teancum’s night mission

Primary source: [Alma 51:32–37](https://www.churchofjesuschrist.org/study/scriptures/bofm/alma/51?lang=eng), researched October 30, 2026.

Verses 32–33 describe the opposing camps after a day of fighting, Teancum and his servant going forth by night, and the exhausted sleeping enemy camp. Verse 34 records Teancum entering the king’s tent and killing Amalickiah with a javelin without waking the servants. Verses 35–36 describe his private return, waking his men, and ordering readiness.

The opening camera sequence establishes the sleeping Amalickiah, imagined watchful sentries, and the two companions before releasing control. The player represents Teancum. Patrols, visible direction cues, detection ranges, stone cover, terrain, tents, costumes, dialogue, the servant’s precise route, and capture/retry are invented gameplay staging. Scripture does not describe this patrol challenge or a failed attempt. Detection is represented by a non-graphic capture and a reset of both companions; the historical death remains a brief account without a graphic enactment. Returning the companion alongside Teancum is staging; the return passage explicitly follows Teancum.

## Mountain-pass watch gameplay

Twelve imagined sentries watch a 48-unit-wide rocky pass. Six watch the central approach and six flank posts stand at x = ±18 beside the outer, middle and northern watch lines. Solid mountain sides meet the playable edges at x = ±24 for the entire route, closing the former wide bypasses. Sleeping tents and trees sit inside the pass. The mountains are invented terrain, not a claim about the location in Alma 51.

Amber ground cones use the same 20-unit range and 15-degree half-angle as detection, with the full range visible. Detection samples the subject's centerline so shoulders just outside a cue cannot cause an unexpected capture. The triangular footprint conservatively contains the three-dimensional sight volume; solid cover and crouching can make parts of the displayed area safe. The cue and head gaze turn together. Both Teancum and the servant must stay unseen; the retry explanation explicitly mentions both companions.

Four two-unit-high stone screens at x = ±20 beside the flank posts provide hiding routes. Each screen uses the shared scenery solid helper, with one dimension source for its visible shape and collision. Each mountain side is a shared terrace-union mesh, using the same dimensions for its visible faces and collision and removing internal duplicate surfaces. This adds two scenery meshes without adding animated patrols.

Verification checks captures against the rendered cones, walks and jumps into both solid sides, checks ground and terrace landing/raycast support and semantic collision registration, and walks both pass edges into a watch line. An actual `stepPlayer` route escorts both companions around the western screens, cuts inward past the middle flank post, enters the royal tent and returns to camp with zero detections. The guards, terrain, cones, screens and exact placements remain invented stealth gameplay.
