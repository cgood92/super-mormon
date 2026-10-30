# Final adventures: first-quarter verification

Code worktree: `codex/remaining-adventures`, based on main `bea3551`. Local server port 5175. All test browser pages use the dedicated `final-adventures-qa` context; unrelated Workfront tabs were preserved.

## Functional and scene review

Sol design audit selected eight distinct final adventures after the existing Christ at Bountiful. A second adversarial review approved after requiring physical bridge changes, an actual carrying expedition, explicit Shim/Cumorah time separation, no Jaredite steering, sixteen prepared stones rather than sixteen collectibles, and adequate gallery capacity. Code review found one stale gallery asset count; the test now validates every registered asset. The final scene review found no blocking correctness, source or disposal defect.

Peace city tests: 2/2, actual stepPlayer workshop/bridge/ford/storehouse route, supplied ford bypass rejected, roof stair and supported connection, optional courts, blocked wall/trunk and bypass, carried-item recovery, disposal. Mormon tests: 5/5, full supported ascent and carrying return, alternate ladder grab/climb/exit/landing, ridge/trunk blocking and bypass, three discoveries, readable surge/reset/checkpoint ownership, once completion and disposal.

Seven added sculpted profiles share the accepted rig. Worker verified NPC/hero front, side sharp turns, quarter/rear reversals with velocity lag and diagonal crawl/recovery. Automated coverage includes all inner tunic, trousers and footwear on the new profiles. All 27 targeted cases passed across the initial run and corrected seam-precondition rerun. Some new garment cuts are fully welded; all cloth normals are checked for finite unit length and every actual duplicate seam is compared. Existing Lehi/Nephi duplicate-seam regression remains.

## Browser movement

Used `/tools/qa/playthrough.js`, which supplies controller input and reads snapshots. No player position teleportation or runtime state mutation was used for routes.

- Completed peace city at desktop size: enter each western workshop, carry and assemble both physical bridge decks, collect shared seeds, cross the new span and deliver at the storehouse. Both deck states and supplied crossing/completion observed. Inspected 390x844 portrait control/objective layout.
- Separately seeded an explicit prior-24-story save **only in the isolated QA context**, then navigated the normal gallery from its entrance, walked the public staircase to floor 12, walked the western hall and jumped into the peace-city painting. The QA helper's default 12-second timeout expired just 0.5m short on the long hall leg; resumed with a longer driver timeout, no game code change needed. This was driver duration, not blocked traversal.
- Completed peace city again after normal gallery entry. Home returned to its own painting on floor 12 at (-70.38,12,-70), safely clear of caption/canvas. Walked the hall to the neighboring Mormon painting at z=-88 and jumped into it normally.
- Completed Mormon's western stair ascent, chamber pickup and distinct eastern stair/dry-bank return with the visible carrier. Completion observed at refuge and explicit “Much later · Cumorah” epilogue appeared. It distinguishes hidden entrusted records from the few plates given to Moroni.
- Dedicated direct-entry performance page also walked the full Mormon ascent to record pickup and the start of the carrying return at 390x844 portrait. The long objective took excessive vertical space, so route copy was shortened while preserving stairs/ladder/carry guidance. Developer query parameters were never added to any player-facing UI. Direct test scene saves remain disabled by the existing runtime.

## Art and performance

Finished built-in imagegen paintings were visually inspected and integrated through lazy gallery textures; originals retained. Portrait JPEGs are 768x1024, quality65: peace-city 316351 bytes, mormon-records 338208 bytes. Both are below the established 400000-byte mobile limit. Initial full suite caught the original larger encoding; focused asset check passed after re-encoding.

Mormon portrait sample: approximately 95–129 render calls and 301148–302384 triangles including the existing renderer passes, 72 geometries and 6 textures. This is an emulated viewport on desktop hardware, not an on-device frame-rate claim. Shared foliage is instanced and has owned disposal.

The browser visibility handler was exercised with a temporary document.hidden property and a visibilitychange event in the isolated QA page (restored immediately afterward). During a 1.2-second hidden interval, elapsed adventure time stayed 15.3984 and rendered frames stayed 1079. Return opened the existing pause menu, preventing catch-up time. Resuming uses the normal menu. This is a visibility-event simulation; the browser tool does not provide reliable OS-background visibility control.

## Final automated gate

Initial full suite: 495/496 passed; only JPEG mobile size failed. Both assets were corrected and the asset test passed 2/2. Final full rerun: 496/496 passed, zero failures, 334.2 seconds. After the phone objective copy was shortened, focused Mormon tests passed 5/5 and the final build/format check passed. Release evidence is recorded in the plan ledger. Production build and format check passed. No authored cinematic shot was added; normal collision-aware camera was inspected at desktop/phone aspect ratios.
