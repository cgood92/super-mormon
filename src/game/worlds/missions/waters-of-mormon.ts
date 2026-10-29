import * as T from "three";
import { ambient, box, material } from "../../rendering/art";
import { createCharacter } from "../../characters/character";
import { createPlayer, type PlayerState } from "../../physics/physics";
import { sceneryBox, markScenery } from "../shared/scenery";
import { spyCanSeePlayer } from "../../camera/spy-vision";
import type { Point, Solid, WorldData } from "../../runtime/worlds";

export const WATERS_ROUTE: Point[] = [
  { x: -15, y: 0, z: 2 },
  { x: -15, y: 0, z: 13 },
  { x: -5, y: 0, z: 13 },
  { x: -5, y: 0, z: 24 },
  { x: 8, y: 0, z: 24 },
  { x: 8, y: 0, z: 39 },
  { x: 13, y: 0, z: 49 },
  { x: 13, y: 0, z: 64 },
  { x: 6, y: 0, z: 75 },
  { x: 6, y: 0, z: 87 },
  { x: 0, y: 0, z: 98 },
];
const spawn = WATERS_ROUTE[0];
const near = (a: Point, b: Point, r = 3) =>
  Math.hypot(a.x - b.x, a.z - b.z) < r;

/** City layout and sentry patrols are imagined; the secluded fountain follows Mosiah 18. */
export function buildWatersOfMormon(scene: T.Scene): WorldData {
  const prior = new Set(scene.children),
    background = scene.background,
    fog = scene.fog;
  ambient(scene, "jerusalem");
  scene.background = new T.Color(0x9cb8ac);
  scene.fog = new T.Fog(0x9cb8ac, 55, 145);
  const group = new T.Group();
  group.name = "Waters of Mormon";
  scene.add(group);
  const solids: Solid[] = [];
  const solid = (
    x: number,
    z: number,
    w: number,
    d: number,
    h: number,
    color: number,
    name: string,
    y = 0,
  ) => sceneryBox(group, solids, material(color), { x, y, z, w, d, h }, name);
  // The broad earth slab is the sole walk surface, including the shallow fountain bed.
  const ground = solid(
    0,
    52,
    64,
    130,
    0.6,
    0x9eaa7a,
    "earth and shallow fountain bed",
    -0.6,
  );
  ground.geometry.dispose();
  ground.geometry = new T.BoxGeometry(1, 1, 1, 40, 1, 82);
  const positions = ground.geometry.getAttribute("position"),
    colors: number[] = [];
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i) * 64,
      z = positions.getZ(i) * 130 + 52;
    let distance = Infinity;
    for (let j = 1; j < WATERS_ROUTE.length; j++) {
      const a = WATERS_ROUTE[j - 1],
        b = WATERS_ROUTE[j],
        dx = b.x - a.x,
        dz = b.z - a.z;
      const t = Math.max(
        0,
        Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)),
      );
      distance = Math.min(
        distance,
        Math.hypot(x - a.x - t * dx, z - a.z - t * dz),
      );
    }
    const soil = new T.Color(z < 45 ? 0xc4ae87 : 0x71875a),
      path = new T.Color(z < 45 ? 0xddc69a : 0xb9b08a);
    soil.lerp(path, Math.max(0, 1 - distance / (z < 45 ? 3 : 2.7)) * 0.85);
    soil.multiplyScalar(1 + 0.045 * Math.sin(x * 0.7 + z * 0.48));
    colors.push(soil.r, soil.g, soil.b);
  }
  ground.geometry.setAttribute(
    "color",
    new T.Float32BufferAttribute(colors, 3),
  );
  (ground.material as T.MeshStandardMaterial).color.set(0xffffff);
  (ground.material as T.MeshStandardMaterial).vertexColors = true;
  const decor = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    c: number,
    name: string,
  ) => {
    const m = box(group, x, y, z, w, h, d, c, name);
    markScenery(m, {
      kind: "decoration",
      reason: "Surface detail; the underlying shared solid owns support.",
    });
    return m;
  };
  for (const [x, z, w, d, h] of [
    [-24, 11, 8, 24, 6],
    [-3, 5, 18, 8, 5],
    [9, 17, 15, 10, 6],
    [-16, 25, 15, 12, 5],
    [23, 30, 10, 25, 7],
    [-21, 41, 13, 12, 5],
  ]) {
    solid(
      x,
      z,
      w,
      d,
      h,
      x > 0 ? 0xd0b58e : 0xc4a680,
      "King Noah city dwelling",
    );
    for (const side of [-1, 1]) {
      const face = z + side * (d / 2 + 0.055);
      for (const dx of [-w * 0.3, w * 0.3]) {
        decor(
          x + dx,
          2.4,
          face,
          0.95,
          1.15,
          0.08,
          0x425459,
          "shaded window recess",
        );
        decor(
          x + dx,
          2.32,
          face + side * 0.06,
          1.15,
          0.13,
          0.23,
          0xe3c89a,
          "window sill",
        );
        decor(x + dx, 3.55, face, 0.95, 0.16, 0.13, 0x7a5e40, "window lintel");
      }
      decor(x, 0, face, 1.35, 2.25, 0.08, 0x71523c, "timber street doorway");
      decor(x, 2.25, face, 1.65, 0.18, 0.2, 0xb09169, "doorway lintel");
      decor(
        x,
        h - 0.35,
        z + side * (d / 2 + 0.04),
        w,
        0.18,
        0.13,
        0xe1c89e,
        "raised plaster cornice",
      );
      decor(
        x + side * (w / 2 + 0.045),
        h - 0.35,
        z,
        0.13,
        0.18,
        d,
        0xe1c89e,
        "side plaster cornice",
      );
      for (const dz of [-d * 0.27, d * 0.27]) {
        decor(
          x + side * (w / 2 + 0.055),
          2.4,
          z + dz,
          0.08,
          1.15,
          0.9,
          0x46575a,
          "side shaded window",
        );
        decor(
          x + side * (w / 2 + 0.1),
          2.3,
          z + dz,
          0.18,
          0.13,
          1.1,
          0xddc49a,
          "side window sill",
        );
      }
    }
    decor(x, h, z, w, 0.16, d, 0xe6cf9e, "roof coping");
    decor(
      x,
      1,
      z - d / 2 - 0.03,
      1.3,
      2,
      0.08,
      0x6c5141,
      "recessed timber door",
    );
  }
  solid(-31, 22, 1, 45, 7, 0xaf9776, "west city enclosure");
  solid(31, 22, 1, 45, 7, 0xaf9776, "east city enclosure");
  solid(-16, 44, 29, 1, 6, 0xb6a080, "outer city wall west");
  solid(24, 44, 14, 1, 6, 0xb6a080, "outer city wall east");
  for (const [x, z, w, d] of [
    [-9, 15, 3, 2],
    [2, 27, 3, 2],
    [11, 37, 3, 3],
    [17, 55, 3, 3],
    [5, 69, 4, 2],
  ])
    solid(x, z, w, d, 1.9, 0xb29a76, "solid route cover");
  // Individually fitted trunks and leafy crowns: canopy is intentionally overhead decoration.
  for (let i = 0; i < 54; i++) {
    const z = 49 + (i % 12) * 5.5,
      x = (i % 2 ? 1 : -1) * (20 + (i % 4) * 2.2) + Math.sin(i * 2) * 3;
    const trunk = solid(x, z, 0.8, 0.8, 4.8, 0x715941, "forest tree trunk");
    trunk.castShadow = true;
    const crown = new T.Mesh(
      new T.IcosahedronGeometry(2.8, 1),
      material(i % 3 ? 0x4c7551 : 0x68865c),
    );
    crown.position.set(x, 7, z);
    crown.scale.y = 1.2;
    crown.name = "overhead forest crown";
    markScenery(crown, {
      kind: "decoration",
      reason: "Overhead foliage above the walk route; the trunk is solid.",
    });
    group.add(crown);
  }
  for (const [x, z] of [
    [-7, 60],
    [5, 57],
    [11, 78],
    [-3, 83],
    [-11, 92],
    [12, 94],
  ]) {
    solid(x, z, 2, 2, 3, 0x536f46, "dense thicket cover");
    for (let j = 0; j < 5; j++) {
      const leaves = new T.Mesh(
        new T.IcosahedronGeometry(0.85, 1),
        material(j % 2 ? 0x647f50 : 0x476943),
      );
      leaves.scale.set(0.85, 1.15, 0.85);
      leaves.position.set(
        x + Math.sin(j * 2.4) * 0.38,
        2.45 + (j % 2) * 0.35,
        z + Math.cos(j * 2.4) * 0.38,
      );
      leaves.name = "rounded thicket foliage";
      markScenery(leaves, {
        kind: "decoration",
        reason:
          "Leafy tips attached to the dense solid interwoven thicket below.",
      });
      group.add(leaves);
    }
  }
  const water = new T.Mesh(
    new T.CircleGeometry(7, 48),
    new T.MeshStandardMaterial({
      color: 0x65c5bd,
      transparent: true,
      opacity: 0.65,
      roughness: 0.12,
      metalness: 0.15,
    }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0.045, 101);
  water.name = "pure water fountain";
  markScenery(water, {
    kind: "decoration",
    reason:
      "Shallow clear water over the single solid earth bed; no duplicate walk surface.",
  });
  group.add(water);
  for (let i = 0; i < 5; i++)
    decor(
      -4 + i * 1.9,
      0.06,
      101,
      1,
      0.025,
      0.12,
      0xb9e4d2,
      "water reflection",
    );
  const rigs: ReturnType<typeof createCharacter>[] = [];
  const actor = (
    role: "spy" | "alma" | "convert",
    x: number,
    z: number,
    yaw = 0,
  ) => {
    const rig = createCharacter(role, { quality: "npc" });
    group.add(rig.group);
    rigs.push(rig);
    rig.update(0, { ...createPlayer(x, 0, z), yaw });
    return rig;
  };
  const alma = actor("alma", 0, 100, Math.PI);
  for (const [x, z] of [
    [-5, 95],
    [-3, 94],
    [4, 95],
    [6, 97],
  ])
    actor("convert", x, z, 0);
  const spies = [
    { x: -4, z: 19, base: Math.PI, phase: 0 },
    { x: 16, z: 35, base: Math.PI, phase: 2.3 },
    { x: 10, z: 62, base: 0, phase: 1.4 },
  ].map((s) => ({
    ...s,
    rig: actor("spy", s.x, s.z, s.base),
    yaw: s.base,
    originX: s.x,
    eye: new T.Vector3(s.x, 1.4, s.z),
  }));
  let time = 0,
    stage = 0,
    pending = false,
    ended = false,
    baptism = -1,
    caught = false,
    resets = 0;
  let lastPlayer: PlayerState | undefined;
  const reset = () => {
    if (lastPlayer)
      Object.assign(lastPlayer, createPlayer(spawn.x, spawn.y, spawn.z));
    time = 0;
    stage = 0;
    pending = false;
    ended = false;
    baptism = -1;
    caught = false;
    resets++;
  };
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    for (const rig of rigs) rig.dispose();
    group.traverse((o) => {
      if (o instanceof T.InstancedMesh) o.dispose();
      if (o instanceof T.Mesh) {
        o.geometry.dispose();
        for (const m of Array.isArray(o.material) ? o.material : [o.material])
          m.dispose();
      }
    });
    for (const o of [...scene.children])
      if (!prior.has(o)) {
        scene.remove(o);
        if (o instanceof T.Light) o.dispose();
      }
    scene.background = background;
    scene.fog = fog;
  };
  return {
    name: "Waters of Mormon",
    subtitle: "Find Alma in secret • Mosiah 18",
    spawn: { ...spawn, yaw: 0 },
    solids,
    actorParent: group,
    bounds: { minX: -30, maxX: 30, minZ: -8, maxZ: 115 },
    goal: { x: 0, y: 0, z: 98, radius: 3 },
    initialObjective:
      "Leave King Noah’s city unseen. Watch the spies’ turning heads.",
    adventure(hooks) {
      hooks.setAvatar("convert");
      hooks.toast(
        "Spies see only where their heads look. Wait behind walls, then cross as they turn away.",
      );
      return {
        snapshot: () => ({
          phase: ended
            ? "done"
            : baptism >= 0
              ? "baptism"
              : ["city", "outskirts", "forest", "alma"][stage],
          time,
          resets,
          spies: spies.map((s) => ({
            x: s.x,
            y: s.eye.y,
            eye: { x: s.eye.x, y: s.eye.y, z: s.eye.z },
            z: s.z,
            headYaw: s.yaw,
          })),
          route: WATERS_ROUTE,
        }),
        movementLocked: () => pending || baptism >= 0 || caught,
        update(dt, player, input) {
          lastPlayer = player;
          dt = Math.max(0, Math.min(dt, 0.1));
          if (!pending && !caught && !ended) time += dt;
          for (const s of spies) {
            s.x = s.originX + Math.sin(time * 0.27 + s.phase) * 0.65;
            const offset = Math.sin(time * 0.53 + s.phase) * 1.45;
            s.yaw = s.base + offset;
            s.rig.update(dt, {
              ...createPlayer(s.x, 0, s.z),
              yaw: s.base,
              vx: Math.cos(time * 0.27 + s.phase) * 0.175,
              runSpeed: Math.abs(Math.cos(time * 0.27 + s.phase) * 0.175),
              move: "run",
              lookYaw: s.yaw,
              lookPitch: 0,
            });
            s.rig.group.updateMatrixWorld(true);
            const left = s.rig.group.getObjectByName("left-eye"),
              right = s.rig.group.getObjectByName("right-eye");
            if (left && right)
              s.eye
                .copy(left.getWorldPosition(new T.Vector3()))
                .add(right.getWorldPosition(new T.Vector3()))
                .multiplyScalar(0.5);
          }
          if (!caught && !ended && baptism < 0) {
            for (const s of spies)
              if (
                spyCanSeePlayer({
                  eye: s.eye,
                  headYaw: s.yaw,
                  headPitch: 0,
                  playerPosition: player,
                  playerHeight: player.crouching ? 0.9 : 1.65,
                  solids,
                  maxDistance: 22,
                })
              ) {
                caught = true;
                hooks.caught?.(reset);
                if (!hooks.caught) reset();
                return {
                  objective: "Seen by a spy — return to the city",
                  prompt: "",
                };
              }
          }
          if (player.z > 45 && stage === 0) {
            stage = 1;
            hooks.toast(
              "The city is behind you. Follow the wooded outer edge.",
            );
          }
          if (player.z > 67 && stage === 1) {
            stage = 2;
            hooks.toast("Search the thicket for a fountain of pure water.");
          }
          if (player.z > 91 && stage === 2) stage = 3;
          const close = near(player, { x: 0, y: 0, z: 98 }, 3.6);
          if (
            stage === 3 &&
            close &&
            input.interact &&
            !pending &&
            baptism < 0 &&
            !ended
          ) {
            pending = true;
            hooks.dialog(
              "Mosiah 18:8–10",
              "Come into the fold of God",
              "Alma invites believers to bear one another’s burdens, mourn with those who mourn, and stand as witnesses of God. You choose to make this covenant through baptism.",
              () => {
                pending = false;
                baptism = 0;
                player.x = 0;
                player.z = 101;
                player.y = 0;
              },
            );
          }
          if (baptism >= 0 && !ended) {
            baptism += dt;
            // A quiet lowering into shallow water, followed by rising beside Alma.
            player.y = -Math.sin(Math.min(1, baptism / 4) * Math.PI) * 0.65;
            alma.update(dt, {
              ...createPlayer(0.8, 0, 101),
              yaw: -Math.PI / 2,
              pointing: baptism < 2,
            });
            if (baptism >= 4) {
              player.y = 0;
              ended = true;
              hooks.dialog(
                "Mosiah 18:13–16",
                "Baptized at the Waters of Mormon",
                "Alma baptizes you as a witness of your covenant to serve God. You join the believers in this peaceful place. The city, route, and spies in this adventure are an imagined adaptation of the account.",
                () => hooks.complete(),
              );
            }
          }
          const warning =
            !ended &&
            baptism < 0 &&
            spies.some((s) =>
              spyCanSeePlayer({
                eye: s.eye,
                headYaw: s.yaw,
                headPitch: 0,
                playerPosition: player,
                playerHeight: player.crouching ? 0.9 : 1.65,
                solids,
                maxDistance: 22,
                halfAngleRadians: (25 * Math.PI) / 180,
              }),
            );
          return {
            objective: warning
              ? "A spy is looking this way — get behind cover"
              : ended
                ? "A covenant to serve God"
                : [
                    "Escape the city unseen",
                    "Follow the outer edge into the woods",
                    "Find the hidden fountain in the thicket",
                    "Speak with Alma by the water",
                  ][stage],
            prompt:
              close && stage === 3 && !pending && baptism < 0
                ? "{action} · Speak with Alma"
                : "",
          };
        },
        dispose() {
          ended = true;
        },
      };
    },
    dispose,
  };
}
