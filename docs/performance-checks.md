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
