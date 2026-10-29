import assert from "node:assert/strict";
import test from "node:test";
import {
  createPlayer,
  stepPlayer,
  type MoveInput,
} from "../physics/physics.ts";
import {
  createCharacter,
  type CharacterState,
  type CharacterRole,
} from "./character.ts";
import * as T from "three";

const idle: MoveInput = { x: 0, y: 0, jump: false, jumpHeld: false };
function advance(input: MoveInput, count: number, dt = 1 / 60) {
  const p = createPlayer();
  for (let i = 0; i < count; i++) stepPlayer(p, input, dt, 0, []);
  return p;
}

test("run release coasts briefly and settles before half a second", () => {
  const p = advance({ ...idle, y: 1 }, 30);
  const startingZ = p.z;
  const initialSpeed = p.runSpeed;
  stepPlayer(p, idle, 1 / 60, 0, []);
  assert.ok(p.z > startingZ + 0.03);
  assert.ok(p.runSpeed > initialSpeed * 0.85, `speed dropped to ${p.runSpeed}`);
  for (let i = 0; i < 29; i++) stepPlayer(p, idle, 1 / 60, 0, []);
  assert.ok(p.runSpeed < 0.1);
});

test("a quick reversal keeps forward momentum briefly before turning around", () => {
  const p = advance({ ...idle, y: 1 }, 30);
  const start = p.z;
  for (let i = 0; i < 4; i++) stepPlayer(p, { ...idle, y: -1 }, 1 / 60, 0, []);
  assert.ok(p.z > start, `reversal snapped backward to ${p.z}`);
  for (let i = 0; i < 25; i++) stepPlayer(p, { ...idle, y: -1 }, 1 / 60, 0, []);
  assert.ok(p.vz < -3, `reversal stayed forward at ${p.vz}`);
});

test("movement is stable across 30 and 60 fps stepping", () => {
  const sixty = advance({ ...idle, y: 1, x: -0.5 }, 60, 1 / 60);
  const thirty = advance({ ...idle, y: 1, x: -0.5 }, 30, 1 / 30);
  assert.ok(Math.hypot(sixty.x - thirty.x, sixty.z - thirty.z) < 0.12);
  assert.ok(Math.hypot(sixty.vx - thirty.vx, sixty.vz - thirty.vz) < 0.12);
});

test("diagonal braking has the same bounded deceleration as straight braking", () => {
  const p = advance({ ...idle, x: -1, y: 1 }, 30);
  const speedBefore = Math.hypot(p.vx, p.vz);
  stepPlayer(p, idle, 1 / 60, 0, []);
  const brakingRate = (speedBefore - Math.hypot(p.vx, p.vz)) * 60;
  assert.ok(brakingRate <= 26.5, `diagonal braking rate was ${brakingRate}`);
  assert.ok(brakingRate > 15);
});

const castRoles: CharacterRole[] = [
  "nephi",
  "nephi-disguised",
  "sam",
  "samuel",
  "lehi",
  "laman",
  "lemuel",
  "guard",
  "laban",
  "laban-undressed",
  "sariah",
  "zoram",
  "child",
];

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
};

test("running starts with a blended stride and leans into a turn", () => {
  const actor = createCharacter("nephi");
  actor.update(1 / 60, standing);
  const body = actor.group.children[0];
  const leg = actor.group.getObjectByName("left-leg")!;
  actor.update(1 / 60, { ...standing, vz: 6.5, runSpeed: 6.5, move: "run" });
  assert.ok(
    Math.abs(leg.rotation.x) < 0.1,
    `first stride snapped to ${leg.rotation.x}`,
  );
  for (let i = 0; i < 25; i++)
    actor.update(1 / 60, { ...standing, vz: 6.5, runSpeed: 6.5, move: "run" });
  assert.ok(
    body.rotation.x > 0.025,
    `run did not lean forward: ${body.rotation.x}`,
  );
  for (let i = 0; i < 6; i++)
    actor.update(1 / 60, {
      ...standing,
      vx: 6.5,
      yaw: Math.PI / 2,
      runSpeed: 6.5,
      move: "run",
    });
  assert.ok(body.rotation.z < -0.025, `turn did not bank: ${body.rotation.z}`);
  actor.dispose();
});

