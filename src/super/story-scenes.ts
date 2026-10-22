import * as T from "three";
import {
  createCharacter,
  type CharacterRole,
  type CharacterState,
} from "./character";
import type { PlayerState } from "./physics";
import { hasLineOfSight } from "./interactions";
import type { Point, Solid, WorldData } from "./worlds";

export type StorySceneId = "trade" | "night";
export type StoryPhase =
  "offer" | "flee" | "cave" | "laban" | "zoram" | "plates" | "escape" | "done";
export type StoryHooks = {
  dialog(
    kicker: string,
    title: string,
    body: string,
    onContinue: () => void,
  ): void;
  toast(text: string): void;
  complete(): void;
  checkpoint(point: Point): void;
  setMarker(point: Point): void;
  setDisguise(enabled: boolean): void;
  caught(): void;
};

type Actor = {
  rig: ReturnType<typeof createCharacter>;
  state: CharacterState;
  path: { x: number; z: number }[];
  routeTimer: number;
};

const distance = (a: { x: number; z: number }, b: { x: number; z: number }) =>
  Math.hypot(a.x - b.x, a.z - b.z);
const near = (
  a: { x: number; z: number },
  b: { x: number; z: number },
  radius: number,
) => distance(a, b) <= radius;
const copyPoint = (p: Point): Point => ({ x: p.x, y: p.y, z: p.z, yaw: p.yaw });

function blocked(
  x: number,
  z: number,
  solids: Solid[],
  radius = 0.39,
): boolean {
  return solids.some(
    (s) =>
      s.y < 1.65 &&
      s.y + s.h > 0.43 &&
      Math.abs(x - s.x) < s.w / 2 + radius &&
      Math.abs(z - s.z) < s.d / 2 + radius,
  );
}

// A bounded grid keeps actors on the same walkable streets and through the gate.
// The final short movement is checked against the exact collision boxes as well.
export function findStoryPath(
  start: { x: number; z: number },
  end: { x: number; z: number },
  world: Pick<WorldData, "solids" | "bounds">,
): { x: number; z: number }[] {
  const cell = 1.25;
  const b = world.bounds ?? { minX: -45, maxX: 45, minZ: -70, maxZ: 75 };
  const minX = Math.floor(b.minX / cell) * cell;
  const minZ = Math.floor(b.minZ / cell) * cell;
  const cols = Math.floor((b.maxX - minX) / cell) + 1;
  const rows = Math.floor((b.maxZ - minZ) / cell) + 1;
  if (cols * rows > 20000) return [];
  const valid = (i: number, j: number) =>
    i >= 0 &&
    j >= 0 &&
    i < cols &&
    j < rows &&
    !blocked(minX + i * cell, minZ + j * cell, world.solids);
  const node = (p: { x: number; z: number }) => ({
    i: Math.round((p.x - minX) / cell),
    j: Math.round((p.z - minZ) / cell),
  });
  const nearest = (p: { x: number; z: number }) => {
    const n = node(p);
    if (valid(n.i, n.j)) return n;
    for (let r = 1; r <= 7; r++)
      for (let di = -r; di <= r; di++)
        for (let dj = -r; dj <= r; dj++)
          if (
            Math.max(Math.abs(di), Math.abs(dj)) === r &&
            valid(n.i + di, n.j + dj)
          )
            return { i: n.i + di, j: n.j + dj };
    return undefined;
  };
  const first = nearest(start),
    last = nearest(end);
  if (!first || !last) return [];
  const key = (i: number, j: number) => j * cols + i;
  const target = key(last.i, last.j);
  const queue = [key(first.i, first.j)];
  const prior = new Int32Array(cols * rows).fill(-1);
  prior[queue[0]] = queue[0];
  for (let head = 0; head < queue.length && head < cols * rows; head++) {
    const current = queue[head];
    if (current === target) break;
    const i = current % cols,
      j = Math.floor(current / cols);
    for (const [di, dj] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const ni = i + di,
        nj = j + dj;
      if (!valid(ni, nj)) continue;
      const next = key(ni, nj);
      if (prior[next] !== -1) continue;
      prior[next] = current;
      queue.push(next);
    }
  }
  if (prior[target] === -1) return [];
  const path: { x: number; z: number }[] = [];
  for (let n = target; n !== prior[n]; n = prior[n])
    path.push({
      x: minX + (n % cols) * cell,
      z: minZ + Math.floor(n / cols) * cell,
    });
  return path.reverse();
}

