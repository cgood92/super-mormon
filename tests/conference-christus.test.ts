import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import {
  buildConferenceChristus,
  CHRISTUS_REFERENCE,
} from "../src/super/conference-christus";
import { createPlayer, stepPlayer } from "../src/super/physics";
import { sceneryCollisionErrors } from "../src/super/scenery";

test("Christus is a large modeled marble figure with source attribution and fitted physical support", () => {
  const scene = new T.Group();
  const statue = buildConferenceChristus(scene);
  assert.equal(statue.group.userData.sourceUrl, CHRISTUS_REFERENCE);
  assert.match(statue.group.userData.authorNote, /not an exact scan/);
  const figure = statue.group.children.find((o) =>
    o.name.startsWith("Christus white"),
  ) as T.Mesh;
  const box =
    figure.geometry.boundingBox ??
    (figure.geometry.computeBoundingBox(), figure.geometry.boundingBox!);
  assert.ok(box.max.y > 4.5 && box.min.y < 0.1);
  assert.ok(
    box.max.x > 2 && box.min.x < -2,
    "open arms and individually modeled hands",
  );
  const positions = figure.geometry.getAttribute("position");
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i);
    if (y > 1.3 && y < 2.5)
      assert.ok(
        positions.getZ(i) < 0.41,
        "robe folds stay on the body rather than forming a detached diagonal bar",
      );
  }
  const count = positions.count;
  assert.ok(count / 3 < 80000, `${count / 3} triangles`);
  assert.equal(
    statue.group.children.filter((o) => o instanceof T.Mesh).length,
    2,
  );
  assert.deepEqual(sceneryCollisionErrors(scene, statue.solids), []);
  // Every vertex and normal must remain finite, including the small facial features.
  for (const attribute of ["position", "normal"])
    for (const n of figure.geometry.getAttribute(attribute).array)
      assert.ok(Number.isFinite(n));
});

test("second floor visitors are blocked by the pedestal and can walk around both sides", () => {
  const statue = buildConferenceChristus(new T.Group());
  const solids = [
    { x: 0, y: 11.5, z: 27, w: 20, h: 0.5, d: 20 },
    ...statue.solids,
  ];
  const walk = (
    player: ReturnType<typeof createPlayer>,
    x: number,
    z: number,
  ) => {
    for (let i = 0; i < 500; i++) {
      const dx = x - player.x,
        dz = z - player.z,
        d = Math.hypot(dx, dz);
      if (d < 0.1) break;
      stepPlayer(
        player,
        { x: -dx / d, y: dz / d, jump: false, jumpHeld: false },
        1 / 60,
        0,
        solids,
      );
    }
  };
  const blocked = createPlayer(0, 12, 31);
  walk(blocked, 0, 27);
  assert.ok(blocked.z > 28, "pedestal blocks straight walking");
  for (const side of [-1, 1]) {
    const player = createPlayer(0, 12, 31);
    for (const p of [
      [side * 3.3, 31],
      [side * 3.3, 24],
      [0, 24],
    ]) {
      walk(player, p[0], p[1]);
      assert.ok(Math.hypot(player.x - p[0], player.z - p[1]) < 0.15);
      assert.ok(Math.abs(player.y - 12) < 0.05);
    }
  }
});
