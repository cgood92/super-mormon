# October 26 playtest integration

Implemented Bountiful and Great Waters feedback, followed by Promised Land, the olive vineyard, and Jacob/Sherem feedback. Individual source/staging notes distinguish scriptural narrative from imagined terrain, player roles, dialogue and condensed chronology.

Shared fixes: dry physical ship floors take precedence over water buoyancy; negative implicit-ground penetration recovers; touch controls prevent long-press selection/callouts; lazy imports retry transient failures and can resolve a current-deployment chunk through the public build manifest without reloading the page. Failed downloads expose an in-game retry. The reported original olive download failure was not reproduced locally; current-deployment recovery is covered with a simulated missing old chunk.

## Analytics proposal — not implemented

A future `gameplay_issue` event could report a small stable `issue_kind` (outside bounds, below valid world support, or sustained blocked movement) together with existing level/story phase and the recovery used. Require several active frames before reporting, suppress legitimate swimming/climbing/cinematics/pauses, and deduplicate per incident with a cooldown. Compare issue counts and affected visits by level, followed by retries/exits. Avoid exact player routes, persistent identifiers and frame-by-frame events. Establish thresholds from actual scene geometry; low altitude alone would falsely flag swimming.

## Validation

Automated scene tests exercise actual `stepPlayer` routes, collision ownership, single-press interactions, scripted progression, ship clearance/retry, safe authored cameras at desktop/phone aspects and disposal. Browser checks supplement these; automated route success does not establish physical-phone performance or complete visual acceptance.

Final integration: 392/392 tests pass; production build and repository formatting pass. Targeted browser checks used ordinary input from scene spawn: Bountiful mountain ascent; voyage descent/release/prayer/Liahona/wheel; full Promised Land burial→valley journey→arrival; olive servant approach and one-press pruning; Sherem temple/city/outskirts search, moving actor interaction and automatic ending. Phone-size views verified the burial and Sherem encounter, and computed touch-label nonselection/contextmenu suppression. Voyage steering review caught a sail blocking the passage, addressed with a raised external camera and reefed cloth, then covered by rendered-geometry visibility regressions. Complete browser playthroughs of every Bountiful timber placement and every olive operation were not repeated; automated routes cover those sequences. Physical-phone performance remains unmeasured. Desktop browser diagnostics in phone-sized layout sampled olive at30 draw calls/142,756 triangles and Sherem at75 calls/152,904 triangles, around120fps on this host; these are not mobile-device benchmarks.
