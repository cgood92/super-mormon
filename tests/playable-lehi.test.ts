import assert from "node:assert/strict";
import test from "node:test";
import * as T from "three";
import { buildSculptedLehi } from "../src/super/lehi-sculpted-models.ts";
import { createPlayableLehi } from "../src/super/playable-lehi.ts";
import type { CharacterState } from "../src/super/character.ts";

const standing: CharacterState = {
  x: 0,
  y: 0,
  z: 0,
  vx: 0,
  vy: 0,
  vz: 0,
  yaw: 0,
  grounded: true,
  runSpeed: 0,
  move: "idle",
};

function bounds(group: T.Object3D) {
  group.updateMatrixWorld(true);
  return new T.Box3().setFromObject(group);
}

function assertBackCovered(group: T.Group, context: string) {
  group.updateMatrixWorld(true);
  const coat = group.getObjectByName("flowing-mantle") as T.Mesh;
  const layers = ["continuous-robe-and-sleeves", "continuous-folded-robe"].map(
    (name) => group.getObjectByName(name) as T.Mesh,
  );
  for (const mesh of layers)
    if (mesh instanceof T.SkinnedMesh) mesh.skeleton.update();
  for (const y of [1.0, 1.1, 1.25, 1.4])
    for (const x of [-0.18, 0, 0.18]) {
      const origin = new T.Vector3(x, y, -3).applyMatrix4(coat.matrixWorld);
      const direction = new T.Vector3(0, 0, 1).transformDirection(
        coat.matrixWorld,
      );
      const ray = new T.Raycaster(origin, direction);
      const outer = ray.intersectObject(coat, false)[0];
      const inner = ray.intersectObjects(layers, false)[0];
      assert.ok(outer, `${context}: missing coat at ${x},${y}`);
      if (inner)
        assert.ok(
          outer.distance + 0.002 < inner.distance,
          `${context}: inner garment breaks through at ${x},${y}`,
        );
    }
}

test("all six coats cover the shirt and folded tunic across the back", () => {
  for (let variant = 0; variant < 6; variant++) {
    const actor = buildSculptedLehi(variant);
    assertBackCovered(actor.group, `variant ${variant + 7}`);
    actor.dispose();
  }
});

test("the playable coat covers its inner layers during turns and traversal", () => {
  const actor = createPlayableLehi();
  for (const move of [
    "idle",
    "run",
    "crawl",
    "backflip",
    "longJump",
    "climb",
    "ledgeHang",
  ] as const) {
    for (let frame = 0; frame < 20; frame++)
      actor.update(1 / 60, {
        ...standing,
        move,
        crouching: move === "crawl",
        yaw: frame * 0.13,
        x: frame * 0.06,
        vx: 4,
        vz: 3,
        runSpeed: 5,
      });
    assertBackCovered(actor.group, move);
  }
  actor.dispose();
});

test("chosen Lehi is a grounded 1.65m avatar with independently deforming sleeves", () => {
  const actor = createPlayableLehi();
  actor.update(1 / 60, standing);
  const rest = bounds(actor.group);
  assert.ok(Math.abs(rest.min.y) < 0.01);
  assert.ok(Math.abs(rest.max.y - 1.65) < 0.01);
  const shirt = actor.group.getObjectByName(
    "continuous-robe-and-sleeves",
  ) as T.SkinnedMesh;
  assert.ok(shirt.isSkinnedMesh);
  const position = shirt.geometry.getAttribute("position") as T.BufferAttribute;
  let sleeveIndex = -1;
  let chestIndex = -1;
  for (let i = 0; i < position.count; i++) {
    if (sleeveIndex < 0 && position.getX(i) < -0.54 && position.getY(i) < 1.12)
      sleeveIndex = i;
    if (
      chestIndex < 0 &&
      Math.abs(position.getX(i)) < 0.04 &&
      position.getY(i) > 1.2 &&
      position.getY(i) < 1.3
    )
      chestIndex = i;
  }
  assert.ok(sleeveIndex >= 0 && chestIndex >= 0);
  const pose = (i: number) => {
    actor.group.updateMatrixWorld(true);
    shirt.skeleton.update();
    return shirt.applyBoneTransform(
      i,
      new T.Vector3().fromBufferAttribute(position, i),
    );
  };
  const sleeveRest = pose(sleeveIndex);
  const chestRest = pose(chestIndex);
  actor.update(1 / 60, { ...standing, carrying: true });
  assert.ok(
    pose(sleeveIndex).distanceTo(sleeveRest) > 0.1,
    "carrying should bend the continuous sleeve",
  );
  assert.ok(
    pose(chestIndex).distanceTo(chestRest) < 0.025,
    "arm swing should not drag the middle of the chest",
  );
  actor.dispose();
  assert.equal(actor.group.children.length, 0);
});

