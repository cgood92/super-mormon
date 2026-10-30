import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildJaredBarges } from "./jared-barges";
import { sceneryCollisionErrors } from "../shared/scenery";
test("barges has semantic scenery and cannot complete by idle interaction", () => {
  const s = new T.Scene(),
    w = buildJaredBarges(s);
  let done = 0;
  const r = w.adventure!({
    toast() {},
    dialog(_a, _b, _c, n) {
      n();
    },
    setAvatar() {},
    complete() {
      done++;
    },
  });
  const p = { ...w.spawn, yaw: 0 };
  for (let i = 0; i < 100; i++)
    r.update(100, p as any, { x: 0, y: 0, interact: true, interactHeld: true });
  assert.equal(done, 0);
  assert.deepEqual(sceneryCollisionErrors(s, w.solids), []);
  w.dispose!();
  assert.equal(s.children.length, 0);
});
import { createPlayer, stepPlayer } from "../../physics/physics";
import { jaredBargesRoute as route } from "./jared-barges";
test("three shaped assemblies use continuous stairs and airflow requires rear aisle travel", () => {
  const s = new T.Scene(),
    w = buildJaredBarges(s);
  let done = 0;
  const r = w.adventure!({
      toast() {},
      dialog(_a, _b, _c, n) {
        n();
      },
      setAvatar() {},
      complete() {
        done++;
      },
    }),
    p = createPlayer(w.spawn.x, 0, w.spawn.z);
  const tick = (interact = false) =>
    r.update(1 / 60, p, { x: 0, y: 0, interact, interactHeld: interact });
  const walk = (x: number, z: number) => {
    for (let n = 0; n < 2400; n++) {
      const dx = x - p.x,
        dz = z - p.z,
        d = Math.hypot(dx, dz);
      if (d < 0.15) return;
      stepPlayer(
        p,
        { x: -dx / d, y: dz / d, jump: false, jumpHeld: false },
        1 / 60,
        0,
        w.solids,
      );
      tick();
    }
    assert.fail(`blocked ${x},${z} at ${p.x},${p.y},${p.z}`);
  };
  for (let i = 0; i < 3; i++) {
    walk(-30, 0);
    walk(-30, route.pieces[i].z);
    walk(-24, route.pieces[i].z);
    tick(true);
    walk(-30, route.pieces[i].z);
    walk(-30, 0);
    walk(5, 0);
    walk(13.2, 0);
    assert.ok(p.y > 1);
    walk(14, route.sockets[i].z);
    tick(true);
    walk(13.2, 0);
    walk(5, 0);
  }
  assert.ok((r.snapshot() as any).fitted.every(Boolean));
  walk(13.2, 0);
  walk(19, 0);
  tick(true);
  assert.equal((r.snapshot() as any).open, true);
  tick(true);
  assert.equal(done, 0);
  tick(true);
  walk(20, 4);
  assert.equal((r.snapshot() as any).airTested, true);
  walk(20, 0);
  tick(true);
  assert.equal(done, 1);
  tick(true);
  assert.equal(done, 1);
  w.dispose!();
  tick(true);
  assert.equal(done, 1);
});

test("carried shape resets after a fall and enclosure blocks walking", () => {
  const s = new T.Scene(),
    w = buildJaredBarges(s);
  const r = w.adventure!({
      toast() {},
      dialog(_a, _b, _c, n) {
        n();
      },
      setAvatar() {},
      complete() {
        assert.fail("no completion while exploring");
      },
    }),
    p = createPlayer(-24, 0, -10);
  r.update(0.016, p, { x: 0, y: 0, interact: true, interactHeld: true });
  assert.equal((r.snapshot() as any).carrying, 0);
  p.y = -4;
  r.update(0.016, p, { x: 0, y: 0, interact: false, interactHeld: false });
  assert.equal((r.snapshot() as any).carrying, undefined);
  assert.equal(p.x, -34);
  Object.assign(p, createPlayer(22, 1.2, 2));
  for (let n = 0; n < 100; n++)
    stepPlayer(
      p,
      { x: -1, y: 0, jump: false, jumpHeld: false },
      1 / 60,
      0,
      w.solids,
    );
  assert.ok(p.x < 24.5);
  let disposed = 0;
  s.traverse((o) => {
    if (o instanceof T.Mesh)
      o.geometry.addEventListener("dispose", () => disposed++);
  });
  w.dispose!();
  assert.ok(disposed > 50);
});

test("optional loft and bluff have continuous supported walking approaches", () => {
  const s = new T.Scene(),
    w = buildJaredBarges(s);
  const r = w.adventure!({
      toast() {},
      dialog(_a, _b, _c, n) {
        n();
      },
      setAvatar() {},
      complete() {},
    }),
    p = createPlayer(w.spawn.x, 0, w.spawn.z);
  const walk = (x: number, z: number) => {
    for (let n = 0; n < 1600; n++) {
      const dx = x - p.x,
        dz = z - p.z,
        d = Math.hypot(dx, dz);
      if (d < 0.15) return;
      stepPlayer(
        p,
        { x: -dx / d, y: dz / d, jump: false, jumpHeld: false },
        1 / 60,
        0,
        w.solids,
      );
      r.update(1 / 60, p, { x: 0, y: 0, interact: false, interactHeld: false });
    }
    assert.fail(`optional blocked ${x},${z}: ${p.x},${p.y},${p.z}`);
  };
  walk(-37, 8);
  walk(-34, 8);
  walk(-34, 15);
  walk(-30, 15);
  walk(-30, 20);
  assert.ok(p.y > 1.7);
  assert.ok((r.snapshot() as any).discoveries.includes(0));
  walk(-37, 20);
  walk(-37, 8);
  walk(-37, 4);
  walk(-7, 4);
  walk(-7, -10);
  walk(-8, -10);
  walk(-8, -20);
  assert.ok(p.y > 1.7);
  assert.ok((r.snapshot() as any).discoveries.includes(2));
  w.dispose!();
});

test("brother of Jared is the player, with Jared and an unnamed shipwright ashore", () => {
  const scene = new T.Scene();
  const world = buildJaredBarges(scene);
  let avatar = "";
  world.adventure!({
    toast() {},
    dialog(_a, _b, _c, next) {
      next();
    },
    setAvatar(role) {
      avatar = role;
    },
    complete() {},
  });
  assert.equal(avatar, "jared-brother");
  assert.ok(
    !scene.getObjectByName("Brother of Jared"),
    "the named player must not also appear as a stationary NPC",
  );
  assert.ok(
    scene.getObjectByName("Jared"),
    "his distinct brother remains ashore",
  );
  assert.ok(
    scene.getObjectByName("Shipwright"),
    "an unnamed worker occupies the work area",
  );
  world.dispose!();
});
