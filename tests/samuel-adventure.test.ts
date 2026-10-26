import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createPlayer } from "../src/super/physics";
import { createSamuelAdventure } from "../src/super/samuel-adventure";
import { SAMUEL_EXIT, SAMUEL_WALL } from "../src/super/samuel-layout";
import { applyAdventureCamera } from "../src/super/adventure-camera";
import { cameraSegmentClear } from "../src/super/camera";
import type { createCharacter } from "../src/super/character";

const idle = { interact: false, interactHeld: false, x: 0, y: 0 };
function harness() {
  const root = new T.Group();
  const makeMember = (
    x: number,
    z: number,
    believer: boolean,
    archer: boolean,
  ) => {
    const group = new T.Group();
    group.position.set(x, 0, z);
    root.add(group);
    return {
      rig: {
        group,
        update(_dt: number, state: { x: number; y: number; z: number }) {
          group.position.set(state.x, state.y, state.z);
        },
        dispose() {},
      } as ReturnType<typeof createCharacter>,
      point: { x, y: 0, z },
      believer,
      archer,
    };
  };
  const audience = [
    makeMember(-9, -14, false, false),
    makeMember(8, -16, false, true),
    makeMember(-4, -12, true, false),
    makeMember(3, -13, true, false),
  ];
  const dialogs: Array<() => void> = [];
  const dialogBodies: string[] = [];
  const toasts: string[] = [];
  const avatars: string[] = [];
  let completions = 0;
  const runtime = createSamuelAdventure(
    { root, audience, solids: [] },
    {
      setAvatar: (role) => avatars.push(role),
      toast: (message) => toasts.push(message),
      complete: () => completions++,
      dialog: (_ref, _title, body, next) => {
        dialogBodies.push(body);
        dialogs.push(next);
      },
    },
  );
  const player = createPlayer(-10, SAMUEL_WALL.top, 0);
  player.grounded = true;
  const state = () =>
    runtime.snapshot() as {
      phase: string;
      pending: boolean;
      elapsed: number;
      remaining: number;
      shots: number;
      protectedShots: number;
      returnedToWall: number;
      descended: boolean;
      believersDeparted: number;
      projectiles: {
        phase: string;
        kind: string;
        x: number;
        y: number;
        z: number;
        target: number[];
        warning: boolean;
      }[];
    };
  const begin = () => {
    runtime.update(0.1, player, { ...idle, interact: true });
    assert.equal(dialogs.length, 1);
    dialogs[0]();
    assert.equal(state().phase, "endure");
  };
  return {
    root,
    audience,
    dialogs,
    dialogBodies,
    toasts,
    avatars,
    runtime,
    player,
    state,
    begin,
    completed: () => completions,
  };
}

test("the preaching minute begins after the acted moment and completes at 60 active seconds", () => {
  const h = harness();
  assert.deepEqual(h.avatars, ["samuel"]);
  const ready = h.runtime.update(0.1, h.player, idle);
  assert.equal(ready.prompt, "{action} · Call the city to repentance");
  h.runtime.update(0.1, h.player, { ...idle, interact: true });
  assert.match(h.dialogBodies[0], /repent.*faith in Jesus Christ/i);
  assert.equal(h.state().phase, "preaching");
  assert.equal(h.state().pending, true);
  assert.equal(h.runtime.movementLocked?.(), true);
  for (let i = 0; i < 300; i++) h.runtime.update(0.1, h.player, idle);
  assert.equal(h.state().elapsed, 0);
  h.dialogs[0]();
  assert.equal(h.runtime.movementLocked?.(), false);

  for (let i = 0; i < 599; i++) h.runtime.update(0.1, h.player, idle);
  assert.equal(h.state().phase, "endure");
  assert.ok(h.state().elapsed > 59.8 && h.state().elapsed < 60);
  assert.equal(h.completed(), 0);
  h.runtime.update(0.1, h.player, idle);
  assert.equal(h.state().elapsed, 60);
  assert.equal(h.state().remaining, 0);
  assert.equal(h.state().phase, "escape");
  assert.equal(h.completed(), 0);
  assert.equal(h.state().believersDeparted, 2);
  assert.ok(
    h.audience[2].rig.group.position.distanceTo(new T.Vector3(-4, 0, -12)) > 1,
  );
  assert.ok(h.toasts.some((text) => text.includes("Nephi")));
  h.runtime.dispose();
});

test("early falls return Samuel to the wall without changing the active minute", () => {
  const h = harness();
  h.begin();
  for (let i = 0; i < 27; i++) h.runtime.update(0.1, h.player, idle);
  const before = h.state().elapsed;
  h.player.y = 0;
  h.player.z = 9;
  h.player.grounded = true;
  h.runtime.update(0.1, h.player, idle);
  assert.equal(h.state().elapsed, before);
  assert.equal(h.state().phase, "endure");
  assert.equal(h.state().returnedToWall, 1);
  assert.equal(h.player.y, SAMUEL_WALL.top);
  assert.equal(h.player.z, 0);
  assert.equal(h.completed(), 0);
  h.runtime.dispose();
});

test("the active minute advances at both physically supported wall edges", () => {
  const h = harness();
  h.begin();
  h.player.x = SAMUEL_WALL.x + SAMUEL_WALL.w / 2 - 0.2;
  h.runtime.update(0.1, h.player, idle);
  assert.equal(h.state().phase, "endure");
  assert.equal(h.state().elapsed, 0.1);
  h.player.x = SAMUEL_WALL.x - SAMUEL_WALL.w / 2 + 0.2;
  h.runtime.update(0.1, h.player, idle);
  assert.equal(h.state().phase, "endure");
  assert.equal(h.state().elapsed, 0.2);
  h.runtime.dispose();
});

