import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildAmmonFlocks, touchesSebusWater } from "./ammon-flocks";
import { createPlayer, stepPlayer } from "../../physics/physics";
const idle = { interact: false, interactHeld: false, x: 0, y: 0 };
test("Ammon shepherds a real moving flock from the royal yard using walking inputs", () => {
  const scene = new T.Scene(),
    world = buildAmmonFlocks(scene),
    player = createPlayer(world.spawn.x, 0, world.spawn.z);
  let completed = 0,
    dialogs = 0;
  const runtime = world.adventure!({
    setAvatar() {},
    toast() {},
    complete() {
      completed++;
    },
    dialog(_k, _t, _b, next) {
      dialogs++;
      next();
    },
  });
  const snap = () =>
    runtime.snapshot() as {
      phase: string;
      flock: { position: T.Vector3 }[];
      raiders: { id: string; position: T.Vector3; defeated: boolean }[];
      servants: { position: T.Vector3 }[];
      battleRetries: number;
      aiming: boolean;
      charge: number;
      attackCount: number;
      flockMarkers: number;
      stone?: { position: T.Vector3; active: boolean };
    };
  const tick = (x = 0, y = 0) => {
    if (!runtime.movementLocked?.())
      stepPlayer(
        player,
        { x: -x, y, jump: false, jumpHeld: false },
        1 / 60,
        0,
        world.solids,
      );
    runtime.update(1 / 60, player, idle);
  };
  const walk = (x: number, z: number, limit = 1200) => {
    for (let n = 0; n < limit; n++) {
      const dx = x - player.x,
        dz = z - player.z,
        d = Math.hypot(dx, dz);
      if (d < 0.3) return;
      tick(dx / d, dz / d);
    }
  };
  assert.equal(snap().phase, "drive", "herding begins without a conversation");
  const servantsBefore = snap().servants.map((a) => a.position.clone());
  walk(7, -10);
  for (let n = 0; n < 180; n++) tick();
  assert.ok(snap().servants.length >= 2);
  assert.ok(
    snap().servants.every(
      (a, i) => a.position.distanceTo(servantsBefore[i]) > 2,
    ),
    `servants follow without interaction ${snap().servants.map((s) => s.position.toArray())}`,
  );
  const before = snap().flock.map((a) => a.position.clone());
  for (let n = 0; n < 60; n++) tick();
  assert.ok(
    snap().flock.some((a, i) => a.position.distanceTo(before[i]) > 0.05),
  );
  // Circle behind the furthest stray, then press it toward the gathering point.
  const herd = (phase: string, gx: number, gz: number) => {
    for (let round = 0; round < 800 && snap().phase === phase; round++) {
      if (
        phase === "return" &&
        snap().flock.every(
          (a) => Math.hypot(a.position.x - gx, a.position.z - gz) < 8,
        )
      )
        break;
      const animal = snap()
        .flock.map((a) => a.position)
        .sort(
          (a, b) =>
            Math.hypot(b.x - gx, b.z - gz) - Math.hypot(a.x - gx, a.z - gz),
        )[0];
      const d = Math.hypot(animal.x - gx, animal.z - gz),
        nx = (animal.x - gx) / d,
        nz = (animal.z - gz) / d;
      // Approach the flank before taking position behind the animal.
      if (Math.hypot(player.x - animal.x, player.z - animal.z) > 6)
        walk(animal.x + nx * 3 - nz * 5, animal.z + nz * 3 + nx * 5, 100);
      for (let f = 0; f < 100 && snap().phase === phase; f++) {
        const current = snap()
          .flock.map((a) => a.position)
          .sort(
            (a, b) =>
              Math.hypot(b.x - gx, b.z - gz) - Math.hypot(a.x - gx, a.z - gz),
          )[0];
        const dist = Math.hypot(current.x - gx, current.z - gz);
        const tx = current.x + ((current.x - gx) / dist) * 2.5,
          tz = current.z + ((current.z - gz) / dist) * 2.5;
        const dx = tx - player.x,
          dz = tz - player.z,
          dd = Math.hypot(dx, dz);
        tick(dd > 0.25 ? dx / dd : 0, dd > 0.25 ? dz / dd : 0);
      }
    }
  };
  herd("drive", 0, 34);
  assert.equal(snap().phase, "scatter");
  assert.ok(
    snap().flock.every((a) => a.position.z >= 32),
    "all animals reach the actual water before the cinematic",
  );
  assert.ok(runtime.movementLocked?.());
  assert.ok(runtime.camera?.());
  for (let f = 0; f < 540; f++) tick();
  assert.equal(snap().phase, "recover");
  assert.ok(snap().flockMarkers > 0, "strays have visible indicators");
  herd("recover", 0, 34);
  assert.equal(snap().phase, "protect");
  assert.equal(snap().raiders.filter((r) => r.defeated).length, 0);
  for (let f = 0; f < 60 * 35; f++) tick();
  assert.equal(
    snap().phase,
    "protect",
    "combat never scatters the gathered flock again",
  );
  assert.equal(snap().flockMarkers, 0);
  assert.ok(snap().attackCount > 0, "raiders attack Ammon with stones");
  const gathered = snap().flock.map((a) => a.position.clone());
  const missiles = world.actorParent!.children.filter(
    (a) => a.name === "Raider thrown stone",
  );
  const retries = snap().battleRetries;
  for (let f = 0; f < 400 && snap().battleRetries === retries; f++) {
    tick();
    const missile = missiles.find((a) => a.visible && a.position.y > 0.7);
    if (missile) {
      player.x = missile.position.x;
      player.y = missile.position.y - 1;
      player.z = missile.position.z;
      runtime.update(1 / 60, player, idle);
    }
  }
  assert.equal(
    snap().battleRetries,
    retries + 1,
    "a projectile hit retries the battle",
  );
  assert.equal(snap().phase, "protect");
  assert.ok(
    snap().flock.every((a, i) => a.position.equals(gathered[i])),
    "retry preserves gathered animals",
  );
  assert.equal(snap().flockMarkers, 0);
  player.y = 0;
  walk(0, 34);
  // Spin while aiming away: holding and proximity cannot auto-hit raiders.
  player.yaw = Math.PI;
  for (let f = 0; f < 90; f++)
    runtime.update(1 / 60, player, { ...idle, interactHeld: true });
  assert.ok(snap().charge > 0.95);
  const shot = runtime.camera!()!;
  const view = new T.Vector3()
    .subVectors(shot.focus, shot.position)
    .normalize();
  const expectedPouch = new T.Vector3(
    player.x - Math.cos(player.yaw) * 0.42,
    player.y + 1.3,
    player.z + Math.sin(player.yaw) * 0.42,
  ).addScaledVector(
    new T.Vector3(
      Math.sin(player.yaw) * Math.cos(0.02),
      Math.sin(0.02),
      Math.cos(player.yaw) * Math.cos(0.02),
    ),
    0.55,
  );
  const cameraRay = new T.Ray(shot.position, view);
  assert.ok(
    cameraRay.distanceToPoint(expectedPouch) < 0.2,
    "reticle aligns with the sling’s forward release line",
  );
  runtime.update(1 / 60, player, { ...idle, jump: true });
  assert.equal(snap().aiming, false);
  assert.equal(snap().stone, undefined);
  for (let f = 0; f < 80; f++)
    runtime.update(1 / 60, player, { ...idle, interactHeld: true });
  for (let f = 0; f < 30 && !snap().stone; f++)
    runtime.update(1 / 60, player, idle);
  assert.ok(snap().stone?.active);
  const initial = snap().stone!.position.clone();
  for (let f = 0; f < 8; f++) runtime.update(1 / 60, player, idle);
  assert.ok(snap().stone!.position.distanceTo(initial) > 2);
  assert.equal(snap().raiders.filter((r) => r.defeated).length, 0);
  // Approach each moving attacker normally, then aim a real stone at its predicted crossing.
  for (let tries = 0; tries < 18 && snap().phase === "protect"; tries++) {
    const r = snap().raiders.find((r) => !r.defeated)!;
    walk(r.position.x, r.position.z - 5, 250);
    const predicted = r.position.clone();
    player.yaw = Math.atan2(
      predicted.x - player.x + 0.42,
      predicted.z - player.z,
    );
    for (let f = 0; f < 76; f++)
      runtime.update(1 / 60, player, { ...idle, interactHeld: true });
    for (let f = 0; f < 50; f++) runtime.update(1 / 60, player, idle);
  }
  assert.equal(snap().phase, "return");
  assert.ok(
    world
      .actorParent!.children.filter((a) =>
        a.name.startsWith("Masked flock raider"),
      )
      .every((a) => !a.visible),
    "slain enemies do not flee the scene",
  );
  assert.match(
    runtime.update(1 / 60, player, idle).objective!,
    /^Return the flock to the king •/,
  );
  herd("return", 0, -25);
  walk(0, -25);
  runtime.update(1 / 60, player, { ...idle, interact: true });
  assert.equal(snap().phase, "done");
  assert.equal(completed, 1);
  assert.equal(
    dialogs,
    0,
    "no required conversations interrupt the herding adventure",
  );

  runtime.dispose();
  world.dispose!();
  assert.equal(scene.children.length, 0);
  world.dispose!();
});