function makeActor(scene: T.Scene, role: CharacterRole, point: Point): Actor {
  const rig = createCharacter(role);
  scene.add(rig.group);
  const state: CharacterState = {
    x: point.x,
    y: point.y,
    z: point.z,
    yaw: point.yaw ?? 0,
    vx: 0,
    vy: 0,
    vz: 0,
    grounded: true,
    runSpeed: 0,
    move: "idle",
  };
  rig.update(0, state);
  return { rig, state, path: [], routeTimer: 0 };
}

function stepActor(
  actor: Actor,
  target: { x: number; z: number },
  dt: number,
  speed: number,
  world: WorldData,
): void {
  actor.routeTimer -= dt;
  if (actor.routeTimer <= 0) {
    actor.routeTimer = 0.42;
    actor.path = findStoryPath(actor.state, target, world);
  }
  while (actor.path.length && near(actor.state, actor.path[0], 0.55))
    actor.path.shift();
  const waypoint =
    actor.path[0] ?? (near(actor.state, target, 1.8) ? target : undefined);
  let moved = 0;
  if (waypoint) {
    const dx = waypoint.x - actor.state.x,
      dz = waypoint.z - actor.state.z;
    const d = Math.hypot(dx, dz);
    if (d > 0.08) {
      const step = Math.min(d, speed * Math.min(dt, 0.1));
      const ux = dx / d,
        uz = dz / d;
      const nx = actor.state.x + ux * step,
        nz = actor.state.z + uz * step;
      if (!blocked(nx, nz, world.solids)) {
        actor.state.x = nx;
        actor.state.z = nz;
        moved = step / Math.max(dt, 0.001);
      } else actor.routeTimer = 0;
      actor.state.yaw = Math.atan2(ux, uz);
    }
  }
  actor.state.runSpeed = moved;
  actor.state.move = moved > 0.1 ? "run" : "idle";
  actor.rig.update(dt, actor.state);
}

function book(scene: T.Scene) {
  const group = new T.Group();
  const gold = new T.MeshStandardMaterial({
    color: 0xc7a458,
    metalness: 0.68,
    roughness: 0.3,
  });
  const dark = new T.MeshStandardMaterial({
    color: 0x665535,
    metalness: 0.3,
    roughness: 0.55,
  });
  const geometry = new T.BoxGeometry(0.6, 0.11, 0.48);
  for (let i = 0; i < 5; i++) {
    const plate = new T.Mesh(geometry, i === 0 || i === 4 ? gold : dark);
    plate.position.y = i * 0.07;
    group.add(plate);
  }
  group.visible = false;
  scene.add(group);
  return {
    group,
    dispose() {
      scene.remove(group);
      geometry.dispose();
      gold.dispose();
      dark.dispose();
    },
  };
}