test("warnings lock an avoidable target; stones and arrows arc visibly and cause protection only", () => {
  const h = harness();
  h.begin();
  for (let i = 0; i < 35; i++) h.runtime.update(0.1, h.player, idle);
  let warning = h.state().projectiles.find((shot) => shot.phase === "warning");
  assert.ok(warning);
  assert.equal(warning.kind, "stone");
  assert.equal(warning.warning, true);
  const locked = warning.target;
  h.player.x = 14;
  for (let i = 0; i < 11; i++) h.runtime.update(0.1, h.player, idle);
  const flying = h.state().projectiles.find((shot) => shot.phase === "flying");
  assert.ok(flying);
  assert.deepEqual(flying.target, locked, "flight does not track Samuel");
  assert.ok(flying.y > 1.5 && flying.y < 14, "visible ballistic arc");
  h.player.x = locked[0];
  for (let i = 0; i < 180; i++) h.runtime.update(0.1, h.player, idle);
  assert.ok(h.state().shots >= 2);
  assert.ok(h.state().projectiles.some((shot) => shot.kind === "arrow"));
  assert.ok(h.state().protectedShots >= 1);
  assert.equal(h.state().phase, "endure");
  assert.equal(h.completed(), 0);
  h.runtime.dispose();
});

test("a post-minute landing anywhere outside the wall completes once", () => {
  const h = harness();
  h.begin();
  for (let i = 0; i < 600; i++) h.runtime.update(0.1, h.player, idle);
  assert.equal(h.state().phase, "escape");
  Object.assign(h.player, {
    x: SAMUEL_EXIT.x,
    y: 0,
    z: SAMUEL_EXIT.z,
    grounded: true,
  });
  h.runtime.update(0.1, h.player, idle);
  assert.equal(h.completed(), 0, "a ground teleport is not a descent");
  h.player.z = -10;
  h.player.y = 5;
  h.player.grounded = false;
  h.runtime.update(0.1, h.player, idle);
  assert.equal(h.state().descended, false, "the descent must face outside");
  h.player.x = -15;
  h.player.z = SAMUEL_WALL.d / 2 + 4;
  h.player.y = 5;
  h.player.grounded = false;
  h.runtime.update(0.1, h.player, idle);
  assert.equal(h.state().descended, true);
  h.player.y = 0;
  h.player.grounded = true;
  h.runtime.update(0.1, h.player, idle);
  assert.equal(h.state().phase, "done");
  assert.equal(h.completed(), 1);
  for (let i = 0; i < 8; i++) h.runtime.update(0.1, h.player, idle);
  assert.equal(h.completed(), 1);
  h.runtime.dispose();
});

test("the authored wall camera sees Samuel and the nearby crowd over solid stone", () => {
  const h = harness();
  assert.equal(
    h.runtime.camera?.(),
    undefined,
    "no authored view while climbing",
  );
  h.runtime.update(0.1, h.player, idle);
  const shot = h.runtime.camera?.();
  assert.ok(shot);
  const wall = [
    {
      x: SAMUEL_WALL.x,
      y: 0,
      z: SAMUEL_WALL.z,
      w: SAMUEL_WALL.w,
      h: SAMUEL_WALL.top,
      d: SAMUEL_WALL.d,
    },
  ];
  const eye = new T.Vector3(shot.position.x, shot.position.y, shot.position.z);
  const playerChest = new T.Vector3(h.player.x, h.player.y + 1, h.player.z);
  const nearCrowd = new T.Vector3(-9, 1.5, -14);
  assert.ok(cameraSegmentClear(eye, eye, wall, 0.2));
  assert.ok(cameraSegmentClear(eye, playerChest, wall, 0.2));
  assert.ok(cameraSegmentClear(eye, nearCrowd, wall, 0.2));
  for (const aspect of [16 / 9, 390 / 844]) {
    const camera = new T.PerspectiveCamera(58, aspect, 0.08, 320);
    camera.position.set(0, 3, 0); // Start embedded in stone, as can happen on recovery.
    for (let i = 0; i < 80; i++)
      applyAdventureCamera(camera, shot, wall, 1 / 60);
    assert.ok(cameraSegmentClear(camera.position, camera.position, wall, 0.2));
    camera.updateMatrixWorld();
    for (const point of [playerChest, nearCrowd]) {
      const projected = point.clone().project(camera);
      assert.ok(Math.abs(projected.x) < 0.95, "subject within frame width");
      assert.ok(Math.abs(projected.y) < 0.95, "subject within frame height");
      assert.ok(projected.z > -1 && projected.z < 1);
    }
  }
  h.player.z = 8;
  h.player.y = SAMUEL_WALL.top - 1;
  h.player.grounded = false;
  h.runtime.update(0.1, h.player, idle);
  assert.equal(
    h.runtime.camera?.(),
    undefined,
    "the follow view returns off wall",
  );
  h.runtime.dispose();
});

test("runtime disposal frees each owned visual and is idempotent", () => {
  const h = harness();
  const owned = h.root.children.filter((object) =>
    /Samuel protected projectile|Samuel projectile warning|Samuel protection flash/.test(
      object.name,
    ),
  );
  assert.equal(owned.length, 5);
  let geometries = 0;
  owned.forEach((object) =>
    object.traverse((part) => {
      if (part instanceof T.Mesh)
        part.geometry.addEventListener("dispose", () => geometries++);
    }),
  );
  h.runtime.dispose();
  h.runtime.dispose();
  assert.equal(geometries, 9);
  assert.ok(owned.every((object) => !object.parent));
  h.runtime.update(0.1, h.player, idle);
  assert.equal(h.completed(), 0);
});
