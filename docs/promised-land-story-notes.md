# Promised Land: remembrance and departure

Primary sources, read for the October 2026 playtest revision:

- [1 Nephi 18](https://www.churchofjesuschrist.org/study/scriptures/bofm/1-ne/18?lang=eng), especially 23–25: landing, tents, planting, and wilderness exploration.
- [2 Nephi 1](https://www.churchofjesuschrist.org/study/scriptures/bofm/2-ne/1?lang=eng): Lehi's counsel after arrival.
- [2 Nephi 2](https://www.churchofjesuschrist.org/study/scriptures/bofm/2-ne/2?lang=eng) and [3](https://www.churchofjesuschrist.org/study/scriptures/bofm/2-ne/3?lang=eng): teachings to Jacob and Joseph.
- [2 Nephi 4:12](https://www.churchofjesuschrist.org/study/scriptures/bofm/2-ne/4?lang=eng&id=p12#p12): after speaking to his household, Lehi grows old, dies, and is buried. The text does not describe his final movements, manner of death, burial site, or who performs the burial.
- [2 Nephi 5:5–8](https://www.churchofjesuschrist.org/study/scriptures/bofm/2-ne/5?lang=eng&id=p5-p8#p5): Nephi receives a warning and departs with willing families, including Sam, Zoram, Jacob, Joseph, his sisters, and others; they travel many days, pitch tents, and name the place Nephi.

The scene compresses years and separate events into a short playable sequence. Lehi's slow walk from the shore, his gentle reclining death animation, Nephi performing the burial, the memorial stone, and the household gathering in a circle are invented staging. They must not be described as scriptural details. The opening notice explicitly identifies the final walk as imagined. The relatives include unnamed women and a child; their costumes, faces, and positions are artistic reconstructions. Laman and Lemuel remain by the memorial; they do not join the departing followers. Costume and behavior distinguish people, never skin color as a moral signal.

The coastal camp, ship landmark, mountain and valley network, vegetation, route choices, settlement circle, exact distances, and geographical orientation are invented. No real-world location is asserted. The playable objective starts with finding Lehi, has one burial interaction, and immediately allows the player to lead the willing group. There are no camp, seed, counsel, waypoint, record, or construction interaction gates, and no Continue dialogs. Reaching the settlement circle completes the scene once. The later temple described in 2 Nephi 5:16 is deliberately outside this level's scope.

Mountain islands use the shared `terracedRock` helper, with fitted supporting surfaces. Paths tint the existing sole ground mesh; they do not add overlapping walk floors. Ten mountain islands form several cross-connected valleys and perimeter routes. Small foliage remains explicitly flexible scenery. Tests cover both central branches using actual `stepPlayer` movement, independent walking/death progression, the single burial input, no dialogs, automatic settlement completion, semantic collision registration, landing on a mountain, and instance-buffer disposal.
