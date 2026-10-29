# Night Without Darkness

Primary source: [3 Nephi 1](https://www.churchofjesuschrist.org/study/scriptures/bofm/3-ne/1?lang=eng), particularly verses 2–3, 5–21. The scene follows Samuel's prophecy; it does not place Samuel in this later town. Nephi is the son of Nephi and grandson of Helaman, the record keeper of this chapter, not Nephi son of Lehi. His approved Jacob appearance gives him a distinct beard, clothes and silhouette without creating another character rig.

The source describes threatened believers, Nephi praying for his people, the Lord's assurance, sunset without darkness and a new star. Threats are conveyed through the waiting inhabitants, without staging violence. The sign is a gift of God. There is no prayer meter, collection threshold or purchase. Arrival at the terrace starts a seven-second condensed presentation of the evening; it does not imply that the player's route caused the miracle. Optional discoveries never control the sign or completion. The player remains free to move, and the normal player camera remains active throughout.

The town plan, homes, roof bridge, garden, clothing, unnamed inhabitants, conversations and player role are invented adaptations. They are not an archaeological reconstruction or an assertion of exact geography. Inhabitant dialogue is labeled as imagined. Narrative toasts paraphrase scripture rather than introducing invented words attributed to the Lord.

## Play

Start at (0, 0, 27). Walk north to the gathering square (0, 0, 12). A floating gold diamond identifies the current destination. Take the western stairs starting at (-18, 0, 10), walking north to the rooftop watcher (-18, 4, -12). Cross the optional roof bridge to (-10, 4, -12), then drop into the north road via (-5, 0, -24). Follow the broad northern steps from (0, 0, -26) to the watch terrace (0, 4, -44). Watch the evening remain bright and the star appear, then walk back down the steps and return to the square. Progress comes from navigation; pressing interact at spawn does nothing. Completion fires exactly once and the town stays explorable.

Four open-front homes, six optional conversations, a winding garden and three discoveries reward detours. The bridge vista is (-9, 4, -12), garden refuge (22, 0, -22), and potter courtyard (-29, 0, 25). Enter the potter home from the south via (-29, 0, 34); approach its workbench at (-29, 0, 26.5). The garden has a west/south opening; its low walls can also be jumped. The roof bridge is optional; the west stairs provide a safe return.

All house walls, roofs, steps, garden boundaries, workbench, sitting stone and tree trunks use shared geometry/collision dimensions. One ground mesh owns the floor. Roof and terrace surfaces have thickness. Tree crowns are deliberate overhead decoration. The sky star and floating destination diamond are explicitly nonphysical. No bespoke cinematic camera or teleports are used. Disposal removes the root, character resources, lights, materials and geometry and restores the prior background/fog.

## Verification

`node --import tsx --test src/game/worlds/third-nephi/signs-night.test.ts` verifies the complete normal route with actual `stepPlayer`, roof and terrace landing, walking around buildings, a blocking wall, optional bridge/courtyard discoveries, semantic scenery collision validation, repeated-interaction resistance, exactly-once completion, pending dialogue guards and idempotent disposal. Browser QA is performed by the integration coordinator.
