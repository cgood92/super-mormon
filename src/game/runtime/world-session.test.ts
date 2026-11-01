import assert from "node:assert/strict";
import test from "node:test";
import { WorldSession } from "./world-session";
import { prepareWorld } from "./world-loading";

test("house session creates the hero, treasures and goal, then releases the scene", async () => {
  const session = new WorldSession();
  const prepared = await prepareWorld("house");
  session.build("house", prepared, undefined, new Set());
  assert.deepEqual(
    { x: session.player.x, y: session.player.y, z: session.player.z },
    {
      x: session.world.spawn.x,
      y: session.world.spawn.y,
      z: session.world.spawn.z,
    },
  );
  assert.equal(session.avatar.group.parent, session.scene);
  assert.equal(session.treasureMeshes.size, 5);
  assert.equal(session.goalMarker?.parent, session.scene);
  for (const treasure of session.world.treasures!) {
    const mesh = session.treasureMeshes.get(treasure.id)!;
    assert.deepEqual(mesh.position.toArray(), [
      treasure.x,
      treasure.y + 0.25,
      treasure.z,
    ]);
  }
  session.dispose();
  assert.equal(session.scene.children.length, 0);
  assert.equal(session.poundImpact, null);
  assert.equal(session.adventure, null);
});

test("palace session preserves hidden pursuers and the three waiting brothers", async () => {
  const session = new WorldSession();
  session.build("palace", await prepareWorld("palace"), undefined, new Set());
  assert.equal(session.guards.length, session.world.pursuers!.length);
  assert.ok(session.guards.every((guard) => !guard.actor.group.visible));
  assert.equal(session.extras.length, 4);
  assert.equal(session.wavingExtras.length, 3);
  session.collected.add("old-treasure");
  session.storyCheckpoint = { x: 1, y: 2, z: 3 };
  session.dispose();
  session.build("house", await prepareWorld("house"), undefined, new Set());
  assert.equal(session.guards.length, 0);
  assert.equal(session.extras.length, 0);
  assert.equal(session.wavingExtras.length, 0);
  assert.equal(session.collected.size, 0);
  assert.equal(session.storyCheckpoint, null);
  session.dispose();
});

test("adventures replace the hero in the actor parent and retain their initial phase", async () => {
  const session = new WorldSession();
  const prepared = await prepareWorld("vineyard");
  session.build("vineyard", prepared, undefined, new Set());
  const original = session.avatar;
  session.startStories(prepared, {
    dialog: () => {},
    toast: () => {},
    complete: () => {},
    caught: () => {},
    viewAspect: () => 16 / 9,
  });
  assert.notEqual(session.avatar, original);
  assert.equal(original.group.parent, null);
  assert.equal(
    session.avatar.group.parent,
    session.world.actorParent ?? session.scene,
  );
  assert.equal(
    (session.adventure!.snapshot() as { phase: string }).phase,
    "learn",
  );
  session.dispose();
});
