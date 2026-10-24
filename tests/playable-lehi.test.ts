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
  const layers = ["continuous-robe-and-sleeves", "continuous-folded-robe"]
    .map((name) => group.getObjectByName(name) as T.Mesh)
    .filter(Boolean);
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
    if (
      sleeveIndex < 0 &&
      position.getX(i) < -0.54 &&
      position.getY(i) > 1.08 &&
      position.getY(i) < 1.2
    )
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
  const robe = actor.group.getObjectByName(
    "continuous-robe-and-sleeves",
  ) as T.Mesh;
  const position = mantle.geometry.getAttribute(
    "position",
  ) as T.BufferAttribute;
  const robePosition = robe.geometry.getAttribute(
    "position",
  ) as T.BufferAttribute;
  let top = -1;
  let hem = -1;
  for (let i = 0; i < position.count; i++) {
    if (top < 0 && position.getY(i) > 1.58 && Math.abs(position.getX(i)) < 0.12)
      top = i;
    if (hem < 0 && position.getY(i) < 0.3) hem = i;
  }
  assert.ok(top >= 0 && hem >= 0);
  let robeTop = -1;
  let robeHem = -1;
  for (let i = 0; i < robePosition.count; i++) {
    if (
      robeTop < 0 &&
      robePosition.getY(i) > 1.4 &&
      Math.abs(robePosition.getX(i)) < 0.12
    )
      robeTop = i;
    if (robeHem < 0 && robePosition.getY(i) < 0.3) robeHem = i;
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

test("coat sleeves share the tunic skeleton instead of floating over swinging arms", () => {
  const actor = createPlayableLehi();
  const shirt = actor.group.getObjectByName(
    "continuous-robe-and-sleeves",
  ) as T.SkinnedMesh;
  const coat = actor.group.getObjectByName("flowing-mantle") as T.SkinnedMesh;
  assert.ok(coat.isSkinnedMesh);
  assert.equal(coat.skeleton, shirt.skeleton);
  assert.equal(
    actor.group.getObjectByName("continuous-folded-robe"),
    undefined,
    "no intersecting second tunic layer",
  );
  actor.update(1 / 60, standing);
  actor.group.updateMatrixWorld(true);
  coat.skeleton.update();
  const positions = coat.geometry.getAttribute("position") as T.BufferAttribute;
  let sleeve = -1;
  for (let i = 0; i < positions.count; i++)
    if (
      positions.getX(i) < -0.5 &&
      positions.getY(i) > 1.02 &&
      positions.getY(i) < 1.15
    ) {
      sleeve = i;
      break;
    }
  assert.ok(sleeve >= 0);
  const before = coat.getVertexPosition(sleeve, new T.Vector3());
  for (let i = 0; i < 8; i++)
    actor.update(1 / 60, {
      ...standing,
      z: i * 0.065,
      vz: 4,
      runSpeed: 4,
      move: "run",
    });
  actor.group.updateMatrixWorld(true);
  coat.skeleton.update();
  const after = coat.getVertexPosition(sleeve, new T.Vector3());
  assert.ok(after.distanceTo(before) > 0.02, "coat sleeve must visibly swing");
  actor.dispose();
});

test("every playable rig crawls on alternating hands and bent knees below the low arch", async () => {
  const { createSculptedCharacterRig } =
    await import("../src/super/playable-lehi.ts");
  const point = new T.Vector3();
  // Read posed vertices, including skinning; cached mesh boxes can hide a hand
  // or a garment crossing the floor after the skeleton changes.
  const posedBounds = (object: T.Object3D) => {
    const box = new T.Box3();
    object.traverse((node) => {
      if (!(node instanceof T.Mesh)) return;
      if (node instanceof T.SkinnedMesh) node.skeleton.update();
      for (let i = 0; i < node.geometry.getAttribute("position").count; i++) {
        node.getVertexPosition(i, point).applyMatrix4(node.matrixWorld);
        assert.ok(Number.isFinite(point.x + point.y + point.z));
        box.expandByPoint(point);
      }
    });
    return box;
  };
  for (const role of [
    "nephi",
    "lehi",
    "laman",
    "child",
    "jacob",
    "convert",
    "ammon",
  ] as const) {
    const actor = createSculptedCharacterRig(role, { quality: "crowd" });
    const hands = ["left-hand", "right-hand"].map((name) =>
      actor.group.getObjectByName(name)!,
    );
    const knees = ["left-knee", "right-knee"].map((name) =>
      actor.group.getObjectByName(name)!,
    );
    const handZ: number[][] = [[], []];
    for (let frame = 0; frame < 48; frame++) {
      actor.update(1 / 60, {
        ...standing,
        z: frame * 0.025,
        vz: 1.5,
        runSpeed: 1.5,
        move: "crawl",
        crouching: true,
      });
      const box = posedBounds(actor.group);
      assert.ok(
        box.max.y <= 0.9,
        `${role}: head or garment crosses arch (${box.max.y})`,
      );
      assert.ok(
        box.min.y >= -0.025,
        `${role}: pose crosses floor (${box.min.y})`,
      );
      for (const name of [
        "left-trouser",
        "right-trouser",
        "left-sandal",
        "right-sandal",
      ]) {
        const mesh = actor.group.getObjectByName(name);
        if (mesh)
          assert.ok(
            posedBounds(mesh).max.y < (role === "child" ? 0.33 : 0.46),
            `${role}: ${name} must stay below the hips, not point upward through the coat`,
          );
      }
      const body = actor.group.getObjectByName("body")!;
      assert.ok(
        Math.abs(body.rotation.x - Math.PI / 2) < 0.01,
        `${role}: spine must be horizontal`,
      );
      assert.ok(
        Math.abs(body.scale.y - body.scale.x) < 0.01,
        `${role}: no flattened upright body`,
      );
      for (let side = 0; side < 2; side++) {
        const hand = posedBounds(hands[side]);
        assert.ok(
          hand.min.y >= -0.02 && hand.min.y < 0.065,
          `${role}: palm must reach ground`,
        );
        handZ[side].push(hand.getCenter(new T.Vector3()).z - frame * 0.025);
        const knee = knees[side].getWorldPosition(new T.Vector3());
        assert.ok(
          knee.y > 0.05 && knee.y < 0.18,
          `${role}: knee must support the body`,
        );
        assert.ok(Math.abs(knees[side].rotation.x - Math.PI / 2) < 0.01);
      }
      const faceForward = new T.Vector3(0, 0, 1).transformDirection(
        actor.group.getObjectByName("head")!.matrixWorld,
      );
      assert.ok(faceForward.z > 0.99, `${role}: look ahead while crawling`);
    }
    for (const positions of handZ)
      assert.ok(
        Math.max(...positions) - Math.min(...positions) > 0.04,
        `${role}: hands must step`,
      );
    assert.ok(
      (handZ[0][12] - handZ[0][0]) * (handZ[1][12] - handZ[1][0]) < 0,
      `${role}: diagonal gait must alternate`,
    );
    actor.update(1 / 60, standing);
    const restored = posedBounds(actor.group);
    assert.ok(restored.max.y > (role === "child" ? 1.0 : 1.5));
    actor.dispose();
  }
});
