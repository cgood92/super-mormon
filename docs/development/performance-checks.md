# Lightweight performance checks

Run `npm run dev` and open the game with `?performance` (append `&performance` if a query is already present). Diagnostics are enabled only in a development build and do not add a game overlay.

In the browser console:

```js
window.superMormon.performance();
console.table(window.superMormon.performance().scenes);
```

The snapshot includes a roughly one-second average FPS, the latest frame's render calls and triangle count, and Three.js geometry/texture counts. `heapBytes` uses the browser's optional JavaScript heap API; `null` means unavailable, not zero. These numbers measure workload and allocated renderer resources, not GPU memory bytes or GPU frame time.

For a quick growth check, visit the same story, return to the gallery, and repeat several times. Scene samples are captured after their first render and retain the latest 40 visits. Compare `sincePreviousVisit` for the same scene and `sinceBaseline` against the first sampled scene. Stable resource counts after warmup are expected; persistent growth across repeated visits is a reason to inspect disposal. Different scenes naturally have different resource counts. JavaScript heap values fluctuate with garbage collection, and browser caches can warm up, so a single positive delta does not establish a leak.

Record FPS while standing in the same place and facing the same direction to compare changes. Browser backgrounding, display refresh rate, and device capability affect FPS. Run this developer check separately from production loading/bundle measurements.

## Graphics and laptop power

Pause → Graphics offers saved Balanced (default, 60 FPS), Battery saver (30 FPS), and High refresh (display refresh) modes. Balanced caps render scale at 1.25 and the drawing buffer at 2 million pixels; Battery saver uses 1.0 / 1 million, and High refresh 1.7 / 3 million. All modes respect the device pixel ratio. Sustained slow frames lower scale conservatively; recovery requires ten seconds of stable frames. High refresh attempts display refresh while adaptive scaling uses a 60 FPS quality floor.

Static paused menus preserve the current world image and redraw only after invalidation (resize, settings, scene or texture loading). Menu input continues at 30 Hz and cinematic sequences remain animated. Hidden tabs retain the existing complete animation-loop suspension. The renderer uses the browser's default GPU power preference.

The developer performance snapshot now includes `graphics`: selected mode, frame limit, effective render scale, adaptive factor, drawing-buffer dimensions and cumulative `renderedFrames`. Paused diagnostics report zero FPS; the last rendered frame's triangle and draw counts remain available. Compare `renderedFrames` over a timed interval to verify that static menus do not render. Heap samples alone do not establish a leak.

### October 27, 2026 verification

Chrome 155 / Apple M3 Max, 1440 × 900 CSS viewport, DPR 2, 120 Hz display. Short development-build GPU samples use `EXT_disjoint_timer_query_webgl2` (one frame in eight/fifteen over five seconds, excluding disjoint results). These measure rendering, not fan speed, battery life or full-device utilization.

| Entrance view                           | Before              | After, Balanced                      |
| --------------------------------------- | ------------------- | ------------------------------------ |
| Gallery frame rate                      | 120 FPS             | 60 FPS                               |
| Gallery triangles/frame                 | 893,756             | 400,326                              |
| Gallery GPU render time/frame           | 3.56 ms             | 2.13 ms                              |
| Gallery drawing buffer                  | 3.75 million pixels | 2.00 million pixels                  |
| Static pause-menu frames over 3 seconds | about 360           | 0                                    |
| Tree of Life draw calls/frame           | 559                 | 296–311, depending on opening camera |

Gallery calls increased from 439 to 474 because 38 independently culled seat banks replace three auditorium-wide instances. Distant banks use shaped backs/cushions with six triangles per seat; near banks retain all original geometry. The GPU measurement confirms the vertex savings outweigh the added calls in this view. No auditorium region is hidden based on player location, preserving doorway, balcony, roof and cinematic sightlines.

Browser checks covered Balanced/Battery/High refresh, saved settings, responsive keyboard pause navigation without 3D rendering, equal two-second walking distance in Battery saver, a normal gallery-to-auditorium walking route, Tree of Life cinematic continuation, and landscape mobile menu scrolling. Production preview rendered 240 frames in four seconds (60 FPS), and zero additional paused frames. Camera regression coverage includes switching from distant to detailed LOD surfaces while a shot is in progress. Full suite: 404 tests; production build and format checks pass. Physical laptop thermals, physical phones, and exhaustive chapter playthroughs remain outside these measurements.
