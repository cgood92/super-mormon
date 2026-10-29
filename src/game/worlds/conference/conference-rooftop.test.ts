import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildRooftop } from "./conference-rooftop";
import { createPlayer, stepPlayer } from "../../physics/physics";

test("roof has sealed skylights, instanced gardens and an open stair shaft", () => {
  const group = new T.Group(),
    roof = buildRooftop(group);
  assert.equal(group.children.length, 1);
  const all: T.Object3D[] = [];
  group.traverse((o) => all.push(o));
  assert.equal(
    all.filter((o) => o.name === "sealed rectangular skylight").length,
    9,
  );
  assert.ok(all.filter((o) => o instanceof T.InstancedMesh).length >= 4);
  assert.equal(all.filter((o) => o.name === "fountain stone basin").length, 2);
  assert.ok(
    !roof.solids.some(
      (s) =>
        s.y < 36 &&
        s.x - s.w / 2 < -56 &&
        s.x + s.w / 2 > -56 &&
        s.z - s.d / 2 < 20 &&
        s.z + s.d / 2 > 20,
    ),
  );
});

test("real player can explore both fountains and perimeter then return to arrival", () => {
  const { solids } = buildRooftop(new T.Group());
  const player = createPlayer(-56, 36, -1);
  const route = [
    [-68, 0],
    [-68, -99],
    [16, -99],
    [16, -100],
    [68, -100],
    [68, 12],
    [16, 12],
    [16, 19],
    [0, 19],
    [0, 43],
    [-68, 43],
    [-68, 0],
    [-56, -1],
  ];
  for (const [x, z] of route) {
    let frames = 0;
    while (Math.hypot(x - player.x, z - player.z) > 0.25 && frames++ < 2200) {
      const dx = x - player.x,
        dz = z - player.z,
        length = Math.hypot(dx, dz);
      stepPlayer(
        player,
        { x: -dx / length, y: dz / length, jump: false, jumpHeld: false },
        1 / 60,
        0,
        solids,
      );
      assert.ok(player.y >= 35.99, `fell at ${player.x},${player.z}`);
    }
    assert.ok(
      frames < 2200,
      `blocked approaching ${x},${z} at ${player.x},${player.z}`,
    );
    player.vx = 0;
    player.vz = 0;
  }
  assert.ok(Math.hypot(player.x + 56, player.z + 1) < 0.3);
});
