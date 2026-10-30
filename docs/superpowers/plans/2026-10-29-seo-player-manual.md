# Search discovery and player manual plan

**Goal:** Help families discover Super Mormon and give players a classic-style instruction booklet outside gameplay.

**Approach:** Extend existing metadata, publish buildless HTML/CSS through Vite’s public directory, link from GitHub and the sitemap, and update repository metadata. No new hosting or runtime dependency.

- [x] Inspect main, controls, progression, story implementations, deployment, and current search guidance.
- [x] Add factual game metadata and a responsive, printable standalone manual using project artwork.
- [x] Cover controls, moves, all 24 stories, hints, family context, scripture/adaptation distinctions, saves and troubleshooting.
- [x] Verify formatting, suite, project-path production build, desktop/mobile presentation, links and print output.
- [x] Review changes, update GitHub description/topics, commit, push, and open a PR.

Review focus: base-path-safe URLs; no manual entry in gameplay; accurate controls/story order; no game bundle on manual; hints visible in print; no unsupported endorsement/rating claims.

Repository instructions authorize direct implementation without a design/spec approval. Static documentation and metadata use build, link, and visual checks rather than implementation-mirroring tests.

Validation: 485/485 tests; format check and GitHub Pages production build pass. Built local assets, links, anchors, JSON-LD, sitemap and all 24 story names checked. Browser checks at desktop and 390px phone width show no page overflow; all 31 hints expand for print, including the 24 source-checked starting hints. Normal game entry loads without a manual link. Independent Sol review found no actionable issues, including a follow-up review of the new hints. GitHub description and seven topics updated.
