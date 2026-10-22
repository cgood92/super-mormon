import test from "node:test";
import assert from "node:assert/strict";
import { createPlayer, stepPlayer } from "../src/super/physics";
import {
  paintingCollider,
  canJumpIntoPainting,
} from "../src/super/gallery-entry";

for (const facing of ["north", "east"] as const) {
  test(`${facing} canvas blocks both sides and a jump from flush contact enters`, () => {
    const portal = { x: 0, z: 0, facing };
    const solid = paintingCollider(portal);
    const east = facing === "east";
    const input = {
      x: east ? -1 : 0,
      y: east ? 0 : -1,
      jump: false,
      jumpHeld: false,
    };
    const player = createPlayer(east ? -2 : 0, 0.18, east ? 0 : 2);
    const solids = [solid, { x: 0, y: -1, z: 0, w: 20, h: 1.18, d: 20 }];
    for (let i = 0; i < 240; i++) stepPlayer(player, input, 1 / 60, 0, solids);
    const distance = () => (east ? -player.x : player.z);
    assert.ok(distance() >= 0.419, `front contact ${distance()}`);
    assert.equal(canJumpIntoPainting(player, portal), false);
    let entered = false;
    for (let i = 0; i < 45; i++) {
      stepPlayer(
        player,
        { ...input, jump: i === 0, jumpHeld: i < 15 },
        1 / 60,
        0,
        solids,
      );
      entered ||= canJumpIntoPainting(player, portal);
      assert.ok(distance() >= 0.419);
    }
    assert.equal(entered, true);
    const back = createPlayer(east ? 2 : 0, 0.18, east ? 0 : -2);
    for (let i = 0; i < 240; i++)
      stepPlayer(
        back,
        { ...input, x: -input.x, y: -input.y },
        1 / 60,
        0,
        solids,
      );
    assert.ok((east ? back.x : -back.z) >= 0.419);
    assert.equal(
      canJumpIntoPainting({ ...back, y: 1, grounded: false }, portal),
      false,
    );
    assert.equal(
      canJumpIntoPainting(
        { ...player, x: 8, z: 8, y: 1, grounded: false },
        portal,
      ),
      false,
    );
  });
}
