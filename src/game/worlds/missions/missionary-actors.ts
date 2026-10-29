import * as T from "three";
import { createCharacter } from "../../characters/character";
import { createPlayer } from "../../physics/physics";
import type { PlayerState, Solid } from "../../physics/physics";
import { markScenery } from "../shared/scenery";
/** Contemporary visitors use the same sculpted human cast and locomotion rig. */
export function missionaryActor(parent: T.Group, elder = true, variant = 0) {
  const rig = createCharacter("missionary", { quality: "npc" });
  const group = rig.group;
  group.name = elder ? "Latter-day Saint elder" : "Jehovah’s Witness visitor";
  parent.add(group);
  group.traverse((o) => {
    if (o instanceof T.Mesh) {
      markScenery(o, {
        kind: "decoration",
        reason: "Moving visitor character; architecture owns fixed collision.",
      });
      if (!elder && o.name === "missionary-name-tag") o.visible = false;
      if (!elder && o.name === "continuous-robe-and-sleeves")
        for (const mat of Array.isArray(o.material) ? o.material : [o.material])
          (mat as T.MeshStandardMaterial).color.setHex(0xc5d5e5);
      if (variant && o.name === "single-sculpted-hair-cap")
        for (const mat of Array.isArray(o.material) ? o.material : [o.material])
          (mat as T.MeshStandardMaterial).color.setHex(0x6b513a);
    }
  });
  let previous = 0;
  return {
    group,
    dispose: rig.dispose,
    update(time: number, moving = true) {
      const dt = Math.max(0, time - previous);
      previous = time;
      rig.update(dt, {
        ...createPlayer(group.position.x, group.position.y, group.position.z),
        yaw: group.rotation.y,
        runSpeed: moving ? 1.1 : 0,
        vx: moving ? Math.sin(group.rotation.y) * 1.1 : 0,
        vz: moving ? Math.cos(group.rotation.y) * 1.1 : 0,
        grounded: true,
        move: moving ? "run" : "idle",
      });
    },
  };
}
export function buildWanderingElders(parent: T.Group, solids: Solid[]) {
  const actors = [
    missionaryActor(parent, true, 0),
    missionaryActor(parent, true, 1),
  ];
  // Both ends of the second-to-third-floor stair have wide landings.
  // A long upper-floor promenade precedes the occasional lower-floor visit.
  const route = [
    { x: 30, y: 24, z: 29 },
    { x: 46, y: 24, z: 29 },
    { x: 30, y: 24, z: 29 },
    { x: 46, y: 24, z: 29 },
    { x: 46, y: 24, z: 43 },
    { x: 56, y: 24, z: 43 },
    { x: 56, y: 24, z: 40 },
    { x: 56, y: 12, z: 0 },
    { x: 46, y: 12, z: 0 },
    { x: 46, y: 12, z: 29 },
    { x: 30, y: 12, z: 29 },
    { x: 46, y: 12, z: 29 },
    { x: 46, y: 12, z: 0 },
    { x: 56, y: 12, z: 0 },
    { x: 56, y: 24, z: 40 },
    { x: 56, y: 24, z: 43 },
    { x: 46, y: 24, z: 43 },
    { x: 46, y: 24, z: 29 },
  ];
  const point = { ...route[0] };
  let time = 0,
    index = 1,
    yaw = Math.PI / 2;
  const bodies = actors.map(() => ({
    x: 0,
    y: 24,
    z: 0,
    w: 0.65,
    h: 2.08,
    d: 0.65,
  }));
  solids.push(...bodies);
  return {
    dispose: () => actors.forEach((actor) => actor.dispose()),
    point,
    update(dt: number, player?: PlayerState) {
      const target = route[index],
        dx = target.x - point.x,
        dy = target.y - point.y,
        dz = target.z - point.z,
        d = Math.hypot(dx, dy, dz),
        step = Math.min(d, dt * 0.85);
      const next = {
        x: point.x + (d ? (dx / d) * step : 0),
        y: point.y + (d ? (dy / d) * step : 0),
        z: point.z + (d ? (dz / d) * step : 0),
      };
      if (Math.abs(next.x - 56) < 0.01 && next.z > 0 && next.z < 40)
        next.y = 12 + 0.3 * (Math.floor(next.z) + 1);
      const nextYaw = Math.hypot(dx, dz) > 0.01 ? Math.atan2(dx, dz) : yaw;
      const locations = actors.map((_, i) => {
        const offset = i ? 0.65 : -0.65;
        return {
          x: next.x + Math.cos(nextYaw) * offset,
          y: next.y,
          z: next.z - Math.sin(nextYaw) * offset,
        };
      });
      const blocked = locations.some(
        (p) =>
          (player &&
            Math.abs(player.y - p.y) < 2.2 &&
            Math.hypot(player.x - p.x, player.z - p.z) < 1.05) ||
          solids.some(
            (s) =>
              !bodies.includes(s) &&
              s.y + s.h > p.y + 0.65 &&
              s.y < p.y + 2 &&
              Math.abs(s.x - p.x) < s.w / 2 + 0.3 &&
              Math.abs(s.z - p.z) < s.d / 2 + 0.3,
          ),
      );
      if (!blocked) {
        Object.assign(point, next);
        yaw = nextYaw;
        time += dt;
        if (Math.hypot(target.x - point.x, target.z - point.z) < 0.025) {
          Object.assign(point, target);
          index = (index + 1) % route.length;
        }
      }
      actors.forEach((actor, i) => {
        const offset = i ? 0.65 : -0.65;
        const x = point.x + Math.cos(yaw) * offset,
          z = point.z - Math.sin(yaw) * offset;
        actor.group.position.set(x, point.y, z);
        actor.group.rotation.y = yaw;
        Object.assign(bodies[i], { x, y: point.y, z });
        actor.update(time, !blocked);
      });
    },
  };
}
