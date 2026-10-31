import * as T from "three";
import { markScenery } from "../shared/scenery";
import { nearWarPoint, warWorld } from "../shared/war-world-kit";
import { createPlayer, stepPlayer } from "../../physics/physics";
import type { Point, WorldData } from "../../runtime/worlds";

const p = (x: number, z: number, y = 0): Point => ({ x, y, z });
const WALL = 5.6;
const CAMP = p(-42, 0);
const SCOUT = p(-24, -11.2, WALL);
/** Alma 62:18–29. Terrain, projecting stones, equipment and pressure-based flight are imagined. */
export function buildNephihah(scene: T.Scene): WorldData {
  const land = warWorld(scene, "Nephihah · western wall crossing", true);
  const { root, solids, solid, decor, actor, tree } = land;
  // Continuous walls except for the true east entrance. The west wall has no door.
  solid(
    { x: -24, y: 0, z: 0, w: 1.4, h: WALL, d: 44 },
    0x9f8b69,
    "Nephihah solid west wall",
  );
  for (const z of [-22, 22])
    solid(
      { x: 0, y: 0, z, w: 48, h: WALL, d: 1.4 },
      0x9f8b69,
      "Nephihah solid north or south wall",
    );
  for (const z of [-14, 14])
    solid(
      { x: 24, y: 0, z, w: 1.4, h: WALL, d: 16 },
      0x9f8b69,
      "Nephihah east gate flanking wall",
    );
  solid(
    { x: 24, y: 4.25, z: 0, w: 1.4, h: 1.35, d: 12 },
    0x8e785b,
    "Nephihah east gate lintel",
  );
  for (const [x, z] of [
    [-24, -22],
    [24, -22],
    [-24, 22],
    [24, 22],
  ] as const)
    solid(
      { x, y: 0, z, w: 2.4, h: 6.2, d: 2.4 },
      0x867359,
      "Nephihah solid corner watch tower",
    );
  // Open-front houses have real side/back walls; broad lanes stay clear.
  for (const [x, z] of [
    [-13, -14],
    [0, -14],
    [-13, 15],
    [0, 15],
  ] as const) {
    const color = z < 0 ? 0xbea681 : 0xc5ae89;
    for (const dx of [-3, 3])
      solid(
        { x: x + dx, y: 0, z, w: 0.55, h: 3, d: 5 },
        color,
        "Nephihah dwelling side wall",
      );
    solid(
      { x, y: 0, z: z + 2.5, w: 6.5, h: 3, d: 0.55 },
      color,
      "Nephihah dwelling rear wall",
    );
    solid(
      { x, y: 3, z, w: 6.5, h: 0.3, d: 5.5 },
      0x92734f,
      "Nephihah solid cedar roof",
    );
  }

  // Three projecting stones, not a public stairway. Each 1.4 m rise requires a jump.
  for (let i = 0; i < 3; i++)
    solid(
      {
        x: -25.6,
        y: 1.4 * (i + 1) - 0.5,
        z: -16 + i * 2.4,
        w: 1.8,
        h: 0.5,
        d: 1.6,
      },
      0xb19a74,
      "Projecting scout wall stone",
    );
  for (const [x, z] of [
    [-49, -38],
    [-35, -35],
    [-48, 35],
    [-34, 32],
    [36, -34],
    [38, 33],
  ])
    tree(x, z);

  const army = Array.from({ length: 6 }, (_, i) => {
    const state = createPlayer(
      -44 + (i % 3) * 1.7,
      0,
      -3 + Math.floor(i / 3) * 5,
    );
    const rig = actor("guard", state, `Moroni's following soldier ${i + 1}`);
    const equipment = new T.Group();
    equipment.name = "Army carried cords and wooden ladder";
    rig.group.add(equipment);
    // Equipment has no static collision: it travels with its bearer.
    const wood = new T.MeshStandardMaterial({ color: 0x987048, roughness: 1 });
    if (i % 2 === 0) {
      for (const x of [-0.35, 0.35]) {
        const rail = new T.Mesh(new T.BoxGeometry(0.1, 2.5, 0.1), wood);
        rail.position.set(x, 1.3, -0.4);
        equipment.add(rail);
      }
      for (let j = 0; j < 6; j++) {
        const rung = new T.Mesh(new T.BoxGeometry(0.7, 0.08, 0.1), wood);
        rung.position.set(0, 0.3 + j * 0.4, -0.4);
        equipment.add(rung);
      }
    } else {
      const coil = new T.Mesh(new T.TorusGeometry(0.35, 0.09, 6, 12), wood);
      coil.position.set(0, 1.3, -0.4);
      equipment.add(coil);
    }
    markScenery(equipment, {
      kind: "decoration",
      reason: "Portable equipment carried by a moving soldier.",
    });
    equipment.visible = false;
    return { state, rig, equipment, trail: [] as Point[], entered: false };
  });
  const defenders = Array.from({ length: 5 }, (_, i) => {
    const state = createPlayer(10 + (i % 2) * 3, 0, -6 + Math.floor(i / 2) * 5);
    const rig = actor("laman", state, `Sleeping eastern defender ${i + 1}`);
    rig.group.rotation.z = -1.15;
    rig.group.position.y = 0.3;
    const flag = decor(
      { x: 0, y: 0, z: 0, w: 0.18, h: 0.35, d: 0.18 },
      0xffd771,
      "Defender to guide out",
      "Nonphysical indicator above a moving defender.",
    );
    flag.visible = false;
    return { state, rig, flag, escaped: false };
  });
  const marker = new T.Mesh(
    new T.OctahedronGeometry(0.42),
    new T.MeshBasicMaterial({ color: 0x60cfff, depthTest: false }),
  );
  marker.name = "Nephihah route beacon";
  marker.renderOrder = 20;
  root.add(marker);
  markScenery(marker, {
    kind: "decoration",
    reason: "Nonphysical route indicator.",
  });
  let phase: "scout" | "return" | "deploy" | "cross" | "drive" | "done" =
    "scout";
  let ladderZ = 8,
    time = 0,
    animationTime = 0,
    active = true;
  let lastTrail: Point | undefined;
  const target = (): Point =>
    phase === "scout"
      ? SCOUT
      : phase === "return"
        ? CAMP
        : phase === "deploy"
          ? p(-34, 8)
          : phase === "cross"
            ? p(-5, ladderZ)
            : phase === "drive"
              ? (defenders.find((s) => !s.escaped)?.state ?? p(29, 0))
              : p(29, 0);
  const makeLadders = (z: number) => {
    // Keep either descent in the broad central lane, clear of dwellings.
    ladderZ = T.MathUtils.clamp(z, -9, 9);
    for (const inside of [false, true]) {
      for (let i = 0; i < 14; i++) {
        const x = inside ? -22.85 + i * 0.76 : -35.25 + i * 0.76;
        const top = inside ? 5.6 - i * 0.4 : (i + 1) * 0.4;
        solid(
          { x, y: top - 0.14, z: ladderZ, w: 0.78, h: 0.14, d: 1.8 },
          0x9c7750,
          inside
            ? "Inner strong-cord ladder rung"
            : "Outer strong-cord ladder rung",
        );
      }
      // The top rung meets the wall without a second coplanar walk surface.
      for (const side of [-0.97, 0.97]) {
        const start = new T.Vector3(
          inside ? -23 : -35.6,
          inside ? 5.8 : 0.1,
          ladderZ + side,
        );
        const end = new T.Vector3(
          inside ? -12.6 : -24.7,
          inside ? 0.1 : 5.8,
          ladderZ + side,
        );
        const cord = new T.Mesh(
          new T.CylinderGeometry(0.06, 0.06, start.distanceTo(end), 6),
          new T.MeshStandardMaterial({ color: 0xbba67e, roughness: 1 }),
        );
        cord.position.copy(start).add(end).multiplyScalar(0.5);
        cord.quaternion.setFromUnitVectors(
          new T.Vector3(0, 1, 0),
          end.sub(start).normalize(),
        );
        cord.name = "Strong ladder side cord";
        root.add(cord);
        markScenery(cord, {
          kind: "decoration",
          reason: "Side cord beside the solid wooden treads.",
        });
      }
    }
    army.forEach((s) => (s.equipment.visible = false));
  };
  const animate = (
    dt: number,
    rig: (typeof army)[number]["rig"],
    state: ReturnType<typeof createPlayer>,
  ) => {
    rig.update(dt, state);
    rig.group.rotation.y = state.yaw;
  };
  return {
    name: "The Taking of Nephihah",
    subtitle: "The western wall by night · Alma 62:18–29",
    initialObjective:
      "Hop up the three projecting stones to scout the sleeping army",
    spawn: { ...p(-43, -18), yaw: Math.PI / 2 },
    solids,
    actorParent: root,
    bounds: { minX: -53, maxX: 53, minZ: -62, maxZ: 62 },
    goal: { ...p(29, 0), radius: 3 },
    landmarks: [
      { name: "Moroni's army", ...CAMP },
      { name: "Projecting wall stones", ...p(-26, -16) },
      { name: "Western crossing", ...p(-30, 8) },
      { name: "Eastern escape pass", ...p(24, 0) },
    ],
    update(dt) {
      if (!active || dt <= 0) return;
      time += Math.min(0.05, dt);
      const at = target();
      marker.visible = phase !== "done";
      marker.position.set(at.x, at.y + 2.5 + Math.sin(time * 3) * 0.15, at.z);
      defenders.forEach((s) => {
        s.flag.visible = phase === "drive" && !s.escaped;
        s.flag.position.set(
          s.state.x,
          2.7 + Math.sin(time * 3) * 0.1,
          s.state.z,
        );
      });
    },
    adventure(hooks) {
      hooks.setAvatar("moroni");
      hooks.toast(
        "Alma 62:18–29 · Hop up the projecting stones to scout. The city and climbing route are imagined.",
      );
      return {
        snapshot: () => ({
          phase,
          ladderZ,
          entered: army.filter((s) => s.entered).length,
          target: { ...target() },
          followers: army.map((s) => ({
            position: { x: s.state.x, y: s.state.y, z: s.state.z },
          })),
          soldiers: defenders.map((s) => ({
            position: { x: s.state.x, y: s.state.y, z: s.state.z },
            escaped: s.escaped,
          })),
        }),
        update(dt, player, input) {
          if (!active || dt <= 0)
            return { objective: "Nephihah recovered", prompt: "" };
          dt = Math.min(dt, 0.05);
          if (
            phase === "scout" &&
            nearWarPoint(player, SCOUT, 2) &&
            player.y > 5.3
          ) {
            phase = "return";
            hooks.toast(
              "The army sleeps by the eastern entrance. Hop down and return to your men in the plain.",
            );
          }
          if (
            phase === "return" &&
            nearWarPoint(player, CAMP, 4) &&
            player.y < 0.5
          ) {
            phase = "deploy";
            army.forEach((s) => {
              s.equipment.visible = true;
              s.trail.push({ ...player });
            });
            lastTrail = { ...player };
            hooks.toast(
              "Your men have cords and ladders. Lead them to the western wall; use {action} nearby to place the crossing.",
            );
          }
          const nearWall =
            player.x >= -38 &&
            player.x <= -24.9 &&
            Math.abs(player.z) < 19 &&
            player.y < 0.6;
          if (phase === "deploy" && nearWall && input.interact) {
            makeLadders(player.z);
            phase = "cross";
            hooks.toast(
              "Lead your men up the wooden ladder and down into the city. Keep walking; they follow your route.",
            );
          }
          animationTime += dt;
          const pose = animationTime >= 0.1;
          if (pose) animationTime = 0;
          if (["deploy", "cross", "drive", "done"].includes(phase)) {
            const distance = lastTrail
              ? Math.hypot(
                  player.x - lastTrail.x,
                  player.y - lastTrail.y,
                  player.z - lastTrail.z,
                )
              : Infinity;
            // Airborne samples (including a jump in place) are not walkable trail stops.
            if (player.grounded && distance > 0.65) {
              army.forEach((s) =>
                s.trail.push({ x: player.x, y: player.y, z: player.z }),
              );
              lastTrail = { ...player };
            }
            army.forEach((s, i) => {
              let at = s.trail[0];
              if (
                at &&
                Math.hypot(at.x - s.state.x, at.z - s.state.z) < 0.48 &&
                Math.abs(at.y - s.state.y) < 0.6
              ) {
                s.trail.shift();
                at = s.trail[0];
              }
              const dx = at ? at.x - s.state.x : 0,
                dz = at ? at.z - s.state.z : 0;
              const d = Math.hypot(dx, dz);
              const moving =
                !!at && (s.trail.length > 2 + i || d > 3 + i * 0.25);
              stepPlayer(
                s.state,
                {
                  x: moving
                    ? (-dx / Math.max(d, 0.01)) * Math.min(1, d * 2)
                    : 0,
                  y: moving ? (dz / Math.max(d, 0.01)) * Math.min(1, d * 2) : 0,
                  jump:
                    moving &&
                    phase === "deploy" &&
                    at.y > s.state.y + 0.5 &&
                    s.state.grounded,
                  jumpHeld: false,
                },
                dt,
                0,
                solids,
              );
              if (s.state.x > -12.5 && s.state.y < 0.2) s.entered = true;
              if (pose) animate(0.1, s.rig, s.state);
              s.rig.group.position.set(s.state.x, s.state.y, s.state.z);
            });
          }
          if (
            phase === "cross" &&
            player.x > -9 &&
            player.x < 22 &&
            player.y < 0.6 &&
            army.every((s) => s.entered)
          ) {
            phase = "drive";
            defenders.forEach((s) => (s.rig.group.rotation.z = 0));
            if (scene.background instanceof T.Color)
              scene.background.set(0x9ac4ca);
            if (scene.fog instanceof T.Fog) scene.fog.color.set(0x9ac4ca);
            root.children.forEach((o) => {
              if (o instanceof T.HemisphereLight) {
                o.color.set(0xffecd0);
                o.intensity = 2.5;
              }
              if (o instanceof T.DirectionalLight) {
                o.color.set(0xffdcaa);
                o.intensity = 2.4;
              }
            });
            hooks.toast(
              "Morning! The defenders are fleeing. Circle behind the gold-marked soldiers and drive them through the eastern gate.",
            );
          }
          if (phase === "drive" || phase === "done") {
            defenders.forEach((s, i) => {
              const dx = s.state.x - player.x,
                dz = s.state.z - player.z,
                d = Math.hypot(dx, dz);
              let vx = Math.sin(time * 1.2 + i * 2) * 0.12,
                vz = Math.cos(time * 1.1 + i) * 0.16;
              if (s.escaped) {
                vx = s.state.x < 44 ? 2.4 : 0;
                vz = 0;
              } else if (d < 7 && d > 0.05 && player.y < 1.2) {
                const pressure = Math.min(2.8, (7 - d) * 0.65);
                vx += (dx / d) * pressure;
                vz += (dz / d) * pressure;
                // Modest gate awareness makes strays recoverable while position still controls their direction.
                vx += 0.3;
                vz += T.MathUtils.clamp(-s.state.z * 0.12, -0.6, 0.6);
              }
              const speed = Math.hypot(vx, vz);
              stepPlayer(
                s.state,
                {
                  x: -vx / 6.5,
                  y: vz / 6.5,
                  jump: false,
                  jumpHeld: false,
                  traversal: false,
                },
                dt,
                0,
                solids,
              );
              if (!s.escaped && s.state.x > 28 && Math.abs(s.state.z) < 5.2) {
                s.escaped = true;
                hooks.toast(
                  `Through the pass · ${defenders.filter((s) => s.escaped).length}/${defenders.length}`,
                );
              }
              if (pose) animate(0.1, s.rig, { ...s.state, runSpeed: speed });
              s.rig.group.position.set(s.state.x, s.state.y, s.state.z);
            });
          }
          if (phase === "drive" && defenders.every((s) => s.escaped)) {
            phase = "done";
            hooks.toast(
              "Nephihah recovered. Alma 62:25–29 also records deaths and prisoners; willing prisoners later join the people of Ammon. This activity depicts the flight.",
            );
            hooks.complete();
          }
          const escaped = defenders.filter((s) => s.escaped).length;
          return {
            objective:
              phase === "scout"
                ? "Hop up the three projecting stones to scout the sleeping army"
                : phase === "return"
                  ? "Hop down and return to your army in the plain"
                  : phase === "deploy"
                    ? "Lead your army to the western wall"
                    : phase === "cross"
                      ? `Lead your army over the wall and into the city · ${army.filter((s) => s.entered).length}/6 inside`
                      : phase === "drive"
                        ? `Drive the defenders through the eastern gate · ${escaped}/5 out`
                        : "Nephihah recovered",
            prompt:
              phase === "deploy" && nearWall
                ? "{action} · Place cords and wooden ladders"
                : phase === "scout"
                  ? "{jump} · Hop between the projecting stones"
                  : phase === "drive"
                    ? "Circle behind stragglers; your approach steers them toward the open gate"
                    : "",
          };
        },
        dispose() {
          active = false;
          marker.visible = false;
        },
      };
    },
    dispose: land.dispose,
  };
}