test("pasture scenery has deliberate collision, solid trunks, clear routes, and a single ground owner", async () => {
  const { sceneryCollisionErrors } = await import("../shared/scenery");
  const world = buildAmmonFlocks(new T.Scene());
  assert.deepEqual(
    sceneryCollisionErrors(world.actorParent!, world.solids),
    [],
  );
  const player = createPlayer(-18, 0, 5);
  const step = (x: number, y: number, frames: number) => {
    for (let f = 0; f < frames; f++)
      stepPlayer(
        player,
        { x: -x, y, jump: false, jumpHeld: false },
        1 / 60,
        0,
        world.solids,
      );
  };
  step(0, 1, 120);
  assert.ok(player.z < 8.5, "tree trunk blocks direct walking");
  step(1, 0, 30);
  step(0, 1, 90);
  assert.ok(player.z > 12, "player can walk around the trunk");
  const falling = createPlayer(0, 5, 0);
  for (let f = 0; f < 180; f++)
    stepPlayer(
      falling,
      { x: 0, y: 0, jump: false, jumpHeld: false },
      1 / 60,
      0,
      world.solids,
    );
  assert.ok(falling.grounded);
  assert.equal(falling.y, 0);
  world.actorParent!.updateMatrixWorld(true);
  const ray = new T.Raycaster(
    new T.Vector3(0.123, 6, 0.321),
    new T.Vector3(0, -1, 0),
  );
  const hits = ray
    .intersectObject(world.actorParent!, true)
    .filter((h) => h.object.name === "Pasture ground");
  assert.equal(hits.length, 1, "one ground surface owns this walking point");
  world.dispose!();
});

