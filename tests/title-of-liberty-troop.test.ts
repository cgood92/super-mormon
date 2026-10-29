import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildTitleOfLiberty } from "../src/super/title-of-liberty";
import { createPlayer } from "../src/super/physics";
import type { Point } from "../src/super/worlds";

test("the recruited troop retains twelve distinct soldiers after descending and following Moroni", () => {
  const world = buildTitleOfLiberty(new T.Scene());
  const player = createPlayer(0, 0, 0);
  const runtime = world.adventure!({
    setAvatar() {},
    toast() {},
    complete() {},
    dialog(_r, _t, _b, next) {
      next();
    },
  });
  const state = () =>
    runtime.snapshot() as {
      phase: string;
      target: Point;
      roofSites: Point[];
      volunteers: Point[];
    };
  const idle = { x: 0, y: 0, interact: false, interactHeld: false };
  Object.assign(player, state().target);
  runtime.update(0.1, player, { ...idle, interact: true });
  for (let i = 0; i < 110; i++) runtime.update(0.1, player, idle);
  for (const site of state().roofSites.slice(0, 2)) {
    Object.assign(player, site);
    for (let i = 0; i < 16; i++)
      runtime.update(0.1, player, { ...idle, interactHeld: true });
  }
  Object.assign(player, state().target);
  runtime.update(0.1, player, { ...idle, interact: true });
  for (let i = 0; i < 6000 && state().phase === "gather"; i++) {
    world.update!(1 / 60, player);
    runtime.update(1 / 60, player, idle);
  }
  assert.equal(state().phase, "lead");
  Object.assign(player, { x: 0, y: 0, z: -36 });
  world.update!(1 / 60, player);
  for (let z = -36; z <= 0; z += 0.7) {
    player.z = z;
    for (let i = 0; i < 10; i++) world.update!(1 / 60, player);
  }
  for (let i = 0; i < 6000; i++) world.update!(1 / 60, player);
  const soldiers = state().volunteers;
  assert.ok(
    soldiers.every(
      (p) => p.y < 0.5 && Math.hypot(p.x - player.x, p.z - player.z) < 8,
    ),
    "the entire troop reaches Moroni",
  );
  for (let i = 0; i < soldiers.length; i++)
    for (let j = i + 1; j < soldiers.length; j++)
      assert.ok(
        Math.hypot(
          soldiers[i].x - soldiers[j].x,
          soldiers[i].z - soldiers[j].z,
        ) > 1.2,
        `soldiers ${i} and ${j} overlap`,
      );
  world.dispose!();
});
