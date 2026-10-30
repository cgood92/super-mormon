import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildJaredExpedition } from "./jared-expedition";
import { sceneryCollisionErrors } from "../shared/scenery";
test("expedition has semantic scenery and cannot complete by idle interaction", () => {
  const s = new T.Scene(),
    w = buildJaredExpedition(s);
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
import { jaredExpeditionRoute as route } from "./jared-expedition";
test("continuous outward herd and both carrying return routes complete once", () => {
  const s = new T.Scene(),
    w = buildJaredExpedition(s);
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
    for (let n = 0; n < 3000; n++) {
      const dx = x - p.x,
        dz = z - p.z,
        d = Math.hypot(dx, dz);
      if (d < 0.2) return;
      stepPlayer(
        p,
        {
          x: (-dx / d) * 0.35,
          y: (dz / d) * 0.35,
          jump: false,
          jumpHeld: false,
        },
        1 / 60,
        0,
        w.solids,
      );
      tick();
    }
    assert.fail(`blocked ${x},${z} at ${p.x},${p.z}`);
  };
  walk(-23, 0);
  for (let x = -22; x <= 32; x += 2) {
    walk(x, 0);
    for (let n = 0; n < 45; n++) tick();
  }
  for (let n = 0; n < 300; n++) tick();
  assert.ok((r.snapshot() as any).animals.every((a: any) => a.settled));
  for (const at of [route.fish, route.seeds]) {
    walk(12, 0);
    walk(-12, 0);
    walk(-12, at.z);
    walk(at.x, at.z);
    tick(true);
    assert.notEqual((r.snapshot() as any).carrying, undefined);
    walk(-12, at.z);
    walk(-12, 0);
    walk(12, 0);
    walk(32, 0);
    tick(true);
  }
  assert.equal(done, 1);
  tick(true);
  assert.equal(done, 1);
  w.dispose!();
  tick(true);
  assert.equal(done, 1);
});

test("cargo retry, collision blocks and ridge landing remain available", () => {
  const s = new T.Scene(),
    w = buildJaredExpedition(s);
  const r = w.adventure!({
      toast() {},
      dialog(_a, _b, _c, n) {
        n();
      },
      setAvatar() {},
      complete() {
        assert.fail("no completion on exploration");
      },
    }),
    p = createPlayer(-32, 0, 12);
  const tick = (interact = false) =>
    r.update(0.016, p, { x: 0, y: 0, interact, interactHeld: interact });
  tick(true);
  assert.equal((r.snapshot() as any).carrying, 0);
  p.y = -4;
  tick();
  assert.equal((r.snapshot() as any).carrying, undefined);
  assert.equal(p.x, -38);
  Object.assign(p, createPlayer(-8, 0, 13));
  for (let n = 0; n < 120; n++)
    stepPlayer(
      p,
      { x: -1, y: 0, jump: false, jumpHeld: false },
      1 / 60,
      0,
      w.solids,
    );
  assert.ok(p.x < -3.7, "canyon shoulder blocks walking");
  Object.assign(p, createPlayer(14, 0, -24));
  for (let n = 0; n < 240; n++) {
    stepPlayer(
      p,
      { x: -1, y: 0, jump: false, jumpHeld: false },
      1 / 60,
      0,
      w.solids,
    );
    tick();
    if (p.x > 26) break;
  }
  assert.ok(p.y > 2.7, "ridge staircase supports a landing");
  let disposed = 0;
  s.traverse((o) => {
    if (o instanceof T.InstancedMesh)
      o.addEventListener("dispose", () => disposed++);
  });
  w.dispose!();
  w.dispose!();
  assert.equal(disposed, 1);
});
