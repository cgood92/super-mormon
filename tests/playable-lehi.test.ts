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

test("mantle keeps its authored hem while walking and restores it after a crawl", () => {
  const actor = createPlayableLehi();
  const mantle = actor.group.getObjectByName("flowing-mantle") as T.Mesh;
  const position = mantle.geometry.getAttribute(
    "position",
  ) as T.BufferAttribute;
  let collar = -1;
  let hem = -1;
  for (let i = 0; i < position.count; i++) {
    if (
      collar < 0 &&
      position.getY(i) > 1.58 &&
      Math.abs(position.getX(i)) < 0.12
    )
      collar = i;
    if (hem < 0 && position.getY(i) < 0.3) hem = i;
  }
  assert.ok(collar >= 0 && hem >= 0);
  const collarRest = new T.Vector3().fromBufferAttribute(position, collar);
  const hemRest = new T.Vector3().fromBufferAttribute(position, hem);
  const current = (index: number) =>
    new T.Vector3().fromBufferAttribute(position, index);
  for (let i = 0; i < 30; i++)
    actor.update(1 / 60, {
      ...standing,
      z: (i * 5) / 60,
      vz: 5,
      runSpeed: 5,
      move: "run",
    });
  assert.ok(
    current(collar).distanceTo(collarRest) < 0.003,
    "collar stays anchored while running",
  );
  assert.ok(
    current(hem).distanceTo(hemRest) < 0.003,
    "walking does not accumulate hem distortion",
  );
  actor.update(1 / 60, {
    ...standing,
    crouching: true,
    runSpeed: 1.5,
    vz: 1.5,
    move: "crawl",
  });
  assert.ok(
    current(collar).distanceTo(collarRest) < 0.003,
    "collar stays anchored during crawl",
  );
  assert.ok(
    current(hem).distanceTo(hemRest) > 0.015,
    "hem gathers for crawl clearance",
  );
  actor.update(1 / 60, standing);
  assert.ok(
    current(collar).distanceTo(collarRest) < 0.003,
    "collar restores after crawl",
  );
  assert.ok(
    current(hem).distanceTo(hemRest) < 0.003,
    "authored hem restores after crawl",
  );
  actor.dispose();
});

test("crawl retains a curved rear hem instead of collapsing it into a flat band", () => {
  const actor = createPlayableLehi();
  const mantle = actor.group.getObjectByName("flowing-mantle") as T.Mesh;
  const positions = mantle.geometry.getAttribute(
    "position",
  ) as T.BufferAttribute;
  const rearHem: number[] = [];
  const hemEdge: number[] = [];
  const centerEdge: number[] = [];
  const sideEdge: number[] = [];
  for (let i = 0; i < positions.count; i++)
    if (positions.getY(i) < 0.45 && positions.getZ(i) < -0.08) {
      rearHem.push(i);
      if (positions.getY(i) < 0.18) {
        hemEdge.push(i);
        if (Math.abs(positions.getX(i)) < 0.05) centerEdge.push(i);
        if (Math.abs(positions.getX(i)) > 0.25) sideEdge.push(i);
      }
    }
  assert.ok(rearHem.length > 100);
  assert.ok(hemEdge.length > 100);
  assert.ok(centerEdge.length > 10 && sideEdge.length > 10);
  actor.update(1 / 60, {
    ...standing,
    crouching: true,
    runSpeed: 1.5,
    vz: 1.5,
    move: "crawl",
  });
  const ys = rearHem.map((i) => positions.getY(i));
  const zs = hemEdge.map((i) => positions.getZ(i));
  assert.ok(
    Math.max(...ys) - Math.min(...ys) > 0.15,
    "rear hem must retain depth and curvature around the hips",
  );
  assert.ok(
    Math.max(...zs) - Math.min(...zs) > 0.08,
    "rear coat shell must keep volume instead of collapsing into a plane",
  );
  const centerHeight =
    centerEdge.reduce((sum, i) => sum + positions.getZ(i), 0) /
    centerEdge.length;
  const sideHeight =
    sideEdge.reduce((sum, i) => sum + positions.getZ(i), 0) / sideEdge.length;
  assert.ok(
    sideHeight - centerHeight > 0.08,
    "rear hem must arch over the spine instead of ending in a straight cutoff",
  );
  actor.dispose();
});