test("banking follows sideways motion relative to the character's facing", () => {
  const actor = createCharacter("sam");
  actor.update(1 / 60, { ...standing, yaw: Math.PI / 2 });
  const body = actor.group.children[0];
  for (let i = 0; i < 20; i++)
    actor.update(1 / 60, {
      ...standing,
      yaw: Math.PI / 2,
      vz: 6.5,
      runSpeed: 6.5,
      move: "run",
    });
  assert.ok(body.rotation.z > 0.06, `sideways bank was ${body.rotation.z}`);
  actor.dispose();
});

test("stride settles over several frames and a harder landing squashes further", () => {
  const actor = createCharacter("nephi");
  const leg = actor.group.getObjectByName("left-leg")!;
  for (let i = 0; i < 30; i++)
    actor.update(1 / 60, {
      ...standing,
      z: ((i + 1) * 6.5) / 60,
      vz: 6.5,
      runSpeed: 6.5,
      move: "run",
    });
  actor.update(1 / 60, { ...standing, z: 3.25 });
  assert.ok(
    Math.abs(leg.rotation.x) > 0.02,
    `stride froze at ${leg.rotation.x}`,
  );
  actor.dispose();

  const soft = createCharacter("sam");
  const hard = createCharacter("sam");
  soft.update(1 / 60, { ...standing, grounded: false, vy: -1, move: "jump" });
  hard.update(1 / 60, { ...standing, grounded: false, vy: -9, move: "jump" });
  soft.update(1 / 60, standing);
  hard.update(1 / 60, standing);
  soft.group.updateMatrixWorld(true);
  hard.group.updateMatrixWorld(true);
  const softHeight = new T.Box3().setFromObject(soft.group).max.y;
  const hardHeight = new T.Box3().setFromObject(hard.group).max.y;
  assert.ok(
    hardHeight < softHeight - 0.035,
    `landings differed by ${softHeight - hardHeight}`,
  );
  soft.dispose();
  hard.dispose();
});

test("steps follow traveled distance and articulate the lower leg", () => {
  const fast = createCharacter("nephi");
  const slow = createCharacter("nephi");
  const fastLeg = fast.group.getObjectByName("left-leg")!;
  const slowLeg = slow.group.getObjectByName("left-leg")!;
  const knee = fast.group.getObjectByName("left-knee")!;
  const foot = fast.group.getObjectByName("left-foot")!;
  assert.ok(knee && foot, "a walking leg needs separate knee and foot joints");
  let maxKneeFlex = 0;
  let maxLegDifference = 0;
  for (let i = 0; i < 18; i++) {
    fast.update(1 / 60, {
      ...standing,
      z: ((i + 1) * 4) / 60,
      vz: 4,
      runSpeed: 4,
      move: "run",
    });
    slow.update(1 / 60, {
      ...standing,
      z: ((i + 1) * 2) / 60,
      vz: 4,
      runSpeed: 4,
      move: "run",
    });
    maxKneeFlex = Math.max(maxKneeFlex, knee.rotation.x);
    maxLegDifference = Math.max(
      maxLegDifference,
      Math.abs(fastLeg.rotation.x - slowLeg.rotation.x),
    );
  }
  assert.ok(
    maxLegDifference > 0.15,
    "the same speed label should not produce the same gait after different travel",
  );
  assert.ok(maxKneeFlex > 0.08, "swinging knee should visibly flex");
  assert.ok(
    Math.abs(foot.rotation.x) > 0.02 &&
      Math.abs(fastLeg.rotation.x + knee.rotation.x + foot.rotation.x) <
        Math.abs(fastLeg.rotation.x + knee.rotation.x),
    "the foot should counter-rotate toward level",
  );
  fast.dispose();
  slow.dispose();
});

