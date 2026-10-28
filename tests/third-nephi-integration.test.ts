import assert from "node:assert/strict";
import test from "node:test";
import { Scene, Mesh, Raycaster, Vector3 } from "three";
import {
  STORY_ORDER,
  STORY_TITLES,
  nextStory,
  readCompleted,
} from "../src/super/progression";
import { laterPainting } from "../src/super/gallery-layout";

const additions = ["signs", "gathering", "christ-bountiful"] as const;

test("Third Nephi follows Samuel and existing finished saves discover the new stories", () => {
  assert.deepEqual(STORY_ORDER.slice(-4), ["samuel", ...additions]);
  const completed = readCompleted(
    STORY_ORDER.filter(
      (id) => !additions.includes(id as (typeof additions)[number]),
    ),
  );
  for (const id of additions) {
    assert.equal(nextStory(completed), id);
    assert.ok(STORY_TITLES[id]);
    completed.add(id);
  }
  assert.equal(nextStory(completed), null);
});

test("new paintings occupy upper side hallways outside the auditorium", () => {
  for (const id of additions) {
    const index = STORY_ORDER.indexOf(id) - 6;
    const painting = laterPainting(id, index);
    assert.equal(Math.abs(painting.x), 77);
    assert.ok(painting.y >= 12);
    assert.ok(painting.title.length > 0);
  }
});

test("each Third Nephi scene loads lazily, plays and releases its resources", async () => {
  const { prepareWorld } = await import("../src/super/world-loading");
  for (const id of additions) {
    const scene = new Scene();
    const prepared = await prepareWorld(id);
    assert.equal(scene.children.length, 0);
    const world = prepared.buildWorld(id, scene);
    assert.ok(world.adventure);
    assert.ok(world.bounds);
    assert.ok((world.landmarks?.length ?? 0) >= 3);
    scene.updateMatrixWorld(true);
    const surfaces: Mesh[] = [];
    scene.traverse((object) => {
      if (object instanceof Mesh && object.userData.scenery?.kind === "solid")
        surfaces.push(object);
    });
    const ray = new Raycaster(
      new Vector3(world.spawn.x, 0.2, world.spawn.z),
      new Vector3(0, -1, 0),
      0,
      0.4,
    );
    const owners = new Set(
      ray.intersectObjects(surfaces).map((hit) => hit.object),
    );
    assert.equal(owners.size, 1, `${id} spawn floor has one surface owner`);
    const runtime = world.adventure!({
      setAvatar() {},
      toast() {},
      complete() {},
      dialog(_k, _t, _b, next) {
        next();
      },
    });
    assert.ok(runtime.snapshot());
    runtime.dispose();
    world.dispose?.();
    assert.equal(scene.children.length, 0);
  }
});

test("new adventures retain free exploration after completion", async () => {
  const { keepsExploringAfterCompletion } =
    await import("../src/super/scene-entry");
  for (const id of additions)
    assert.equal(keepsExploringAfterCompletion(id), true);
  assert.equal(keepsExploringAfterCompletion("samuel"), false);
  assert.equal(keepsExploringAfterCompletion("hub"), false);
});