test("equipment sockets follow palms and keep a back load below the head", async () => {
  const { createSculptedCharacterRig } =
    await import("../src/super/playable-lehi.ts");
  const actor = createSculptedCharacterRig("nephi", { quality: "hero" });
  const { leftHand, rightHand, back } = actor.sockets;
  for (const state of [
    standing,
    {
      ...standing,
      x: 1,
      z: 2,
      yaw: Math.PI / 2,
      holdingBow: true,
      runSpeed: 4,
      vz: 4,
      move: "run" as const,
    },
    {
      ...standing,
      x: 2,
      z: 3,
      yaw: Math.PI,
      holdingBow: true,
      aiming: true,
      draw: 1,
    },
  ]) {
    actor.update(1 / 60, state);
    actor.group.updateMatrixWorld(true);
    for (const [socket, meshName] of [
      [leftHand, "left-hand"],
      [rightHand, "right-hand"],
    ] as const) {
      const palm = new T.Box3()
        .setFromObject(actor.group.getObjectByName(meshName)!)
        .getCenter(new T.Vector3());
      assert.ok(
        socket.getWorldPosition(new T.Vector3()).distanceTo(palm) < 0.09,
        `${meshName} socket must stay at the grip`,
      );
    }
    const backPosition = back.getWorldPosition(new T.Vector3());
    const head = actor.group
      .getObjectByName("head")!
      .getWorldPosition(new T.Vector3());
    assert.ok(backPosition.y < head.y - 0.15, "back load stays below the head");
  }
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

test("playable crawl keeps its face and grounded supports in the travel direction", async () => {
  const { createSculptedCharacterRig } =
    await import("../src/super/playable-lehi.ts");
  const vertex = new T.Vector3();
  const posedBounds = (root: T.Object3D) => {
    const box = new T.Box3();
    root.updateMatrixWorld(true);
    root.traverse((object) => {
      if (!(object instanceof T.Mesh)) return;
      if (object instanceof T.SkinnedMesh) object.skeleton.update();
      const positions = object.geometry.getAttribute("position");
      for (let i = 0; i < positions.count; i++) {
        object.getVertexPosition(i, vertex).applyMatrix4(object.matrixWorld);
        box.expandByPoint(vertex);
      }
    });
    return box;
  };
  for (const role of ["nephi", "lehi", "child", "guard"] as const) {
    for (const yaw of [
      0,
      Math.PI / 4,
      Math.PI / 2,
      Math.PI,
      (3 * Math.PI) / 2,
    ]) {
      const actor = createSculptedCharacterRig(role, { quality: "crowd" });
      const travel = new T.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
      actor.update(1 / 60, standing);
      for (let frame = 0; frame < 48; frame++)
        actor.update(1 / 60, {
          ...standing,
          x: frame * 0.025 * travel.x,
          z: frame * 0.025 * travel.z,
          vx: 1.5 * travel.x,
          vz: 1.5 * travel.z,
          yaw,
          runSpeed: 1.5,
          crouching: true,
          move: "crawl",
        });
      actor.group.updateMatrixWorld(true);
      const head = actor.group.getObjectByName("head")!;
      const body = actor.group.getObjectByName("body")!;
      const face = new T.Vector3(0, 0, 1)
        .transformDirection(head.matrixWorld)
        .setY(0)
        .normalize();
      assert.ok(
        face.dot(travel) > 0.95,
        `${role} yaw ${yaw}: face follows travel`,
      );
      const headAhead = head
        .getWorldPosition(new T.Vector3())
        .sub(body.getWorldPosition(new T.Vector3()))
        .setY(0);
      assert.ok(
        headAhead.dot(travel) > 0.6,
        `${role} yaw ${yaw}: head ahead of hips`,
      );
      const bounds = posedBounds(actor.group);
      assert.ok(
        bounds.max.y < 0.9,
        `${role} yaw ${yaw}: low enough for arch (${bounds.max.y})`,
      );
      assert.ok(
        bounds.min.y >= -0.025,
        `${role} yaw ${yaw}: no floor penetration (${bounds.min.y})`,
      );
      for (const side of ["left", "right"]) {
        const hand = posedBounds(actor.group.getObjectByName(`${side}-hand`)!);
        assert.ok(
          hand.min.y >= -0.02 && hand.min.y < 0.065,
          `${role} yaw ${yaw}: ${side} hand grounded at ${hand.min.y}`,
        );
        const kneeY = actor.group
          .getObjectByName(`${side}-knee`)!
          .getWorldPosition(new T.Vector3()).y;
        assert.ok(
          kneeY > 0.05 && kneeY < 0.18,
          `${role} yaw ${yaw}: ${side} knee supports body at ${kneeY}`,
        );
      }
      actor.update(1 / 60, { ...standing, yaw });
      assert.ok(
        posedBounds(actor.group).max.y > (role === "child" ? 1 : 1.5),
        `${role} yaw ${yaw}: upright pose returns after crawl`,
      );
      actor.dispose();
    }
  }
});

test("crawl can resume after an upright stop without losing its heading", async () => {
  const { createSculptedCharacterRig } =
    await import("../src/super/playable-lehi.ts");
  const actor = createSculptedCharacterRig("nephi", { quality: "hero" });
  const yaw = Math.PI / 2;
  const crawl: CharacterState = {
    ...standing,
    yaw,
    vx: 1.5,
    runSpeed: 1.5,
    crouching: true,
    move: "crawl",
  };
  for (const move of ["idle", "crawl", "idle", "crawl", "idle"] as const) {
    actor.update(1 / 60, move === "crawl" ? crawl : { ...standing, yaw });
    actor.group.updateMatrixWorld(true);
    const body = actor.group.getObjectByName("body")!;
    const head = actor.group.getObjectByName("head")!;
    const face = new T.Vector3(0, 0, 1)
      .transformDirection(head.matrixWorld)
      .setY(0)
      .normalize();
    assert.ok(face.x > 0.95, `${move}: face remains oriented with heading`);
    const headY = head.getWorldPosition(new T.Vector3()).y;
    assert.ok(
      move === "crawl" ? headY < 0.6 : headY > 1.2,
      `${move}: head returns to the expected height (${headY})`,
    );
    assert.ok(Number.isFinite(body.matrixWorld.determinant()));
  }
  actor.dispose();
});

test("NPC crawl gaze remains a world direction while the body turns", async () => {
  const { createSculptedCharacterRig } =
    await import("../src/super/playable-lehi.ts");
  const actor = createSculptedCharacterRig("guard", { quality: "npc" });
  try {
    for (const yaw of [0, Math.PI / 4, Math.PI / 2, Math.PI]) {
      const lookYaw = -0.8;
      const lookPitch = 0.12;
      actor.update(1 / 60, {
        ...standing,
        yaw,
        lookYaw,
        lookPitch,
        runSpeed: 1.5,
        crouching: true,
        move: "crawl",
      });
      actor.group.updateMatrixWorld(true);
      const face = new T.Vector3(0, 0, 1).transformDirection(
        actor.group.getObjectByName("head")!.matrixWorld,
      );
      const expected = new T.Vector3(
        Math.sin(lookYaw) * Math.cos(lookPitch),
        Math.sin(lookPitch),
        Math.cos(lookYaw) * Math.cos(lookPitch),
      );
      assert.ok(
        face.angleTo(expected) < 1e-5,
        `body yaw ${yaw}: world gaze error ${face.angleTo(expected)}`,
      );
    }
  } finally {
    actor.dispose();
  }
});
