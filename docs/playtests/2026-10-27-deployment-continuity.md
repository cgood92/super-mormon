# Deployment continuity verification — October 27, 2026

The original checkout did not contain deployment recovery. Fresh `main` did: `scene-import.ts` retries and can fetch a current-deployment scene through `scene-manifest.json`. Its unit tests simulate missing old modules. That fallback does not retain an older tab’s matching module graph. The deployment change now keeps Vite’s immutable assets in a durable `pages-assets` branch and includes their union in each Pages upload.

## Browser deployment swap

Built production versions A and B with `/super-mormon/` as the base. B changes the Jerusalem and house scene titles, producing different scene URLs. Served A, opened the gallery, and verified the Jerusalem scene had not loaded. Preserved A’s assets with `retainAssets`, then replaced the served directory with B including retained assets. Used the existing controller playthrough driver to walk from the gallery spawn to the first painting and jump into it. No teleportation or progress manipulation.

| Browser session | Result after swapping to B |
| --- | --- |
| Already-open desktop tab | Entered `streets`; title `Jerusalem`; loaded A’s `jerusalem-aT1pvwKK.js`; session marker survived; one navigation; completion set stayed empty. |
| Already-open 390 × 844 touch/mobile emulation | Entered `streets`; title `Jerusalem`; loaded A’s same original scene module; session marker survived; completion set stayed empty. |
| Fresh tab after deployment | Entered `streets`; title `Jerusalem (new deployment)`; loaded B’s `jerusalem-Cjap0v8E.js`. |

Neither old session requested the fallback scene manifest. This confirms asset retention handled the scene entry without mixing versions or reloading. Mobile emulation verifies the browser behavior at a phone viewport; this was not a physical-phone test. Closed all three test tabs and preserved the unrelated Analytics tab.

## Archive verification

Regression tests execute real lazy module imports after successive deployments, cover transitive shared dependencies and immutable-filename collisions, and publish to a temporary bare Git remote across fresh checkouts. They verify that the source checkout/index stays unchanged and old HTML is not archived. Another test rejects bootstrap artifacts that omit the live deployment even when a newer, undeployed artifact exists.

Ran initialization against the real GitHub deployment statuses and seven unexpired main Pages artifacts, writing only to temporary local bare repositories. It identified the live deployment, downloaded the artifacts, and produced a 19.0 MiB combined site. No live site or remote archive branch was modified by that test.

Deployment stops if it cannot restore/seed/persist the archive, detects a filename collision, or the combined site exceeds 900 MiB. Historical files are never automatically pruned. Stable public image paths remain outside the hashed-code retention scheme and must stay available. Tabs depending on code already deleted before available artifact history may still need a refresh.
