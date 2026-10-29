import * as T from "three";
import type { AdventureHooks, AdventureRuntime } from "../../runtime/adventure";
import type { PlayerState, Solid } from "../../physics/physics";
import { createPlayer } from "../../physics/physics";
import type { Point } from "../../runtime/worlds";
import type { createCharacter } from "../../characters/character";
import { SAMUEL_WALL } from "./samuel-layout";

/** Helaman 13:2–6; 16:1–8. Crowd positions, projectiles and Samuel's words are staged. */
export type SamuelAudienceMember = {
  rig: ReturnType<typeof createCharacter>;
  point: Point;
  believer: boolean;
  archer: boolean;
};

export type SamuelAdventureScene = {
  root: T.Group;
  audience: SamuelAudienceMember[];
  solids: Solid[];
};

type Projectile = {
  group: T.Group;
  stone: T.Mesh;
  arrow: T.Group;
  warning: T.Mesh;
  phase: "idle" | "warning" | "flying";
  kind: "stone" | "arrow";
  age: number;
  from: T.Vector3;
  to: T.Vector3;
};

const PREACH_SECONDS = 30;
const WARNING_SECONDS = 1.1;
const FLIGHT_SECONDS = 1.8;
const SHOT_GAP_SECONDS = 3.4;
const UP = new T.Vector3(0, 1, 0);

function onWall(player: PlayerState): boolean {
  return (
    player.y >= SAMUEL_WALL.top - 0.85 &&
    Math.abs(player.x - SAMUEL_WALL.x) <= SAMUEL_WALL.w / 2 + 0.32 &&
    Math.abs(player.z - SAMUEL_WALL.z) <= SAMUEL_WALL.d / 2 + 0.32
  );
}

function projectilePosition(shot: Projectile, progress: number): T.Vector3 {
  const p = shot.from.clone().lerp(shot.to, progress);
  const gravity = shot.kind === "stone" ? 8 : 3.5;
  const t = progress * FLIGHT_SECONDS;
  // A visible ballistic arc with its endpoint fixed when the warning begins.
  p.y += (gravity * t * (FLIGHT_SECONDS - t)) / 2;
  return p;
}

function makeProjectile(root: T.Group, index: number): Projectile {
  const group = new T.Group();
  group.name = `Samuel protected projectile ${index + 1}`;
  const stone = new T.Mesh(
    new T.IcosahedronGeometry(0.18, 1),
    new T.MeshStandardMaterial({ color: 0xc7856e, roughness: 0.8 }),
  );
  stone.castShadow = true;
  group.add(stone);
  const arrow = new T.Group();
  const shaft = new T.Mesh(
    new T.CylinderGeometry(0.035, 0.035, 0.9, 5),
    new T.MeshStandardMaterial({ color: 0x806554, roughness: 0.85 }),
  );
  const tip = new T.Mesh(
    new T.ConeGeometry(0.09, 0.21, 5),
    new T.MeshStandardMaterial({ color: 0xb8cad0, metalness: 0.25 }),
  );
  tip.position.y = 0.54;
  arrow.add(shaft, tip);
  group.add(arrow);
  group.visible = false;
  root.add(group);

  const warning = new T.Mesh(
    new T.RingGeometry(0.55, 0.7, 28),
    new T.MeshBasicMaterial({
      color: 0x5fd4e2,
      transparent: true,
      opacity: 0.6,
      side: T.DoubleSide,
      depthWrite: false,
    }),
  );
  warning.name = `Samuel projectile warning ${index + 1}`;
  warning.rotation.x = -Math.PI / 2;
  warning.visible = false;
  root.add(warning);
  return {
    group,
    stone,
    arrow,
    warning,
    phase: "idle",
    kind: "stone",
    age: 0,
    from: new T.Vector3(),
    to: new T.Vector3(),
  };
}

function squaredDistanceToSegment(
  point: T.Vector3,
  start: T.Vector3,
  end: T.Vector3,
): number {
  const line = end.clone().sub(start);
  const t = T.MathUtils.clamp(
    point.clone().sub(start).dot(line) / Math.max(1e-8, line.lengthSq()),
    0,
    1,
  );
  return point.distanceToSquared(start.addScaledVector(line, t));
}

