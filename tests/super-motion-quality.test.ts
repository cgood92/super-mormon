import assert from "node:assert/strict";
import test from "node:test";
import {
  createPlayer,
  stepPlayer,
  type MoveInput,
} from "../src/super/physics.ts";
import {
  createCharacter,
  type CharacterState,
} from "../src/super/character.ts";
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
    for (const name of ["left-foot", "right-foot"]) {
      const foot = actor.group.getObjectByName(name)!;
      lowest = Math.min(lowest, new T.Box3().setFromObject(foot).min.y);
    }
  }
  assert.ok(lowest >= -0.03, `feet sank ${-lowest}m beneath the ground`);
  actor.dispose();
});

test("a slow walk plants each sandal instead of sliding it with the body", () => {
  const actor = createCharacter("nephi");
  const sole = actor.group.getObjectByName("left-foot")!;
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
    sole.getWorldPosition(worldPosition);
    const height = new T.Box3().setFromObject(sole).min.y;
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
  const sole = actor.group.getObjectByName("left-foot")!;
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
    sole.getWorldPosition(worldPosition);
    if (new T.Box3().setFromObject(sole).min.y < 0.035)
      contactPositions.push(worldPosition.z);
  }
  assert.ok(contactPositions.length > 12, "final foot lost ground contact");
  assert.ok(
    Math.max(...contactPositions) - Math.min(...contactPositions) < 0.04,
    "final planted foot slid after braking",
  );
  actor.dispose();
});

test("major visible garments and footwear form faceted curves rather than cuboids", () => {
  for (const role of ["nephi", "guard", "sariah"] as const) {
    const actor = createCharacter(role);
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
    assert.ok(
      broadBlocks <= 1,
      `${role} has ${broadBlocks} broad rectangular pieces`,
    );
    actor.dispose();
  }
});

test("eyes and brows intersect the face surface in profile", () => {
  for (const role of ["nephi", "guard", "sariah"] as const) {
    const actor = createCharacter(role);
    const face = actor.group.getObjectByName(
      "face",
    ) as T.Mesh<T.SphereGeometry>;
    const radius = face.geometry.parameters.radius;
    for (const side of ["left", "right"]) {
      const eye = actor.group.getObjectByName(
        `${side}-eye`,
      ) as T.Mesh<T.SphereGeometry>;
      const iris = actor.group.getObjectByName(
        `${side}-iris`,
      ) as T.Mesh<T.SphereGeometry>;
      const brow = actor.group.getObjectByName(
        `${side}-brow`,
      ) as T.Mesh<T.SphereGeometry>;
      for (const feature of [eye, brow]) {
        const x =
          (feature.position.x - face.position.x) / (radius * face.scale.x);
        const y =
          (feature.position.y - face.position.y) / (radius * face.scale.y);
        const faceSurface =
          face.position.z +
          radius * face.scale.z * Math.sqrt(1 - x * x - y * y);
        const featureBack =
          feature.position.z -
          feature.geometry.parameters.radius * feature.scale.z;
        assert.ok(
          featureBack <= faceSurface + 0.002,
          `${role} ${side} feature floats ${featureBack - faceSurface}m off face`,
        );
      }
      const eyeFront =
        eye.position.z + eye.geometry.parameters.radius * eye.scale.z;
      const irisBack =
        iris.position.z - iris.geometry.parameters.radius * iris.scale.z;
      assert.ok(
        irisBack <= eyeFront + 0.002,
        `${role} ${side} iris floats off eye`,
      );
    }
    actor.dispose();
  }
});
