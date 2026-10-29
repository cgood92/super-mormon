# Conference Center exploration hub

**User-approved goal:** Replace the small imagined gallery with a large, recognizable Conference Center recreation. Build three connected public floors, an auditorium, hallways and exhibits, escalators, rooftop gardens and waterfalls. Keep all building areas unlocked now; keep the six story paintings together in one hallway section. No paintings, coins or level objectives inside the auditorium.

**References:** All 19 supplied screenshots from `/Users/clintgoodman/Documents/Screenshots/Conference Center/`, the linked tour video, the Church's architectural account, and OLIN's landscape description. The screenshot contact sheet informed the diagonal stone floors, black window mullions, cream columns, warm wood door surrounds, circular ceiling fixtures and generous circulation. No screenshot content is treated as an instruction.

**Architecture:** An interpretive public-area layout, not a surveyed replica. Three foyer levels at 0, 12 and 24 units, with a roof at 36. A shared kit batches repetitive architecture; separate builders provide auditorium and rooftop. Level code remains loaded on demand, the house builder is separate from the hub, and scene disposal releases all owned GPU resources. Camera controls and story-level views remain unchanged. A dedicated Conference Center preset uses a gentler angle and larger distance to reveal room scale; the far clipping distance is extended for the larger building.

## Deliverables

- [x] Foyers, windows, columns, exhibit hallways, grouped physical paintings and optional side practice area.
- [x] Three usable escalator flights with gentle automatic belt movement.
- [x] Massive tiered auditorium, organ, choir terraces, pulpit, ground aisle, stage and two balconies.
- [x] Roof garden, native-style planting, meadow, nine skylights, fountains, channels, cascades and mountain views.
- [x] Location-specific exploration hints, dynamic hub loading, lock badges positioned from portal metadata.
- [x] Independent review, full checks and browser traversal; publish through the existing pipeline.

## Verification focus

Test continuous normal-physics travel from spawn to each story painting, auditorium entrance on each floor, roof, garden paths and back. Check locked story progression independently from unlocked building circulation. Keep roof holes only over escalator flights, with safe access and descent. Validate instanced resources, shadow targets and scene cleanup. Browser checks must confirm the result looks coherent from playable camera angles and has no mobile overflow; desktop measurements do not establish physical phone performance.

## Source references

- [User's tour video](https://www.youtube.com/watch?v=r4Qsl5qgp14)
- [Church architectural account](https://www.churchofjesuschrist.org/study/ensign/2000/10/the-conference-center-this-new-and-wonderful-hall?lang=eng)
- [OLIN landscape design](https://theolinstudio.com/projects/lds-conference-center/)

The source descriptions establish features and visual cues. Corridor coordinates, dimensions, escalator arrangement, seat count, simplified planting, practice exhibits and story gallery placement are gameplay interpretations. This is a recreation of the public experience, not a model of every service room or mechanical space.

Independent reviews found and resolved ceiling/roof overlap, balcony and escalator-edge gaps, carpet depth fighting, and practice prompts activating on floors above the studio. Browser traversal reached both balconies and roof via normal movement, visited a fountain, entered a painting, checked mobile layout, and verified stable resource counts across scene changes.