export function createSamuelAdventure(
  scene: SamuelAdventureScene,
  hooks: AdventureHooks,
): AdventureRuntime {
  const { root, audience } = scene;
  hooks.setAvatar("samuel");
  hooks.toast(
    "Helaman 13 · Climb the outside ledges. On the wall, press action to call the city to repentance.",
  );

  const projectiles = [makeProjectile(root, 0), makeProjectile(root, 1)];
  const shield = new T.Mesh(
    new T.SphereGeometry(0.92, 18, 12),
    new T.MeshBasicMaterial({
      color: 0x8deaf2,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: T.DoubleSide,
    }),
  );
  shield.name = "Samuel protection flash";
  shield.visible = false;
  root.add(shield);

  let phase: "climb" | "preaching" | "endure" | "escape" | "done" = "climb";
  let pending = false;
  let elapsed = 0;
  let shotClock = 0;
  let shotIndex = 0;
  let shots = 0;
  let protectedShots = 0;
  let flashTime = 0;
  let leftWall = false;
  let descended = false;
  let completed = false;
  let disposed = false;
  let returnedToWall = 0;
  let lastPlayer: PlayerState | undefined;
  const crowd = audience.map((member) => ({
    ...member,
    x: member.point.x,
    z: member.point.z,
    departed: false,
  }));
  const throwers = crowd.filter((member) => !member.believer);

  function clearProjectile(shot: Projectile) {
    shot.phase = "idle";
    shot.age = 0;
    shot.group.visible = false;
    shot.warning.visible = false;
  }

  function resetOnWall(player: PlayerState) {
    const checkpointX = T.MathUtils.clamp(
      player.x,
      SAMUEL_WALL.x - SAMUEL_WALL.w / 2 + 2,
      SAMUEL_WALL.x + SAMUEL_WALL.w / 2 - 2,
    );
    Object.assign(player, createPlayer(checkpointX, SAMUEL_WALL.top, 0));
    player.grounded = true;
    player.coyoteTime = 0.11;
    player.yaw = Math.PI;
    returnedToWall++;
    hooks.toast(
      "Samuel must remain on the wall until his message is finished. Try again from this safe ledge.",
    );
  }

  function updateCrowd(dt: number) {
    crowd.forEach((member, index) => {
      if (member.believer && elapsed >= 5 + index * 1.5) member.departed = true;
      if (member.departed) {
        const dx = 20 - member.x;
        const dz = -26 - member.z;
        const distance = Math.hypot(dx, dz);
        const step = Math.min(distance, dt * 2.4);
        if (distance > 0.03) {
          member.x += (dx / distance) * step;
          member.z += (dz / distance) * step;
        }
        if (distance < 0.4) member.rig.group.visible = false;
      }
      const moving = member.departed && member.rig.group.visible;
      member.rig.update(dt, {
        ...createPlayer(member.x, member.point.y, member.z),
        yaw: moving
          ? Math.atan2(20 - member.x, -26 - member.z)
          : Math.atan2(SAMUEL_WALL.x - member.x, SAMUEL_WALL.z - member.z),
        vx: moving ? 1 : 0,
        vz: moving ? -1 : 0,
        runSpeed: moving ? 2.4 : 0,
        move: moving ? "run" : "idle",
        pointing: !member.believer && shots > 0 && shots % 2 === index % 2,
      });
    });
  }

  function startWarning(player: PlayerState) {
    if (!throwers.length) return;
    const shot = projectiles.find((candidate) => candidate.phase === "idle");
    if (!shot) return;
    const sender = throwers[shotIndex % throwers.length];
    shotIndex++;
    shot.kind = sender.archer ? "arrow" : "stone";
    shot.from.set(sender.x, sender.point.y + 1.5, sender.z);
    shot.to.set(
      T.MathUtils.clamp(
        player.x,
        SAMUEL_WALL.x - SAMUEL_WALL.w / 2 + 1,
        SAMUEL_WALL.x + SAMUEL_WALL.w / 2 - 1,
      ),
      SAMUEL_WALL.top + 1.05,
      T.MathUtils.clamp(player.z, -0.75, 0.75),
    );
    shot.phase = "warning";
    shot.age = 0;
    shot.warning.position.set(shot.to.x, SAMUEL_WALL.top + 0.04, shot.to.z);
    shot.warning.visible = true;
    shot.group.visible = false;
    shots++;
  }

  function updateProjectiles(dt: number, player: PlayerState) {
    const chest = new T.Vector3(player.x, player.y + 0.95, player.z);
    projectiles.forEach((shot) => {
      if (shot.phase === "idle") return;
      let before = shot.age;
      shot.age += dt;
      if (shot.phase === "warning") {
        const scale = 1 + 0.13 * Math.sin(shot.age * 10);
        shot.warning.scale.setScalar(scale);
        if (shot.age < WARNING_SECONDS) return;
        shot.phase = "flying";
        shot.age -= WARNING_SECONDS;
        before = 0;
        shot.warning.visible = false;
        shot.group.visible = true;
        shot.stone.visible = shot.kind === "stone";
        shot.arrow.visible = shot.kind === "arrow";
      }
      const previous = projectilePosition(
        shot,
        T.MathUtils.clamp(before / FLIGHT_SECONDS, 0, 1),
      );
      const current = projectilePosition(
        shot,
        T.MathUtils.clamp(shot.age / FLIGHT_SECONDS, 0, 1),
      );
      shot.group.position.copy(current);
      const velocity = current.clone().sub(previous);
      if (velocity.lengthSq() > 1e-6)
        shot.arrow.quaternion.setFromUnitVectors(UP, velocity.normalize());
      if (squaredDistanceToSegment(chest, previous, current) < 0.88 * 0.88) {
        protectedShots++;
        flashTime = 0.45;
        shield.position.copy(chest);
        clearProjectile(shot);
      } else if (shot.age >= FLIGHT_SECONDS) {
        clearProjectile(shot);
      }
    });
    if (flashTime > 0) {
      flashTime = Math.max(0, flashTime - dt);
      shield.visible = flashTime > 0;
      shield.scale.setScalar(1 + (0.45 - flashTime) * 1.1);
      (shield.material as T.MeshBasicMaterial).opacity = flashTime * 0.55;
    } else shield.visible = false;
  }

  return {
    movementLocked: () => pending,
    camera: () => {
      if (
        disposed ||
        !lastPlayer ||
        phase === "climb" ||
        phase === "done" ||
        !onWall(lastPlayer)
      )
        return undefined;
      return {
        position: {
          x: lastPlayer.x,
          y: SAMUEL_WALL.top + 12,
          z: SAMUEL_WALL.z + 10,
        },
        focus: {
          x: lastPlayer.x,
          y: SAMUEL_WALL.top - 1,
          z: SAMUEL_WALL.z - 4,
        },
      };
    },
    snapshot: () => ({
      phase,
      pending,
      elapsed,
      remaining: Math.max(0, PREACH_SECONDS - elapsed),
      shots,
      protectedShots,
      returnedToWall,
      descended,
      believersDeparted: crowd.filter((member) => member.departed).length,
      projectiles: projectiles.map((shot) => ({
        phase: shot.phase,
        kind: shot.kind,
        x: shot.group.position.x,
        y: shot.group.position.y,
        z: shot.group.position.z,
        target: shot.to.toArray(),
        warning: shot.warning.visible,
      })),
    }),
    update(rawDt, player, input) {
      if (disposed) return { objective: "", prompt: "" };
      lastPlayer = player;
      const dt = T.MathUtils.clamp(rawDt, 0, 0.1);
      if (phase === "done")
        return { objective: "Samuel has departed", prompt: "Journey complete" };
      if (phase === "climb") {
        if (
          onWall(player) &&
          player.grounded &&
          Math.abs(player.y - SAMUEL_WALL.top) < 0.45
        )
          phase = "preaching";
        else
          return {
            objective: "Climb the outside ledges to the top of the city wall",
            prompt: "Jump and climb toward the wall",
          };
      }
      if (phase === "preaching") {
        if (!onWall(player)) {
          if (player.y < SAMUEL_WALL.top - 1.5) resetOnWall(player);
          return {
            objective: "Stand on the wall and call the city to repentance",
            prompt: "Return to the wall top",
          };
        }
        if (input.interact && !pending) {
          pending = true;
          hooks.dialog(
            "Helaman 13:2–6",
            "Samuel speaks from the wall",
            "The Lord has put this message in my heart: repent of pride and cruelty, and have faith in Jesus Christ, who shall come.",
            () => {
              if (disposed || !pending) return;
              pending = false;
              phase = "endure";
              shotClock = 0;
              hooks.toast(
                "Some listen and go to Nephi. Others throw stones and arrows, but Samuel is protected. Keep moving and watch each marked lane.",
              );
            },
            {
              focus: { x: player.x, y: SAMUEL_WALL.top + 1.25, z: 0 },
              wide: 6.5,
              playerGesture: "point",
            },
          );
        }
        return {
          objective: "Call the city to repentance from the wall",
          prompt: pending
            ? "Samuel speaks"
            : "{action} · Call the city to repentance",
        };
      }
      if (phase === "endure") {
        if (!onWall(player)) {
          if (player.y < SAMUEL_WALL.top - 1.5) resetOnWall(player);
          return {
            objective: `Remain on the wall · ${Math.ceil(PREACH_SECONDS - elapsed)} seconds`,
            prompt: "Return to the wall top",
          };
        }
        elapsed = Math.min(PREACH_SECONDS, elapsed + dt);
        updateCrowd(dt);
        shotClock += dt;
        if (shotClock >= SHOT_GAP_SECONDS && elapsed < PREACH_SECONDS) {
          shotClock -= SHOT_GAP_SECONDS;
          startWarning(player);
        }
        updateProjectiles(dt, player);
        if (elapsed >= PREACH_SECONDS - 1e-7) {
          elapsed = PREACH_SECONDS;
          phase = "escape";
          leftWall = true;
          projectiles.forEach(clearProjectile);
          hooks.toast(
            "Samuel has finished his message. Jump down outside the wall and leave the city.",
          );
        }
        return {
          objective:
            phase === "escape"
              ? "Jump down outside the wall and leave the city"
              : `Remain on the wall · ${Math.ceil(PREACH_SECONDS - elapsed)} seconds`,
          prompt:
            phase === "escape"
              ? "Jump down toward the outside path"
              : "Keep moving to avoid the marked lanes",
        };
      }
      if (phase === "escape") {
        if (onWall(player)) leftWall = true;
        if (
          leftWall &&
          !onWall(player) &&
          !player.grounded &&
          player.y > SAMUEL_WALL.top / 2 &&
          player.z > SAMUEL_WALL.z + SAMUEL_WALL.d / 2
        )
          descended = true;
        const outside = player.z > SAMUEL_WALL.z + SAMUEL_WALL.d / 2 + 1;
        if (descended && player.grounded && player.y < 1 && outside) {
          phase = "done";
          if (!completed) {
            completed = true;
            hooks.complete();
          }
        }
        return {
          objective:
            phase === "done"
              ? "Samuel has departed"
              : "Jump down outside the wall",
          prompt:
            phase === "done"
              ? "Journey complete"
              : descended
                ? "Land on the outside ground"
                : "Jump down outside the wall",
        };
      }
      return { objective: "Samuel has departed", prompt: "Journey complete" };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      projectiles.forEach((shot) => {
        clearProjectile(shot);
        shot.group.traverse((object) => {
          if (!(object instanceof T.Mesh)) return;
          object.geometry.dispose();
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          materials.forEach((material) => material.dispose());
        });
        shot.warning.geometry.dispose();
        (shot.warning.material as T.Material).dispose();
        shot.group.removeFromParent();
        shot.warning.removeFromParent();
      });
      shield.geometry.dispose();
      (shield.material as T.Material).dispose();
      shield.removeFromParent();
    },
  };
}