test("footstep phase and knee pose agree at 30 and 60 fps", () => {
  const sixty = createCharacter("sam");
  const thirty = createCharacter("sam");
  for (let i = 0; i < 60; i++)
    sixty.update(1 / 60, {
      ...standing,
      z: ((i + 1) * 4.2) / 60,
      vz: 4.2,
      runSpeed: 4.2,
      move: "run",
    });
  for (let i = 0; i < 30; i++)
    thirty.update(1 / 30, {
      ...standing,
      z: ((i + 1) * 4.2) / 30,
      vz: 4.2,
      runSpeed: 4.2,
      move: "run",
    });
  for (const name of ["left-leg", "left-knee", "left-foot"]) {
    const a = sixty.group.getObjectByName(name)!;
    const b = thirty.group.getObjectByName(name)!;
    assert.ok(
      Math.abs(a.rotation.x - b.rotation.x) < 0.07,
      `${name} differs across frame rates`,
    );
  }
  sixty.dispose();
  thirty.dispose();
});

test("braking shifts weight behind the run pose while the feet finish a step", () => {
  const actor = createCharacter("nephi");
  const leg = actor.group.getObjectByName("left-leg")!;
  let z = 0;
  for (let i = 0; i < 35; i++) {
    z += 6 / 60;
    actor.update(1 / 60, { ...standing, z, vz: 6, runSpeed: 6, move: "run" });
  }
  const runningLean = actor.group.getObjectByName("body")!.rotation.x;
  let activeFootstep = false;
  for (let i = 0; i < 9; i++) {
    const speed = Math.max(0, 6 - ((i + 1) * 26) / 60);
    z += speed / 60;
    actor.update(1 / 60, {
      ...standing,
      z,
      vz: speed,
      runSpeed: speed,
      move: speed > 0.25 ? "run" : "idle",
    });
    activeFootstep ||= Math.abs(leg.rotation.x) > 0.04;
  }
  assert.ok(
    actor.group.getObjectByName("body")!.rotation.x < runningLean - 0.025,
    "braking should visibly shift the body back",
  );
  assert.ok(activeFootstep, "feet should keep stepping through the coast");
  actor.dispose();
});

test("running sandals stay above the ground through a full stride", () => {
  const actor = createCharacter("nephi");
  let lowest = Infinity;
  for (let i = 0; i < 120; i++) {
    actor.update(1 / 60, {
      ...standing,
      z: ((i + 1) * 6) / 60,
      vz: 6,
      runSpeed: 6,
      move: "run",
    });
    actor.group.updateMatrixWorld(true);
    for (const name of ["left-sandal", "right-sandal"]) {
      const foot = actor.group.getObjectByName(name)!;
      lowest = Math.min(lowest, new T.Box3().setFromObject(foot).min.y);
    }
  }
  assert.ok(lowest >= -0.03, `feet sank ${-lowest}m beneath the ground`);
  actor.dispose();
});

test("a slow walk plants each sandal instead of sliding it with the body", () => {
  const actor = createCharacter("nephi");
  const sole = actor.group.getObjectByName("left-sandal")!;
  const knee = actor.group.getObjectByName("left-knee")!;
  let previous: { z: number; planted: boolean } | null = null;
  let contacts = 0;
  let totalFootTravel = 0;
  const worldPosition = new T.Vector3();
  for (let i = 0; i < 180; i++) {
    actor.update(1 / 60, {
      ...standing,
      z: ((i + 1) * 2) / 60,
      vz: 2,
      runSpeed: 2,
      move: "run",
    });
    actor.group.updateMatrixWorld(true);
    const soleBounds = new T.Box3().setFromObject(sole);
    soleBounds.getCenter(worldPosition);
    const height = soleBounds.min.y;
    const planted = height < 0.035 && knee.rotation.x < 0.04;
    if (i > 60 && previous?.planted && planted) {
      contacts++;
      totalFootTravel += Math.abs(worldPosition.z - previous.z);
    }
    previous = { z: worldPosition.z, planted };
  }
  assert.ok(contacts > 20, `too few planted frames: ${contacts}`);
  const plantedFootSpeed = (totalFootTravel / contacts) * 60;
  assert.ok(
    plantedFootSpeed < 0.7,
    `planted sandal slid at ${plantedFootSpeed.toFixed(2)} m/s during a 2 m/s walk`,
  );
  actor.dispose();
});