test("raiders wear dark coats and head-attached masks with no facial hair", () => {
  const world = buildAmmonFlocks(new T.Scene());
  const raiders = world.actorParent!.children.filter((o) =>
    o.name.startsWith("Masked flock raider"),
  );
  assert.equal(raiders.length, 3);
  let maskBuffersDisposed = 0;
  for (const actor of raiders) {
    const mask = actor.getObjectByName("Imagined dark cloth face covering")!;
    assert.equal(mask.parent!.name, "head");
    (mask as T.Mesh).geometry.addEventListener(
      "dispose",
      () => maskBuffersDisposed++,
    );
    ((mask as T.Mesh).material as T.Material).addEventListener(
      "dispose",
      () => maskBuffersDisposed++,
    );
    const coat = actor.getObjectByName("flowing-mantle") as T.Mesh;
    assert.equal(
      (coat.material as T.MeshStandardMaterial).color.getHex(),
      0x242933,
    );
    assert.equal(
      actor.getObjectByName("one-piece-sculpted-beard")!.visible,
      false,
    );
  }
  world.dispose!();
  world.dispose!();
  assert.equal(
    maskBuffersDisposed,
    6,
    "all mask buffers and materials are released exactly once",
  );
});

test("water contact covers every visible bank, including partial body contact", () => {
  for (const [x, z] of [
    [0, 31.5],
    [5.5, 37],
    [-5.5, 37],
    [0, 42.5],
  ])
    assert.equal(touchesSebusWater(x, z), true, `contact at ${x}, ${z}`);
  assert.equal(touchesSebusWater(6, 37), false);
  assert.equal(touchesSebusWater(0, 30), false);
});
