# Third Nephi verification — October 27, 2026

Three independent Sol scene builders produced the adventures; an independent Sol reviewer found and rechecked the integration fixes. Sources, adapted details and exact traversal routes are recorded in [Night Without Darkness](../stories/signs-night.md), [Lachoneus's Gathering](../stories/lachoneus-gathering.md) and [Christ at Bountiful](../stories/christ-bountiful.md).

## Automated checks

- Full combined Node suite after integrating concurrent main changes: 430 passing, zero failures. Focused scene tests exercise actual `stepPlayer` walking, routes around obstacles, elevated landings, both refuge entrances, provision carrying/delivery/retry, and collision-aware escort arrival.
- Scene and integration checks cover semantic scenery collision, one raycast floor owner at each spawn, lazy preparation, disposal, pending callbacks, exactly-once completion and optional discoveries. Gallery traversal now reaches third-floor canvases through both escalator flights.
- TypeScript, Vite production build and repository formatting checks pass. All three loaders use the current deployment-aware import helper; its seven focused import/integration tests pass. Three.js retains its existing large vendor-chunk warning.
- Review fixes: Nephi stands atop the watch terrace; the gathering child moves with independent collision; visible sacks follow pickup/carry/deposit/retry; the three worlds remain explorable after saving completion, with the gallery button available to leave.

## Browser checks

Used a temporary localhost test tab, with direct scene entry preserving saved story progress. Actual keyboard movement advanced the town from its entrance through the square, west roof stairs, bridge and northern terrace; the bright-night sign appeared. Repeated the full route in the final merged desktop build, returned to the families, and confirmed completion increased the in-memory story count while keeping the town and its exploration objective open. At Bountiful, walked from the entrance into the court and exercised both source-grounded narrations. At the refuge, walked around the western ridge, picked up orchard grain, carried it back through the gate and deposited it: the visible objective changed to `1/3 loads stored`.

Inspected phone layout at 319 × 779 and all three desktop layouts at 1280 × 800 through a temporary viewport fixture, then completed the town route directly at 1280 × 720. These are layout/emulated-browser checks, not physical phone performance claims. Complete escort and retry routes are covered by physics tests; browser checks sampled the routes above rather than manually completing every optional activity. No player teleport or saved-progress changes were used. The temporary viewport fixture was removed and the testing tab closed.

## Render workload

Constructed-scene totals before culling (includes all characters, before the player rig):

| Scene | Meshes | Triangles | Batched instances | Collision solids |
| --- | ---: | ---: | ---: | ---: |
| Night Without Darkness | 207 | 155,230 | 0 | 63 |
| Lachoneus's Gathering | 293 | 191,394 | 364 | 49 |
| Christ at Bountiful | 230 | 199,104 | 0 | 47 |

These bound scene complexity; they do not measure frame time or actual culled draw calls. Vegetation in the large valley uses existing instancing, whose buffers are disposed with the world. Story modules remain separate lazy production chunks (roughly 5–7 KB each before gzip).
