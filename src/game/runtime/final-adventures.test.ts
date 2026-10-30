import assert from "node:assert/strict";
import test from "node:test";
import * as T from "three";
import {
  STORY_ORDER,
  STORY_TITLES,
  nextStory,
  readCompleted,
} from "./progression";
import { keepsExploringAfterCompletion, WAR_CHAPTERS } from "./scene-entry";
import { laterPaintingLocation } from "../worlds/conference/gallery-layout";

const additions = ["peace-city", "mormon-records"] as const;

test("finished Bountiful saves naturally discover the final adventures without fabricated completion", () => {
  const end = STORY_ORDER.indexOf("christ-bountiful");
  assert.deepEqual(STORY_ORDER.slice(end + 1), additions);
  const completed = readCompleted(STORY_ORDER.slice(0, end + 1));
  for (const id of additions) {
    assert.equal(nextStory(completed), id);
    assert.ok(!completed.has(id));
    assert.ok(STORY_TITLES[id]);
    assert.ok(WAR_CHAPTERS[id]);
    assert.equal(keepsExploringAfterCompletion(id), true);
    completed.add(id);
  }
  assert.equal(nextStory(completed), null);
});

test("all 26 planned later paintings fit supported side halls with room between captions", () => {
  const occupied = new Set<string>();
  const locations = Array.from({ length: 26 }, (_, i) =>
    laterPaintingLocation(i),
  );
  for (const p of locations) {
    assert.ok([0, 12, 24].includes(p.y), `unsupported floor ${p.y}`);
    assert.equal(Math.abs(p.x), 67.38);
    assert.ok(p.z <= -12 && p.z >= -94);
    const key = JSON.stringify(p);
    assert.ok(!occupied.has(key));
    occupied.add(key);
    for (const q of locations) {
      if (p === q || p.x !== q.x || p.y !== q.y) continue;
      assert.ok(
        Math.abs(p.z - q.z) >= 12,
        "captions and entry approaches stay separate",
      );
    }
  }
});

test("new worlds load lazily, expose real gameplay and release owned scene resources", async () => {
  const { prepareWorld } = await import("./world-loading");
  for (const id of additions) {
    const scene = new T.Scene();
    const prepared = await prepareWorld(id);
    assert.equal(scene.children.length, 0);
    const world = prepared.buildWorld(id, scene);
    assert.ok(world.adventure);
    assert.ok((world.landmarks?.length ?? 0) >= 3);
    let complete = 0;
    const runtime = world.adventure!({
      setAvatar() {},
      toast() {},
      complete() {
        complete++;
      },
      dialog(_a, _b, _c, next) {
        next();
      },
    });
    const player = (await import("../physics/physics")).createPlayer(
      world.spawn.x,
      world.spawn.y,
      world.spawn.z,
    );
    for (let i = 0; i < 30; i++)
      runtime.update(1 / 60, player, {
        interact: true,
        interactHeld: true,
        x: 0,
        y: 0,
      });
    assert.equal(complete, 0);
    runtime.dispose();
    world.dispose?.();
    world.dispose?.();
    assert.equal(scene.children.length, 0);
  }
});