test("braking leaves the final contact foot planted after the body stops", () => {
  const actor = createCharacter("nephi");
  const sole = actor.group.getObjectByName("left-sandal")!;
  const worldPosition = new T.Vector3();
  const contactPositions: number[] = [];
  let z = 0;
  for (let i = 0; i < 110; i++) {
    const speed = i < 90 ? 2 : Math.max(0, 2 - ((i - 89) * 26) / 60);
    z += speed / 60;
    actor.update(1 / 60, {
      ...standing,
      z,
      vz: speed,
      runSpeed: speed,
      move: speed > 0.25 ? "run" : "idle",
    });
    if (i < 92) continue;
    actor.group.updateMatrixWorld(true);
    const soleBounds = new T.Box3().setFromObject(sole);
    soleBounds.getCenter(worldPosition);
    if (soleBounds.min.y < 0.035) contactPositions.push(worldPosition.z);
  }
  assert.ok(contactPositions.length > 12, "final foot lost ground contact");
  assert.ok(
    Math.max(...contactPositions) - Math.min(...contactPositions) < 0.04,
    "final planted foot slid after braking",
  );
  actor.dispose();
});

test("the whole cast uses continuous smooth garments and sculpted faces", () => {
  for (const role of castRoles) {
    const actor = createCharacter(role);
    for (const name of [
      "continuous-robe-and-sleeves",
      "sculpted-face-neck-nose",
    ]) {
      const mesh = actor.group.getObjectByName(name) as T.Mesh;
      assert.ok(mesh instanceof T.Mesh, `${role} lacks ${name}`);
      assert.ok(
        !(mesh.geometry instanceof T.BoxGeometry),
        `${role} ${name} is a cuboid`,
      );
      assert.ok(
        mesh.geometry.getAttribute("position").count > 200,
        `${role} ${name} lacks a sculpted surface`,
      );
      assert.ok(
        mesh.geometry.getAttribute("normal"),
        `${role} ${name} lacks smooth lighting normals`,
      );
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      assert.ok(
        materials.every(
          (material) => !(material as T.MeshStandardMaterial).flatShading,
        ),
        `${role} ${name} has flat shading`,
      );
    }
    const shirt = actor.group.getObjectByName(
      "continuous-robe-and-sleeves",
    ) as T.SkinnedMesh;
    assert.ok(shirt.isSkinnedMesh, `${role} needs bending sleeves`);
    const mantle = actor.group.getObjectByName("flowing-mantle") as
      T.SkinnedMesh | undefined;
    if (mantle) {
      assert.ok(mantle.isSkinnedMesh, `${role} mantle must follow the sleeves`);
      assert.equal(
        mantle.skeleton,
        shirt.skeleton,
        `${role} garments need one arm skeleton`,
      );
    }
    actor.update(1 / 60, standing);
    actor.group.updateMatrixWorld(true);
    const restBounds = new T.Box3().setFromObject(actor.group);
    assert.ok(Math.abs(restBounds.min.y) < 0.02, `${role} is not grounded`);
    const expectedHeight = role === "child" ? 1.15 : 1.65;
    assert.ok(
      Math.abs(restBounds.max.y - expectedHeight) < 0.015,
      `${role} reaches ${restBounds.max.y}m rather than ${expectedHeight}m`,
    );

    // Sample the garment's own skin deformation: moving only an empty arm
    // joint would satisfy the pose tests without producing a visible gesture.
    const weights = shirt.geometry.getAttribute("skinWeight");
    const indices = shirt.geometry.getAttribute("skinIndex");
    const points = shirt.geometry.getAttribute("position");
    let sleeve = -1;
    let chest = -1;
    for (let i = 0; i < points.count; i++) {
      if (sleeve < 0 && weights.getY(i) > 0.75 && indices.getY(i) === 1)
        sleeve = i;
      if (
        chest < 0 &&
        weights.getX(i) > 0.999 &&
        Math.abs(points.getX(i)) < 0.04 &&
        points.getY(i) > 1.1
      )
        chest = i;
    }
    assert.ok(
      sleeve >= 0 && chest >= 0,
      `${role} needs separate sleeve and torso influences`,
    );
    shirt.skeleton.update();
    const sleeveRest = shirt.getVertexPosition(sleeve, new T.Vector3());
    const chestRest = shirt.getVertexPosition(chest, new T.Vector3());
    actor.update(1 / 60, { ...standing, carrying: true });
    actor.group.updateMatrixWorld(true);
    shirt.skeleton.update();
    assert.ok(
      shirt.getVertexPosition(sleeve, new T.Vector3()).distanceTo(sleeveRest) >
        0.08,
      `${role} carrying does not bend the visible sleeve`,
    );
    assert.ok(
      shirt.getVertexPosition(chest, new T.Vector3()).distanceTo(chestRest) <
        0.025,
      `${role} arm gesture drags the central chest`,
    );
    let broadBlocks = 0;
    actor.group.traverse((object) => {
      if (
        !(object instanceof T.Mesh) ||
        !(object.geometry instanceof T.BoxGeometry)
      )
        return;
      let ancestor: T.Object3D | null = object;
      while (ancestor) {
        if (!ancestor.visible) return;
        ancestor = ancestor.parent;
      }
      const { width, height, depth } = object.geometry.parameters;
      if (
        Math.max(width, height, depth) > 0.3 &&
        width * height * depth > 0.005
      )
        broadBlocks++;
    });
    assert.equal(
      broadBlocks,
      0,
      `${role} has ${broadBlocks} broad rectangular pieces`,
    );
    actor.dispose();
  }
});

