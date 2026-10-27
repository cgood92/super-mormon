import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildOliveVineyard } from "../src/super/olive-vineyard";
import { createPlayer } from "../src/super/physics";
const idle = { interact: false, interactHeld: false, x: 0, y: 0 };
test("vineyard groups gardening around the servant, with single presses and three socket branches", () => {
  const scene = new T.Scene(),
    world = buildOliveVineyard(scene),
    player = createPlayer();
  const hand = new T.Group();
  scene.add(hand);
  let complete = 0;
  const runtime = world.adventure!({
    setAvatar: () => {},
    toast: () => {},
    dialog: (_r, _t, _b, next) => next(),
    complete: () => {
      complete++;
    },
    attachEquipment: (slot, prop) => {
      assert.equal(slot, "rightHand");
      hand.add(prop);
    },
  });
  type State = {
    phase: string;
    branchCount: number;
    targets: { id: string; x: number; y: number; z: number }[];
  };
  const state = () => runtime.snapshot() as State;
  Object.assign(player, state().targets[0]);
  runtime.update(0.016, player, idle);
  assert.equal(state().phase, "prune", "meeting the servant is automatic");
  assert.ok(state().targets.length < 20);
  for (const target of state().targets.slice(1)) {
    assert.equal(state().phase, target.id);
    Object.assign(player, target);
    if (!["consultRoots", "firstReturn", "decline"].includes(target.id)) {
      runtime.update(0.1, player, { ...idle, interactHeld: true });
      assert.equal(
        state().phase,
        target.id,
        "holding a previous press cannot perform the next action",
      );
    }
    if (target.id === "graft" || target.id === "regraft")
      Object.assign(player, { x: 0, z: 16 });
    runtime.update(0.016, player, { ...idle, interact: true });
    if (target.id === "nourish") {
      assert.equal(
        scene.getObjectByName("Three young tender natural branches")?.visible,
        true,
      );
      assert.equal(
        scene.getObjectByName("Moist mulch around nourished roots")?.visible,
        true,
      );
    }
    if (target.id === "wild")
      assert.equal(
        scene.getObjectByName("Visible wild branch to collect")?.visible,
        false,
      );
    if (target.id === "tender") {
      assert.equal(state().branchCount, 3);
      assert.equal(
        hand.children[0].children.filter((c) => c.visible).length,
        3,
      );
    }
    if (target.id === "plantA") assert.equal(state().branchCount, 2);
    if (target.id === "plantB") assert.equal(state().branchCount, 1);
    if (target.id === "plantC") assert.equal(state().branchCount, 0);
    for (let i = 0; i < 100 && runtime.movementLocked?.(); i++)
      runtime.update(0.1, player, idle);
    assert.notEqual(
      state().phase,
      target.id,
      `${target.id} needs one press, never holding`,
    );
  }
  assert.equal(state().phase, "done");
  assert.equal(complete, 1);
  runtime.dispose();
  world.dispose!();
});