// Each parcel is its own original low-poly arrangement of cloth, coins and vessels.
// Place it above and beside the forearms so the rear camera can see the cargo.
function treasureParcel(scene: T.Scene, variant: number) {
  const group = new T.Group();
  group.name = `family-treasure-${variant}`;
  const materials = [
    new T.MeshStandardMaterial({ color: 0xa74e37, roughness: 0.9 }),
    new T.MeshStandardMaterial({
      color: 0xf0c957,
      metalness: 0.65,
      roughness: 0.28,
    }),
    new T.MeshStandardMaterial({
      color: 0xdce5ef,
      metalness: 0.75,
      roughness: 0.25,
    }),
  ];
  const geometries: T.BufferGeometry[] = [];
  const add = (
    geometry: T.BufferGeometry,
    material: number,
    x: number,
    y: number,
    z: number,
  ) => {
    geometries.push(geometry);
    const mesh = new T.Mesh(geometry, materials[material]);
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  };
  add(new T.BoxGeometry(1.04, 0.19, 0.62), 0, 0, 0, 0);
  add(
    new T.CylinderGeometry(0.22, 0.13, 0.42, 7),
    1 + (variant % 2),
    -0.26,
    0.29,
    0,
  );
  add(
    new T.CylinderGeometry(0.19, 0.1, 0.3, 6),
    2 - (variant % 2),
    0.27,
    0.23,
    0.03,
  );
  for (let i = 0; i < 4; i++)
    add(
      new T.CylinderGeometry(0.12, 0.12, 0.045, 8),
      1,
      0.06,
      0.12 + i * 0.045,
      -0.17,
    );
  scene.add(group);
  return {
    group,
    carry(state: Pick<CharacterState, "x" | "y" | "z" | "yaw">) {
      const side = 0.22,
        forward = 0.78;
      group.position.set(
        state.x + Math.cos(state.yaw) * side + Math.sin(state.yaw) * forward,
        state.y + 1.22,
        state.z - Math.sin(state.yaw) * side + Math.cos(state.yaw) * forward,
      );
      group.rotation.y = state.yaw;
    },
    dispose() {
      scene.remove(group);
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
    },
  };
}

