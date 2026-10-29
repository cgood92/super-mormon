# Ammon playtest implementation plan

Goal: Apply the user’s concrete playtest feedback in an isolated worktree while another agent works in the primary checkout.

Architecture: Keep the existing Three.js adventure runtime and sling physics. Correct the phase transitions in `ammon-flocks.ts`, and replace freestanding later gallery entrances with the existing side-wall exhibit bays.

Requirements: Begin herding immediately; reach actual water before an acted scatter; mark missing animals; recover only once; distinguish masked dark-clothed attackers and show their stones; make aimed sling shots usable. Preserve first-six gallery entrances and free auditorium access.

- [x] Reproduce the intro gate, premature scatter, repeated-scatter timer, and disconnected hallway art in existing source and tests.
- [x] Add failing regression coverage for immediate herding, actual water arrival, single recovery, attacking raiders, costume attachment, and reticle alignment.
- [x] Implement the Ammon phase corrections and document Alma 17 versus imagined staging.
- [x] Migrate later entrances to existing wall exhibits with solid canvases and orientation-aware entry tests.
- [x] Check cinematic framing and collision across approach angles and aspect ratios; inspect rendered actors and a normal player route.
- [x] Run full suite and production build, review the diff, commit and push the verified branch to the personal GitHub repository.

Verification: 419 tests passed after rebasing onto main, production build passed, browser walking routes and rendered cinematic/costume checks completed, independent review completed.