test("vineyard inspection and harvest cameras clear rendered scenery and frame trees on a phone", async () => {
  const { StoryMeshObstacles } = await import("../src/super/cinematic");
  const scene = new T.Scene(),
    world = buildOliveVineyard(scene),
    player = createPlayer();
  const runtime = world.adventure!({
    setAvatar: () => {},
    toast: () => {},
    dialog: (_r, _t, _b, next) => next(),
    complete: () => {},
  });
  const state = () =>
    runtime.snapshot() as {
      phase: string;
      targets: { id: string; x: number; y: number; z: number }[];
    };
  let shots = 0;
  for (const target of state().targets) {
    Object.assign(player, target);
    runtime.update(0.016, player, { ...idle, interact: true });
    for (let i = 0; i < 100 && runtime.movementLocked?.(); i++) {
      world.update?.(0.1, player);
      const shot = runtime.camera!()!;
      const obstacles = new StoryMeshObstacles(scene, [
        { group: scene.getObjectByName("sam-character")! },
      ]);
      assert.ok(
        obstacles.clear(
          new T.Vector3(shot.position.x, shot.position.y, shot.position.z),
          new T.Vector3(shot.focus.x, shot.focus.y, shot.focus.z),
          0.12,
        ),
        `blocked ${target.id} camera`,
      );
      for (const aspect of [16 / 9, 390 / 844]) {
        const camera = new T.PerspectiveCamera(58, aspect, 0.08, 320);
        camera.position.set(shot.position.x, shot.position.y, shot.position.z);
        camera.lookAt(shot.focus.x, shot.focus.y, shot.focus.z);
        camera.updateMatrixWorld();
        if (shot.focus.y === 3) {
          scene.updateMatrixWorld(true);
          let crown: T.Object3D | undefined;
          scene.traverse((object) => {
            if (
              object instanceof T.Group &&
              object.children.some(
                (child) => child.name === "High olive canopy",
              ) &&
              Math.abs(object.position.x - (shot.focus.x - 1.4)) < 0.01 &&
              Math.abs(object.position.z - (shot.focus.z - 0.5)) < 0.01
            )
              crown = object;
          });
          assert.ok(crown);
          const box = new T.Box3().setFromObject(crown);
          for (const x of [box.min.x, box.max.x])
            for (const y of [box.min.y, box.max.y])
              for (const z of [box.min.z, box.max.z]) {
                const corner = new T.Vector3(x, y, z).project(camera);
                assert.ok(
                  Math.abs(corner.x) < 0.98 && Math.abs(corner.y) < 0.98,
                  `canopy clipped on aspect ${aspect}: ${corner.x},${corner.y}`,
                );
              }
        }
        const trunk = new T.Vector3(
          shot.focus.x - 1.4,
          2,
          shot.focus.z - 0.5,
        ).project(camera);
        assert.ok(
          Math.abs(trunk.x) < 0.9 && Math.abs(trunk.y) < 0.9,
          "tree trunk stays visible",
        );
      }
      shots++;
      runtime.update(0.1, player, idle);
    }
  }
  assert.ok(shots > 140);
  runtime.dispose();
  world.dispose!();
});

test("ordinary walking reaches every grouped vineyard action and regraft works beside the trunk", async () => {
  const { stepPlayer } = await import("../src/super/physics");
  const { sceneryCollisionErrors } = await import("../src/super/scenery");
  const scene = new T.Scene(),
    world = buildOliveVineyard(scene),
    p = createPlayer(world.spawn.x, world.spawn.y, world.spawn.z);
  const runtime = world.adventure!({
    setAvatar: () => {},
    toast: () => {},
    dialog: (_r, _t, _b, next) => next(),
    complete: () => {},
  });
  const state = () =>
    runtime.snapshot() as {
      phase: string;
      targets: { id: string; x: number; y: number; z: number }[];
    };
  const walk = (x: number, z: number) => {
    for (let frame = 0; frame < 1600; frame++) {
      const dx = x - p.x,
        dz = z - p.z,
        d = Math.hypot(dx, dz);
      if (d < 0.16 && Math.hypot(p.vx, p.vz) < 0.4) return;
      const strength = Math.min(1, d * 1.5);
      stepPlayer(
        p,
        {
          x: d ? (-dx / d) * strength : 0,
          y: d ? (dz / d) * strength : 0,
          jump: false,
          jumpHeld: false,
        },
        1 / 60,
        0,
        world.solids,
      );
      world.update?.(1 / 60, p);
    }
    assert.fail(`blocked walking to ${x},${z} at ${p.x},${p.z}`);
  };
  for (const target of state().targets) {
    if (target.id === "regraft") {
      walk(7, 10);
      walk(3, 18);
    }
    walk(target.x, target.z);
    runtime.update(0.016, p, { ...idle, interact: true });
    for (let i = 0; i < 100 && runtime.movementLocked?.(); i++)
      runtime.update(0.1, p, idle);
    assert.notEqual(state().phase, target.id);
    assert.deepEqual(sceneryCollisionErrors(scene, world.solids), []);
  }
  assert.equal(state().phase, "done");
  runtime.dispose();
  world.dispose!();
});
