import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createPlayer } from "../../physics/physics";
import { buildStreetLife } from "./missionary-street-life";

test("street life walks safe sidewalks, yields to the player, and releases actors", () => {
  const root = new T.Group();
  const life = buildStreetLife(root);
  const actors = [...root.children];
  assert.ok(actors.length >= 8);
  const starts = actors.map((a) => a.position.clone());
  life.update(1);
  actors.forEach((a, i) => assert.ok(a.position.distanceTo(starts[i]) > 0.1));
  const actor = actors[0];
  const paused = actor.position.clone();
  life.update(0.1, createPlayer(paused.x, paused.y, paused.z));
  assert.equal(actor.position.distanceTo(paused), 0);
  for (let i = 0; i < 1500; i++) {
    life.update(0.25);
    for (const a of actors) {
      assert.ok(Math.abs(a.position.x) <= 30);
      // Bench seats and backs use their authored fixed physical footprints.
      // Include a pedestrian/dog radius rather than testing only center points.
      for (const benchX of [-9, 9]) {
        for (const [z, depth] of [
          [40, 0.65],
          [40.45, 0.15],
        ]) {
          assert.ok(
            Math.abs(a.position.x - benchX) >= 1.5 + 0.35 ||
              Math.abs(a.position.z - z) >= depth / 2 + 0.35,
            `${a.name} overlaps park bench at ${benchX}, ${z}`,
          );
        }
      }
      assert.ok(
        [-14.2, 3.8, 21.8, 38.8, 39].some(
          (z) => Math.abs(z - a.position.z) < 0.01,
        ),
      );
      assert.ok([-23, -5, 13, 31].every((z) => Math.abs(z - a.position.z) > 3));
    }
  }
  const shirts = actors
    .filter((a) => a.name.startsWith("Neighborhood resident"))
    .map((a) => {
      const mesh = a.getObjectByName("continuous-robe-and-sleeves") as T.Mesh;
      assert.equal(a.getObjectByName("modern-tie")?.visible, false);
      assert.equal(a.getObjectByName("missionary-name-tag")?.visible, false);
      return (mesh.material as T.MeshStandardMaterial).color.getHex();
    });
  assert.equal(new Set(shirts).size, 6);
  root.traverse((o) => {
    if (o instanceof T.Mesh)
      assert.equal(o.userData.scenery?.kind, "decoration");
  });
  life.dispose();
  assert.equal(root.children.length, 0);
  life.dispose();
});
