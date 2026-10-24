import { test } from "node:test";
import assert from "node:assert/strict";
import { Box3, Vector3 } from "three";
import {
  arrowSpeed,
  createArrowState,
  stepArrow,
  ARROW_GRAVITY,
} from "../src/super/hunting-physics";
import {
  createHuntingAnimal,
  createHuntingBow,
  createArrowModel,
  disposeHuntingModel,
  orientArrowModel,
} from "../src/super/hunting-models";
test("draw strength changes speed and exact gravity produces ballistic drop", () => {
  assert.ok(arrowSpeed(1) > arrowSpeed(0) * 3);
  const arrow = createArrowState(new Vector3(0, 10, 0), 0, 0, 1);
  stepArrow(arrow, 1, [], []);
  assert.ok(Math.abs(arrow.position.z - 42) < 1e-8);
  assert.ok(Math.abs(arrow.position.y - (10 - ARROW_GRAVITY / 2)) < 1e-8);
  assert.ok(arrow.velocity.y < 0);
});
test("thin blocker wins before animal without tunneling", () => {
  const arrow = createArrowState(new Vector3(0, 1, 0), 0, 0, 1);
  const hit = stepArrow(
    arrow,
    0.2,
    [new Box3(new Vector3(-1, 0, 2), new Vector3(1, 3, 2.01))],
    [
      {
        id: "gazelle",
        previous: new Vector3(0, 1, 5),
        position: new Vector3(0, 1, 5),
        radius: 0.6,
      },
    ],
  );
  assert.equal(hit?.kind, "world");
  assert.ok(Math.abs(arrow.position.z - 2) < 1e-8);
  assert.equal(arrow.active, false);
});
test("continuous relative sweep detects moving animal crossing arrow path", () => {
  const arrow = createArrowState(new Vector3(0, 1, 0), 0, 0, 1);
  const hit = stepArrow(
    arrow,
    0.1,
    [],
    [
      {
        id: "crossing",
        previous: new Vector3(-2, 1, 2.1),
        position: new Vector3(2, 1, 2.1),
        radius: 0.35,
      },
    ],
  );
  assert.equal(hit?.targetId, "crossing");
});
test("articulated animal bounds, draw string, arrow direction, and disposal", () => {
  for (const species of ["gazelle", "ibex"] as const) {
    const animal = createHuntingAnimal(species);
    animal.animate(1, 5);
    const bounds = new Box3().setFromObject(animal.group);
    assert.ok(bounds.min.y > -0.2);
    assert.ok(bounds.max.y > 2);
    assert.ok(bounds.max.y < 3);
    let disposed = 0;
    animal.group.traverse((o) => {
      if ("geometry" in o)
        (o.geometry as any).addEventListener("dispose", () => disposed++);
    });
    animal.dispose();
    assert.ok(disposed > 10);
  }
  const bow = createHuntingBow();
  bow.setDraw(1);
  assert.ok(new Box3().setFromObject(bow.group).min.z < -0.35);
  bow.dispose();
  const arrow = createArrowModel();
  orientArrowModel(arrow, new Vector3(1, -1, 0));
  const forward = new Vector3(0, 0, 1).applyQuaternion(arrow.quaternion);
  assert.ok(forward.x > 0.7 && forward.y < -0.7);
  disposeHuntingModel(arrow);
});