test("eyes, irises and brows stay embedded in sculpted facial surfaces", () => {
  for (const role of castRoles) {
    const actor = createCharacter(role);
    actor.group.updateMatrixWorld(true);
    const face = actor.group.getObjectByName(
      "sculpted-face-neck-nose",
    ) as T.Mesh;
    assert.ok(face, `${role} needs a sculpted face`);
    const assertAttached = (
      feature: T.Mesh,
      surface: T.Mesh,
      label: string,
    ) => {
      const featureBounds = new T.Box3().setFromObject(feature);
      const center = featureBounds.getCenter(new T.Vector3());
      const origin = new T.Vector3(center.x, center.y, featureBounds.max.z + 1);
      const hit = new T.Raycaster(
        origin,
        new T.Vector3(0, 0, -1),
      ).intersectObject(surface, false)[0];
      assert.ok(hit, `${role} ${label} has no facial surface behind it`);
      assert.ok(
        featureBounds.min.z <= hit.point.z + 0.002,
        `${role} ${label} floats ${featureBounds.min.z - hit.point.z}m off its surface`,
      );
    };
    for (const side of ["left", "right"]) {
      const eye = actor.group.getObjectByName(`${side}-eye`) as T.Mesh;
      const iris = actor.group.getObjectByName(`${side}-iris`) as T.Mesh;
      const brow = actor.group.getObjectByName(`${side}-brow`) as T.Mesh;
      assert.ok(
        eye && iris && brow,
        `${role} needs both attached eyes and brows`,
      );
      assertAttached(eye, face, `${side} eye`);
      assertAttached(brow, face, `${side} brow`);
      assertAttached(iris, eye, `${side} iris`);
    }
    actor.dispose();
  }
});

test("side and diagonal strides keep the shared cast gait compact and cloth close", () => {
  for (const role of ["nephi", "lehi", "lemuel"] as const) {
    const actor = createCharacter(role);
    const robe = actor.group.getObjectByName(
      "continuous-robe-and-sleeves",
    ) as T.Mesh;
    const position = robe.geometry.getAttribute(
      "position",
    ) as T.BufferAttribute;
    const rest = Float32Array.from(position.array);
    for (const yaw of [Math.PI / 2, Math.PI / 4]) {
      for (let frame = 0; frame < 90; frame++) {
        actor.update(1 / 60, {
          ...standing,
          x: (frame + 1) * 0.1 * Math.sin(yaw),
          z: (frame + 1) * 0.1 * Math.cos(yaw),
          vx: 6 * Math.sin(yaw),
          vz: 6 * Math.cos(yaw),
          yaw,
          runSpeed: 6,
          move: "run",
        });
        for (const name of ["left-leg", "right-leg"]) {
          assert.ok(
            Math.abs(actor.group.getObjectByName(name)!.rotation.x) < 0.44,
            role + " stance anchoring must respect the small-step gait",
          );
        }
        for (let i = 0; i < position.count; i++) {
          assert.ok(
            Math.abs(position.getZ(i) - rest[i * 3 + 2]) < 0.23,
            role + " robe must not balloon into a giant forward step",
          );
        }
      }
    }
    actor.dispose();
  }
});
