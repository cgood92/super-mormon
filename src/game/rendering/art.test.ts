import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { label } from "./art";

// Node has no canvas. Supply only the 2D boundary; exercise the real label builder.
test("label retains independent upload pixels when its temporary canvas is discarded", () => {
  const pixels = new Uint8ClampedArray([255, 245, 223, 255]);
  const context = {
    measureText: (text: string) => ({ width: text.length * 8 }),
    fillRect() {},
    strokeRect() {},
    fillText() {},
    getImageData: () => ({ data: pixels }),
  };
  const canvas = { width: 0, height: 0, getContext: () => context };
  const prior = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { createElement: () => canvas },
  });
  try {
    const plaque = label(new THREE.Group(), "Story title", 0, 0, 0);
    const material = plaque.material as THREE.MeshBasicMaterial;
    const texture = material.map!;
    pixels.fill(0); // Simulate the browser discarding the 2D backing store.
    assert.deepEqual(
      Array.from(texture.image.data ?? []),
      [255, 245, 223, 255],
    );
    assert.equal(texture.image.width, canvas.width);
    assert.equal(texture.image.height, canvas.height);
    assert.equal(
      texture.flipY,
      true,
      "canvas rows retain their rendered orientation",
    );
    assert.equal(texture.colorSpace, THREE.SRGBColorSpace);
    let disposed = false;
    texture.addEventListener("dispose", () => {
      disposed = true;
    });
    material.dispose();
    assert.ok(
      disposed,
      "standalone label materials release their upload texture",
    );
    plaque.geometry.dispose();
  } finally {
    if (prior) Object.defineProperty(globalThis, "document", prior);
    else Reflect.deleteProperty(globalThis, "document");
  }
});
