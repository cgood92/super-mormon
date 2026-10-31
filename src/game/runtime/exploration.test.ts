import assert from "node:assert/strict";
import test from "node:test";
import { Scene } from "three";
import { prepareWorld } from "./world-loading";
import { sceneryCollisionErrors } from "../worlds/shared/scenery";
import { createPlayer, stepPlayer } from "../physics/physics";

const worlds = [
  "signs",
  "gathering",
  "christ-bountiful",
  "peace-city",
  "mormon-records",
  "jared-expedition",
  "jared-barges",
  "shelem-stones",
  "jared-crossing",
  "ether-refuge",
  "moroni-farewell",
] as const;
const notice =
  "Explore.  This level has not been built out yet.  Come back later.";

for (const id of worlds) {
  test(`${id} allows exploration without objectives, interactions or scripted events`, async () => {
    const scene = new Scene();
    const { buildWorld } = await prepareWorld(id);
    const world = buildWorld(id, scene);
    try {
      assert.equal(world.initialObjective, notice);
      assert.ok(world.solids.length > 0);
      assert.deepEqual(sceneryCollisionErrors(scene, world.solids), []);
      assert.ok(scene.children.length > 0);
      const unexpected = () =>
        assert.fail("exploration must not start gameplay or dialogue");
      const runtime = world.adventure!({
        complete: unexpected,
        dialog: unexpected,
        toast: unexpected,
        setAvatar: () => {},
        caught: unexpected,
        attachEquipment: unexpected,
      });
      for (const point of [
        world.spawn,
        world.goal,
        ...(world.landmarks ?? []),
      ]) {
        const player = createPlayer(point.x, point.y, point.z);
        for (let i = 0; i < 10; i++) {
          assert.deepEqual(
            runtime.update(1, player, {
              x: 1,
              y: 1,
              interact: true,
              interactHeld: true,
              jump: true,
              crouch: true,
            }),
            { objective: notice, prompt: "" },
          );
          assert.equal(runtime.movementLocked?.() ?? false, false);
          assert.equal(runtime.camera?.(), undefined);
        }
      }
      assert.equal(
        scene.getObjectByName("Next route landmark")?.visible ?? false,
        false,
      );
      if (id === "jared-crossing") {
        assert.equal(
          scene.getObjectByName("Closed shore hatch")?.visible,
          false,
        );
        assert.ok(!world.solids.some((s) => s.z === 22 && s.w === 24));
        const walker = createPlayer(0, 0, 18);
        for (let i = 0; i < 180; i++)
          stepPlayer(
            walker,
            { x: 0, y: 1, jump: false, jumpHeld: false },
            1 / 60,
            0,
            world.solids,
          );
        assert.ok(
          walker.z > 30,
          "the shore is reachable through the open hatch",
        );
        assert.ok(walker.grounded);
      }
      runtime.dispose();
    } finally {
      world.dispose?.();
    }
    assert.equal(scene.children.length, 0);
  });
}

test("entering each exploration chapter unlocks only the next chapter", async () => {
  const { recordExplorationEntry } = await import("./exploration");
  const { STORY_ORDER, canEnter, nextStory } = await import("./progression");
  const completed = new Set(STORY_ORDER.slice(0, STORY_ORDER.indexOf("signs")));
  for (const id of worlds) {
    assert.equal(nextStory(completed), id);
    assert.ok(canEnter(id, completed));
    assert.equal(recordExplorationEntry(id, completed), true);
    assert.ok(completed.has(id));
    assert.equal(recordExplorationEntry(id, completed), false);
  }
  assert.equal(nextStory(completed), null);
  const fresh = new Set<import("./progression").StoryId>();
  assert.equal(recordExplorationEntry("samuel", fresh), false);
  assert.equal(recordExplorationEntry("hub", fresh), false);
  assert.equal(fresh.size, 0);
});