export function createStoryScene(
  id: StorySceneId,
  scene: T.Scene,
  world: WorldData,
  hooks: StoryHooks,
) {
  if (!world.story) throw new Error(`${id} requires story positions`);
  const story = world.story;
  const initial: StoryPhase = id === "trade" ? "offer" : "laban";
  let phase: StoryPhase = initial;
  let dialogueOpen = false;
  let passedGate = false;
  let guardGrace = 2.5;
  let catchPending = false;
  let checkpoint = copyPoint(world.spawn);
  let trail: { x: number; z: number }[] = [];
  const actors: Actor[] = [];
  const laban = makeActor(
    scene,
    id === "trade" ? "guard" : "laman",
    story.laban,
  );
  if (id === "night") {
    laban.state.y = 0.27;
    laban.rig.group.rotation.x = -Math.PI / 2;
  }
  actors.push(laban);
  const brothers =
    id === "trade"
      ? [
          makeActor(scene, "laman", {
            x: world.spawn.x - 2.0,
            y: 0,
            z: world.spawn.z + 2.6,
          }),
          makeActor(scene, "laman", {
            x: world.spawn.x + 2.0,
            y: 0,
            z: world.spawn.z + 2.6,
          }),
          makeActor(scene, "sam", {
            x: world.spawn.x,
            y: 0,
            z: world.spawn.z + 4.2,
          }),
        ]
      : [
          makeActor(scene, "laman", {
            x: story.brothers.x - 2,
            y: 0,
            z: story.brothers.z,
          }),
          makeActor(scene, "laman", {
            x: story.brothers.x + 2,
            y: 0,
            z: story.brothers.z,
          }),
          makeActor(scene, "sam", {
            x: story.brothers.x,
            y: 0,
            z: story.brothers.z + 2.4,
          }),
        ];
  actors.push(...brothers);
  const zoram =
    id === "night"
      ? makeActor(scene, "laman", story.treasury ?? story.plates ?? story.laban)
      : undefined;
  if (zoram) actors.push(zoram);
  const guardPoints = world.pursuers?.length
    ? world.pursuers
    : id === "trade"
      ? [
          { x: -7, y: 0, z: -9 },
          { x: 8, y: 0, z: -6 },
        ]
      : [
          { x: -8, y: 0, z: 5 },
          { x: 8, y: 0, z: 13 },
        ];
  const guards = guardPoints.map((p) => makeActor(scene, "guard", p));
  actors.push(...guards);
  const treasure =
    id === "trade"
      ? Array.from({ length: 4 }, (_, i) => treasureParcel(scene, i))
      : [];
  for (const brother of brothers) brother.state.carrying = id === "trade";
  // Initial NPC parcels are visible even before the first simulation frame.
  treasure.slice(1).forEach((parcel, i) => parcel.carry(brothers[i].state));
  if (treasure[0])
    treasure[0].carry({ ...world.spawn, yaw: world.spawn.yaw ?? 0 });
  const plates = book(scene);
  if (id === "night" && story.plates) {
    plates.group.position.set(
      story.plates.x,
      story.plates.y + 0.65,
      story.plates.z,
    );
    plates.group.visible = true;
  }
  const marker = () => {
    if (phase === "offer" || phase === "laban") hooks.setMarker(story.laban);
    else if (phase === "flee") hooks.setMarker(story.gate);
    else if (phase === "cave") hooks.setMarker(story.cave ?? story.brothers);
    else if (phase === "zoram")
      hooks.setMarker(story.treasury ?? story.plates ?? story.laban);
    else if (phase === "plates")
      hooks.setMarker(story.plates ?? story.treasury ?? story.laban);
    else if (phase === "escape")
      hooks.setMarker(passedGate ? story.brothers : story.gate);
  };
  const advance = (next: StoryPhase) => {
    phase = next;
    dialogueOpen = false;
    marker();
  };
  const speak = (
    kicker: string,
    title: string,
    body: string,
    action: () => void,
  ) => {
    dialogueOpen = true;
    hooks.dialog(kicker, title, body, () => {
      if (!dialogueOpen) return;
      action();
    });
  };
  marker();
  hooks.checkpoint(checkpoint);
  const crossedGate = (p: { x: number; z: number }) =>
    p.z > story.gate.z + 1 &&
    p.z < story.gate.z + 6 &&
    Math.abs(p.x - story.gate.x) < (id === "trade" ? 3.6 : 5.5);
  return {
    update(
      dt: number,
      player: PlayerState,
      input: { interact: boolean },
    ): { prompt: string; objective: string } {
      if (phase === "done")
        return { prompt: "", objective: "Journey complete" };
      const p = { x: player.x, z: player.z };
      const reachable = (target: Point, radius: number) =>
        near(p, target, radius) && hasLineOfSight(player, target, world.solids);
      if (id === "trade" && phase === "flee" && crossedGate(p)) {
        passedGate = true;
        advance("cave");
        checkpoint = copyPoint(story.gate);
        checkpoint.z += 4;
        hooks.checkpoint(checkpoint);
        hooks.toast("You and your brothers escaped the city. Reach the cave.");
      }
      if (
        id === "night" &&
        phase === "escape" &&
        crossedGate(p) &&
        !passedGate
      ) {
        passedGate = true;
        marker();
        hooks.toast("The city gate is behind you. Find your brothers outside.");
      }
      if (!dialogueOpen && input.interact) {
        if (phase === "offer" && reachable(story.laban, 3.4)) {
          speak(
            "1 Nephi 3:22–27",
            "Laban refuses",
            "The brothers offer their family's gold, silver, and precious things for the brass plates. Laban refuses and seizes their property. His servants pursue them.",
            () => {
              advance("flee");
              for (const brother of brothers) brother.state.carrying = false;
              treasure.forEach((parcel, i) => {
                parcel.group.position.set(
                  story.laban.x + (i - 1.5) * 0.95,
                  story.laban.y + 0.18,
                  story.laban.z + 1.1,
                );
                parcel.group.rotation.y = (i - 1.5) * 0.24;
              });
              guardGrace = 2.3;
              checkpoint = {
                x: story.laban.x,
                y: 0,
                z: story.laban.z + 5,
                yaw: 0,
              };
              hooks.checkpoint(checkpoint);
              hooks.toast(
                "Laban seized your treasure! His guards are pursuing you — escape!",
              );
            },
          );
        } else if (
          phase === "cave" &&
          near(p, story.cave ?? story.brothers, 5.5) &&
          brothers.every((a) => near(a.state, p, 9))
        ) {
          speak(
            "1 Nephi 3:27–4:3",
            "Courage to return",
            "The brothers hide in a cave. After their disappointment, an angel encourages them to return. Nephi reminds them that the Lord can prepare a way.",
            () => {
              advance("done");
              hooks.complete();
            },
          );
        } else if (phase === "laban" && reachable(story.laban, 3.4)) {
          speak(
            "1 Nephi 4:6–19",
            "A difficult account",
            "The scripture tells how Nephi, directed by the Spirit, slays Laban. He then puts on Laban’s garments.",
            () => {
              advance("zoram");
              hooks.setDisguise(true);
              checkpoint = {
                x: story.laban.x,
                y: 0,
                z: story.laban.z + 3,
                yaw: 0,
              };
              hooks.checkpoint(checkpoint);
              guardGrace = 2;
            },
          );
        } else if (phase === "zoram" && zoram && reachable(zoram.state, 3.2)) {
          speak(
            "1 Nephi 4:20–26",
            "Meet Zoram",
            "Wearing Laban's garments, Nephi asks Zoram, keeper of the treasury, to bring the brass plates. Zoram leads him to the records.",
            () => advance("plates"),
          );
        } else if (
          phase === "plates" &&
          story.plates &&
          reachable(story.plates, 2.8) &&
          (!zoram || near(zoram.state, story.plates, 4))
        ) {
          plates.group.visible = true;
          advance("escape");
          hooks.toast("You have the brass plates. Lead Zoram out of the city.");
        } else if (
          phase === "escape" &&
          passedGate &&
          near(p, story.brothers, 5.5) &&
          (!zoram || near(zoram.state, p, 9))
        ) {
          speak(
            "1 Nephi 4:27–38",
            "Together outside the city",
            "The brothers first mistake Nephi for Laban. He reveals himself and reassures Zoram. Zoram promises to join the family in the wilderness.",
            () => {
              advance("done");
              hooks.complete();
            },
          );
        }
      }
      if (
        id === "trade" &&
        (phase === "offer" || phase === "flee" || phase === "cave")
      ) {
        if (!trail.length || distance(trail[0], p) > 0.55)
          trail.unshift({ ...p });
        if (trail.length > 160) trail.length = 160;
        for (let i = 0; i < brothers.length; i++) {
          const spacing = 3 + i * 2.1;
          let pathLength = 0;
          const oldest = trail[trail.length - 1] ?? p;
          // Before enough breadcrumbs exist, extend the tail behind Nephi.
          // Distinct distances preserve the procession while waiting at spawn.
          let target = {
            x: oldest.x - Math.sin(player.yaw) * spacing,
            z: oldest.z - Math.cos(player.yaw) * spacing,
          };
          for (let k = 1; k < trail.length; k++) {
            pathLength += distance(trail[k - 1], trail[k]);
            if (pathLength >= spacing) {
              target = trail[k];
              break;
            }
            const remaining = spacing - pathLength;
            target = {
              x: oldest.x - Math.sin(player.yaw) * remaining,
              z: oldest.z - Math.cos(player.yaw) * remaining,
            };
          }
          stepActor(brothers[i], target, dt, 5.6, world);
        }
      } else if (zoram && phase === "plates" && story.plates)
        stepActor(zoram, story.plates, dt, 3.8, world);
      else if (zoram && phase === "escape")
        stepActor(zoram, { x: player.x, z: player.z }, dt, 5.0, world);
      if (phase === "offer") {
        treasure[0]?.carry(player);
        treasure
          .slice(1)
          .forEach((parcel, i) => parcel.carry(brothers[i].state));
      }
      guardGrace = Math.max(0, guardGrace - dt);
      const pursuit = id === "trade" && (phase === "flee" || phase === "cave");
      for (let i = 0; i < guards.length; i++) {
        const guard = guards[i];
        const active =
          (pursuit && (phase === "flee" || near(guard.state, p, 13))) ||
          (id === "night" &&
            phase === "laban" &&
            near(guard.state, p, 3.5) &&
            near(guardPoints[i], p, 6) &&
            hasLineOfSight(guard.state, player, world.solids));
        if (active) stepActor(guard, p, dt, id === "night" ? 2.2 : 4.5, world);
        else {
          guard.state.runSpeed = 0;
          guard.state.move = "idle";
          guard.rig.update(dt, guard.state);
        }
        if (
          active &&
          guardGrace <= 0 &&
          !catchPending &&
          Math.abs(player.y - guard.state.y) < 1.2 &&
          near(guard.state, p, 1.05) &&
          hasLineOfSight(guard.state, player, world.solids)
        ) {
          catchPending = true;
          hooks.caught();
        }
      }
      if (id === "night" && phase === "escape") {
        plates.group.position.set(
          player.x + Math.sin(player.yaw) * 0.65,
          player.y + 0.98,
          player.z + Math.cos(player.yaw) * 0.65,
        );
        plates.group.rotation.y = player.yaw;
      }
      laban.rig.update(dt, laban.state);
      if (id === "night") {
        for (const brother of brothers) {
          brother.state.wave =
            phase === "escape" && passedGate && near(p, story.brothers, 12);
          brother.rig.update(dt, brother.state);
        }
      }
      if (zoram && phase !== "escape") zoram.rig.update(dt, zoram.state);
      const objective: Record<StoryPhase, string> = {
        offer: "Offer your family's treasure to Laban",
        flee: "Escape through the city gate with your brothers",
        cave: "Lead your brothers to the cave",
        laban: "Find Laban in the night city",
        zoram: "Find Zoram at the treasury",
        plates: "Take the brass plates",
        escape: "Lead Zoram outside to your brothers",
        done: "Journey complete",
      };
      let prompt = "";
      if (phase === "offer" && reachable(story.laban, 3.4))
        prompt = "Speak with Laban";
      if (phase === "laban" && reachable(story.laban, 3.4))
        prompt = "Examine Laban";
      if (phase === "zoram" && zoram && reachable(zoram.state, 3.2))
        prompt = "Speak with Zoram";
      if (phase === "plates" && story.plates && reachable(story.plates, 2.8))
        prompt =
          !zoram || near(zoram.state, story.plates, 4)
            ? "Take the brass plates"
            : "Wait for Zoram";
      if (phase === "cave" && near(p, story.cave ?? story.brothers, 5.5))
        prompt = brothers.every((a) => near(a.state, p, 9))
          ? "Gather with your brothers"
          : "Wait for your brothers";
      if (phase === "escape" && passedGate && near(p, story.brothers, 5.5))
        prompt =
          !zoram || near(zoram.state, p, 9)
            ? "Rejoin your brothers"
            : "Wait for Zoram";
      return { prompt, objective: objective[phase] };
    },
    respawn(player: PlayerState): void {
      player.x = checkpoint.x;
      player.y = checkpoint.y;
      player.z = checkpoint.z;
      player.yaw = checkpoint.yaw ?? player.yaw;
      player.vx = player.vy = player.vz = 0;
      guardGrace = 3.5;
      catchPending = false;
      for (let i = 0; i < guards.length; i++) {
        guards[i].state.x = guardPoints[i].x;
        guards[i].state.z = guardPoints[i].z;
        guards[i].path = [];
        guards[i].routeTimer = 0;
      }
      if (id === "trade") {
        trail = [];
        for (let i = 0; i < brothers.length; i++) {
          brothers[i].state.x = checkpoint.x + (i - 1) * 2;
          brothers[i].state.z = checkpoint.z + 3.5;
          brothers[i].path = [];
          brothers[i].routeTimer = 0;
        }
      }
      if (zoram && phase === "escape") {
        zoram.state.x = checkpoint.x + 1.5;
        zoram.state.z = checkpoint.z + 2;
        zoram.path = [];
        zoram.routeTimer = 0;
      }
      marker();
    },
    snapshot(): object {
      return {
        id,
        phase,
        passedGate,
        treasureHeld: id === "trade" && phase === "offer",
        treasure: treasure.map((parcel) => ({
          x: parcel.group.position.x,
          y: parcel.group.position.y,
          z: parcel.group.position.z,
          yaw: parcel.group.rotation.y,
        })),
        guards: guards.map((guard) => ({
          x: guard.state.x,
          z: guard.state.z,
          speed: guard.state.runSpeed,
        })),
        checkpoint: copyPoint(checkpoint),
        plates: id === "night" && (phase === "escape" || phase === "done"),
        brothers: brothers.map((a) => ({ x: a.state.x, z: a.state.z })),
        zoram: zoram ? { x: zoram.state.x, z: zoram.state.z } : undefined,
      };
    },
    dispose(): void {
      for (const actor of actors) actor.rig.dispose();
      plates.dispose();
      treasure.forEach((parcel) => parcel.dispose());
    },
  };
}
