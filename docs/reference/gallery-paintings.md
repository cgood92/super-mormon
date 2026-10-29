# Gallery paintings

Generated with the built-in imagegen tool. Final gallery assets: `public/art/gallery/broken-bow.jpg`, `ship.jpg`, `voyage.jpg`, and `promised-land.jpg`. JPEGs resized to 1024 pixels on their long edge for lazy-loaded gallery textures.

Primary sources: [1 Nephi 16](https://www.churchofjesuschrist.org/study/scriptures/bofm/1-ne/16?lang=eng), [1 Nephi 17](https://www.churchofjesuschrist.org/study/scriptures/bofm/1-ne/17?lang=eng), [1 Nephi 18](https://www.churchofjesuschrist.org/study/scriptures/bofm/1-ne/18?lang=eng).

The bow story, shipbuilding, ocean journey, and planting after arrival come from scripture. All depicted terrain, ship construction, costumes, faces, camp arrangements and compositions are artistic interpretations, not established historical or archaeological reconstructions.

## Final prompts

### broken-bow

Portrait 3:4 fine art oil painting for a family scripture story gallery, lavish luminous detail and traditional brush texture. A vast ancient desert wilderness with towering sandstone mountains, winding paths, small distant family tents and a tiny traveler climbing toward a sunlit ridge. In foreground on a rock rest a damaged curved wooden bow with a loose string, an unfinished fresh wooden stave and wood shavings. Peaceful still life and magnificent landscape about resourcefulness and provision. Warm golden dawn and blue atmospheric shadows, no text or border. Artistic interpretation inspired by 1 Nephi 16.

### ship

Use case: historical-scene. Asset type: portrait 3:4 museum story painting for a Book of Mormon game, no border, no lettering or text. Style: lavish detailed traditional oil painting, luminous atmospheric landscape, realistic yet painterly figures in simple ancient woven tunics, dramatic rich natural color, fine brush texture, dignified and reverent, exquisite gallery artwork. These are artistic interpretations, avoid claiming archaeological specificity. Nephi and companions carefully working timber on an impressive unfinished wooden ship beside a lush remote coastline at Bountiful, sculptural ribs of hull, simple woodworking tools, green headlands, azure sea and radiant sky. Based on 1 Nephi 17 and 18:1-4. Invented ship design, no modern technology, no Viking dragon prow.

### voyage

Portrait 3:4 exquisite luminous traditional oil painting for a museum gallery. A magnificent ancient wooden sailing ship carries a family over rolling blue green ocean under towering clouds opening to radiant sunlight, viewed three quarter from nearby sea level. Small figures wearing woven tunics aboard, beautiful hand worked timbers and cream canvas sail. Grand hopeful seascape, rich brush texture and atmospheric depth. No lettering, no border. Based on the voyage in 1 Nephi 18; imagined vessel design.

### promised-land

Portrait 3:4 exquisite luminous traditional oil painting for a museum gallery. Ancient travelers in woven tunics planting a new garden beside modest tents in a vast fertile landscape after an ocean voyage. Family tending seedlings together, distant wooden ship by the shore, magnificent mountains and luminous morning sky, lush plants. Hopeful and peaceful new home. Rich realistic painterly detail, no text, no border. Based on 1 Nephi 18:23-25. Artistic interpretation with imagined geography.

## Later gallery paintings

Nine original artworks generated with the built-in image generation tool, October 2026. Production derivatives are portrait JPEGs in `public/art/gallery`, sized for the gallery's portrait surfaces. Raw generation files stay outside the deployment. The shared `painting()` helper requests textures only when rendered and disposes loaded/in-flight textures with the material. The four early journey replacements are documented above.

## Primary scripture sources and subjects

- [Lehonti — Alma 47:7–13](https://www.churchofjesuschrist.org/study/scriptures/bofm/alma/47?lang=eng): camp on Mount Antipas, embassy and valley camp; the painting anticipates the guarded meeting.
- [Morianton — Alma 50:25–35](https://www.churchofjesuschrist.org/study/scriptures/bofm/alma/50?lang=eng): a servant woman warns Moroni; Teancum intercepts Morianton at the narrow passage. The painting condenses the report and patrol into one scene; the messenger meeting Teancum is an artistic condensation, not a quoted event.
- [Teancum — Alma 51:32–35](https://www.churchofjesuschrist.org/study/scriptures/bofm/alma/51?lang=eng): Teancum and his servant approach a sleeping enemy camp beside the seashore. Shows the approach rather than the killing.
- [Gid — Alma 55:16–24](https://www.churchofjesuschrist.org/study/scriptures/bofm/alma/55?lang=eng): arms are passed to the prisoners, including women and children; a rescue without immediate killing.
- [Nephihah — Alma 62:20–26](https://www.churchofjesuschrist.org/study/scriptures/bofm/alma/62?lang=eng): Moroni observes the sleeping city and enters its western side using cords and ladders.
- [Samuel — Helaman 13:4; 16:1–3](https://www.churchofjesuschrist.org/study/scriptures/bofm/hel/16?lang=eng): Samuel preaches from the city wall and is protected from arrows and stones.
- [Signs — 3 Nephi 1:15–21](https://www.churchofjesuschrist.org/study/scriptures/bofm/3-ne/1?lang=eng): the night without darkness and new star, seen by families in the Americas. The composition combines the signs without depicting Bethlehem.
- [Gathering — 3 Nephi 3:13–26](https://www.churchofjesuschrist.org/study/scriptures/bofm/3-ne/3?lang=eng): households, flocks, and provisions gather for defense under Lachoneus and Gidgiddoni.
- [Christ at Bountiful — 3 Nephi 11:1–17](https://www.churchofjesuschrist.org/study/scriptures/bofm/3-ne/11?lang=eng): Christ appears at the temple and invites the people to witness his wounds, one by one.

Architecture, terrain, clothing, faces, weather, precise geography and staging are imagined reconstructions, not established historical identifications. No skin color or ethnicity denotes moral allegiance. The art contains no invented scripture text.

## Prompt set

Each asset uses `historical-scene`, with its subject below and this shared direction:

> Portrait gallery oil painting for a Book of Mormon exploration game. Exceptionally beautiful detailed realistic cinematic traditional oil painting, natural anatomy, nuanced faces, rich brushwork and atmospheric depth, fine museum art. Portrait aspect ratio 3:4, full bleed composition, no frame, lettering, watermark, panels or borders. Ancient American setting is an imaginative reconstruction, restrained woven tunics, cloaks and sandals, natural stone and timber architecture. Distinguish allegiance with posture and clothing, never skin color. Suitable for older children.

Full per-image prompts are recorded in `gallery-painting-prompts.json`.
