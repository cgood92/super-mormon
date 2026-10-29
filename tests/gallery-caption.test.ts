import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { gallery } from "../src/super/conference-center";

test("every story caption has its own surface below the painting frame and matching support", () => {
  const scene = new THREE.Scene();
  const world = gallery(scene);
  scene.updateMatrixWorld(true);
  for (const portal of world.portals!) {
    const floor = (portal.y ?? 0.59) - 0.59;
    const captions: THREE.Mesh[] = [];
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.name === "plaque")
        captions.push(object);
    });
    const caption = captions.find((object) => {
      const position = object.getWorldPosition(new THREE.Vector3());
      return (
        Math.hypot(position.x - portal.x, position.z - portal.z) < 0.5 &&
        Math.abs(position.y - floor - 0.25) < 0.01
      );
    });
    assert.ok(caption, `${portal.id}: caption must sit below its frame`);
    const bounds = new THREE.Box3().setFromObject(caption);
    assert.ok(bounds.min.y > floor, `${portal.id}: caption clears floor`);
    assert.ok(
      bounds.max.y <= floor + 0.45 + 1e-6,
      `${portal.id}: caption clears frame bottom at 0.5m`,
    );
    const material = caption.material as THREE.MeshBasicMaterial;
    assert.equal(material.transparent, false);
    assert.equal(material.depthTest, true);
    assert.equal(material.depthWrite, true);
    assert.equal(caption.renderOrder, 0);
    const support = world.solids.find(
      (solid) =>
        Math.hypot(solid.x - portal.x, solid.z - portal.z) < 0.5 &&
        Math.abs(solid.y - bounds.min.y) < 1e-6 &&
        Math.abs(solid.h - 0.4) < 1e-6 &&
        Math.abs(
          (portal.facing === "east" || portal.facing === "west"
            ? solid.d
            : solid.w) -
            (portal.facing === "east" || portal.facing === "west"
              ? bounds.max.z - bounds.min.z
              : bounds.max.x - bounds.min.x),
        ) < 1e-6,
    );
    assert.ok(support, `${portal.id}: support shares caption dimensions`);
  }
  world.dispose?.();
});
