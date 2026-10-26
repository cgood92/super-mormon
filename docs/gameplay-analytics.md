# Gameplay analytics

The production game uses GA4, owned by Clint’s Google account:

- Analytics account: Book of Mormon Golf (`174023464`)
- Property: Super Mormon (`560764360`)
- Web stream: Super Mormon — production (`16206783522`)
- Public measurement ID: `G-Y0M4GM5HMT`
- Production: https://cgood92.github.io/super-mormon/
- Property: https://analytics.google.com/analytics/web/#/a174023464p560764360/reports/intelligenthome
- Saved exploration: https://analytics.google.com/analytics/web/#/analysis/a174023464p560764360/edit/4ImfJ5dNQy-wJFrTmKP-6Q

The GitHub Pages build sets `VITE_GA_MEASUREMENT_ID`. Missing ID disables collection. Development always stays silent, including when that variable is present. Only the exact production entry URL (or index.html) with no query/hash may load the tag. Localhost, copies, previews, debug scene links, cast/pose pages and tests never send events. No analytics queue is persisted locally. GA’s normal first-party cookies support aggregate returning-user reports; the game adds no player ID. Advertising storage/personalization and Google Signals are disabled. Enhanced measurement is off.

The pause menu links to `privacy.html`, which explains collection and cookies and links Google’s privacy information and browser opt-out. The privacy page itself loads no tag.

## Events

All events carry stable `level_id` and `input_device` categories. `hub` means gallery.

| Event | Parameters / interpretation |
| --- | --- |
| `level_start` | `entry_reason`; actual playable entry after loading/splash |
| `level_end` | `success`, `total_active_seconds`; completion committed once |
| `level_exit` | `exit_reason`, `story_phase`, `total_active_seconds`; explicit gallery return, restart, scene change or best-effort page close |
| `level_retry` | `retry_reason`; actual manual restart or checkpoint reset |
| `play_time` | `active_seconds`; incremental active time, every 30s and on pauses/exits |
| `move_used` | `move_name`; successful transition/episode, not button presses |
| `camera_used` | `camera_action` rotate or recenter, grouped per gesture |
| `story_step` | `story_phase`; stable objective phase from runtime snapshot |
| `secret_found` | `secret_id`; once per page session, including organ, discovery tokens, gallery areas and delivery |
| `activity_used` | `activity_id`; successful repeated optional activity use |

Active duration excludes loading, splash, menus, dialogue/cinematics and hidden tabs. Long stalled/suspended frames over one second are discarded. Ordinary frame duration is measured separately from the simulation cap. Checkpoint retries stay inside the same level visit; manual restart ends a visit and begins another. Summing `active_seconds` is safe: attempt summaries use a different parameter. Sum `total_active_seconds` only for the desired end/exit event; use event count to derive average time per completed/abandoned visit. Page close delivery is best effort, especially after force quit or lost connectivity; explicit gallery-return exits are distinct.

The physics currently exposes ground pound/landing, wall kick, crouch/backflip, long/double/triple jumps, sideflip, crawling, ledge grab, climbing and swimming. It has no separate pound-kick or pound-jump mechanic; analytics does not manufacture successful-use events for absent moves. New mechanics should emit from their authoritative successful transition. Tree climb IDs distinguish trees/olives/palms/acacias from poles and other climbing surfaces.

## Reports

Custom event dimensions are registered for Level, Move, Camera action, Secret, Activity, Story phase, Exit reason, Input device, Entry reason and Retry reason. Custom metrics are Active play seconds (`active_seconds`, Seconds) and Attempt total seconds (`total_active_seconds`, Seconds).

Use the saved **Super Mormon — gameplay overview** exploration: Levels and active time; Camera controls; Discoveries and side activities; Moves used; Unfinished exits and gallery returns; New and returning players. Each tab is configured with the relevant dimensions, metrics and event filters. New dimensions/events can take time to appear in processed reporting; Realtime is the initial verification view. For level completion rate, compare `level_end` event count with `level_start`, excluding hub. For unfinished gallery returns, filter `level_exit` with Exit reason = gallery. For move adoption, compare Total users with event count by Move and Level. Returning-player totals use GA’s new/returning user and retention reports; visits do not prove enjoyment.

## Tests and maintenance

`tests/analytics.test.ts` injects a transport and makes no network calls. It checks exact deployment gating, disabled initialization, time accounting, once-only completion, exits/retries, camera grouping, discoveries, successful movement and blocked transports. Keep normal local QA untracked. Verify production with the actual tag/network and GA Realtime after deployment; do not enable collection on local development to populate reports. The public measurement ID is not a secret; never add service-account keys or OAuth tokens to the browser.