test("playable Lehi responds to traversal poses and keeps crouch under a low ceiling", () => {
  const actor = createPlayableLehi();
  for (const move of [
    "run",
    "jump",
    "doubleJump",
    "tripleJump",
    "longJump",
    "backflip",
    "sideflip",
    "wallKick",
    "ledgeHang",
    "climb",
  ] as const) {
    actor.update(1 / 60, {
      ...standing,
      move,
      moveTime: 0.35,
      grounded: move === "run",
      runSpeed: move === "run" ? 5 : 0,
      vz: move === "run" ? 5 : 0,
    });
    const box = bounds(actor.group);
    assert.ok(Number.isFinite(box.min.y) && Number.isFinite(box.max.y), move);
    assert.ok(box.max.y - box.min.y > 0.4, `${move} collapsed`);
  }
  for (const move of ["crouch", "crawl"] as const) {
    actor.update(1 / 60, {
      ...standing,
      crouching: true,
      move,
      runSpeed: move === "crawl" ? 1.5 : 0,
    });
    const box = bounds(actor.group);
    assert.ok(box.max.y <= 0.9, `${move} reaches ${box.max.y}`);
    assert.ok(box.min.y >= -0.025, `${move} feet sink to ${box.min.y}`);
  }
  actor.dispose();
});

test("mantle collar remains fixed while the hem responds softly to movement", () => {
  const actor = createPlayableLehi();
  const mantle = actor.group.getObjectByName("flowing-mantle") as T.Mesh;
  const robe = actor.group.getObjectByName("continuous-folded-robe") as T.Mesh;
  const position = mantle.geometry.getAttribute(
    "position",
  ) as T.BufferAttribute;
  const robePosition = robe.geometry.getAttribute(
    "position",
  ) as T.BufferAttribute;
  let top = -1;
  let hem = -1;
  for (let i = 0; i < position.count; i++) {
    if (top < 0 && position.getY(i) > 1.48) top = i;
    if (hem < 0 && position.getY(i) < 0.88) hem = i;
  }
  assert.ok(top >= 0 && hem >= 0);
  let robeTop = -1;
  let robeHem = -1;
  for (let i = 0; i < robePosition.count; i++) {
    if (robeTop < 0 && robePosition.getY(i) > 1.14) robeTop = i;
    if (robeHem < 0 && robePosition.getY(i) < 0.54) robeHem = i;
  }
  assert.ok(robeTop >= 0 && robeHem >= 0);
  const robeTopZ = robePosition.getZ(robeTop);
  const robeHemZ = robePosition.getZ(robeHem);
  const topZ = position.getZ(top);
  const hemZ = position.getZ(hem);
  for (let i = 0; i < 30; i++)
    actor.update(1 / 60, {
      ...standing,
      z: (i * 5) / 60,
      vz: 5,
      runSpeed: 5,
      move: "run",
    });
  assert.ok(Math.abs(position.getZ(top) - topZ) < 0.003);
  assert.ok(position.getZ(hem) < hemZ - 0.015);
  assert.ok(Math.abs(robePosition.getZ(robeTop) - robeTopZ) < 0.003);
  assert.ok(
    Math.abs(robePosition.getZ(robeHem) - robeHemZ) > 0.005,
    "the tunic hem should respond to the stride",
  );
  actor.dispose();
});
