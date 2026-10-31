import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildMoriantonFlight, MORIANTON_POST_HINTS } from "./morianton-flight";
import { createPlayer, stepPlayer } from "../../physics/physics";
import { createCharacter } from "../../characters/character";
import { StoryCinematic, type StoryShot } from "../../camera/cinematic";

const idle = { x: 0, y: 0, interact: false, interactHeld: false };
function shotHarness() {
  const scene = new T.Scene(),
    world = buildMoriantonFlight(scene);
  const avatar = createCharacter("teancum");
  const player = createPlayer(world.spawn.x, world.spawn.y, world.spawn.z);
  let next: (() => void) | undefined,
    shot: StoryShot | undefined,
    complete = 0;
  const runtime = world.adventure!({
    setAvatar() {
      world.actorParent!.add(avatar.group);
      avatar.update(0, player);
    },
    toast() {},
    complete() {
      complete++;
    },
    dialog(_ref, _title, _body, advance, captured) {
      next = advance;
      shot = captured;
    },
  });
  const place = (x: number, z: number, interact = false) => {
    Object.assign(player, createPlayer(x, 0, z));
    avatar.update(0, player);
    runtime.update(1 / 60, player, { ...idle, interact });
  };
  const warning = () => place(3, -47, true);
  const advance = () => {
    assert.ok(next);
    next();
    next = undefined;
  };
  const win = () => {
    warning();
    advance();
    place(-8, 0);
    for (const p of MORIANTON_POST_HINTS) place(p.x, p.z, true);
    for (let i = 0; i < 260 && !runtime.movementLocked?.(); i++)
      runtime.update(1 / 60, player, idle);
    assert.ok(
      runtime.movementLocked?.(),
      "the win scene must be captured after a real hold",
    );
  };
  return {
    scene,
    world,
    avatar,
    player,
    runtime,
    place,
    warning,
    win,
    advance,
    get shot() {
      assert.ok(shot);
      return shot;
    },
    get completed() {
      return complete;
    },
    dispose() {
      runtime.dispose();
      avatar.dispose();
      world.dispose?.();
    },
  };
}

test("rope warning and victory cameras stay clear through entrance, watch and return on phone and desktop", () => {
  for (const encounter of ["warning", "win"] as const) {
    const h = shotHarness();
    h[encounter]();
    for (const aspect of [16 / 9, 390 / 844])
      for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
        const camera = new T.PerspectiveCamera(58, aspect, 0.08, 320);
        camera.position.set(
          h.player.x + Math.sin(angle) * 5,
          3.5,
          h.player.z + Math.cos(angle) * 5,
        );
        camera.lookAt(h.player.x, 1, h.player.z);
        const movie = new StoryCinematic(
          camera,
          {
            ...h.shot,
            actors: [
              { group: h.avatar.group, speaker: true },
              ...(h.shot.actors ?? []),
            ],
          },
          h.world.solids,
          h.scene,
        );
        let returned = false;
        for (let frame = 0; frame < 100; frame++) {
          if (frame === 65) assert.equal(movie.finish(), true);
          returned = movie.update(1 / 30) || returned;
          const state = movie.snapshot();
          assert.equal(
            state.clear,
            true,
            `${encounter}, aspect ${aspect}, heading ${angle}, frame ${frame}: camera intersects solid or opaque scenery`,
          );
          assert.equal(
            state.actorVisible,
            true,
            `${encounter}, aspect ${aspect}, heading ${angle}, frame ${frame}: player is obscured`,
          );
        }
        assert.equal(returned, true, "the camera returns to player control");
        movie.dispose();
      }
    h.dispose();
  }
});

test("rope story cameras recover safely from an initially embedded camera", () => {
  for (const encounter of ["warning", "win"] as const) {
    const h = shotHarness();
    h[encounter]();
    for (const aspect of [16 / 9, 390 / 844]) {
      const camera = new T.PerspectiveCamera(58, aspect, 0.08, 320);
      camera.position.set(7, 0.65, -21); // A physical opaque outcrop, never a valid camera seat.
      camera.lookAt(h.player.x, 1, h.player.z);
      const movie = new StoryCinematic(
        camera,
        {
          ...h.shot,
          actors: [
            { group: h.avatar.group, speaker: true },
            ...(h.shot.actors ?? []),
          ],
        },
        h.world.solids,
        h.scene,
      );
      for (let frame = 0; frame < 100; frame++) {
        if (frame === 65) movie.finish();
        movie.update(1 / 30);
        assert.equal(
          movie.snapshot().clear,
          true,
          `${encounter}, aspect ${aspect}, frame ${frame}: embedded camera recovery failed`,
        );
        assert.equal(movie.snapshot().actorVisible, true);
      }
      movie.dispose();
    }
    h.dispose();
  }
});

test("disposing either pending rope encounter prevents late callbacks from advancing or completing", () => {
  for (const encounter of ["warning", "win"] as const)
    for (const disposeWorld of [false, true]) {
      const h = shotHarness();
      h[encounter]();
      assert.equal(h.runtime.movementLocked?.(), true);
      const camera = new T.PerspectiveCamera(58, 16 / 9, 0.08, 320);
      camera.position.set(h.player.x, 3.5, h.player.z + 5);
      camera.lookAt(h.player.x, 1, h.player.z);
      const originalPosition = h.avatar.group.position.clone();
      const originalRotation = h.avatar.group.quaternion.clone();
      const movie = new StoryCinematic(
        camera,
        {
          ...h.shot,
          actors: [
            { group: h.avatar.group, speaker: true },
            ...(h.shot.actors ?? []),
          ],
        },
        h.world.solids,
        h.scene,
      );
      for (let frame = 0; frame < 20; frame++) movie.update(1 / 30);
      if (disposeWorld) h.world.dispose?.();
      else h.runtime.dispose();
      const before = structuredClone(h.runtime.snapshot());
      h.advance();
      h.runtime.update(0.1, h.player, { ...idle, interact: true });
      assert.deepEqual(h.runtime.snapshot(), before);
      assert.equal(h.completed, 0);
      movie.dispose();
      assert.ok(h.avatar.group.position.distanceTo(originalPosition) < 1e-8);
      assert.ok(h.avatar.group.quaternion.angleTo(originalRotation) < 1e-7);
      h.dispose();
    }
});

test("pass outcrops block walking, allow a walk around, and support a landing", () => {
  const scene = new T.Scene(),
    world = buildMoriantonFlight(scene);
  const p = createPlayer(7, 0, -28);
  const step = (x: number, z: number, n: number) => {
    for (let i = 0; i < n; i++)
      stepPlayer(
        p,
        { x: -x, y: z, jump: false, jumpHeld: false },
        1 / 60,
        0,
        world.solids,
      );
  };
  step(0, 1, 150);
  assert.ok(p.z < -24.2, `walked through solid outcrop to ${p.z}`);
  step(-1, 0, 45);
  step(0, 1, 110);
  assert.ok(p.z > -19, `route around outcrop blocked at ${p.x},${p.z}`);
  const landing = createPlayer(7, 4, -21);
  for (let i = 0; i < 150; i++)
    stepPlayer(
      landing,
      { x: 0, y: 0, jump: false, jumpHeld: false },
      1 / 60,
      0,
      world.solids,
    );
  assert.equal(landing.grounded, true);
  assert.ok(
    Math.abs(landing.y - 1.2) < 0.001,
    `landing height ${landing.y} differs from visible outcrop top`,
  );
  world.dispose?.();
});
