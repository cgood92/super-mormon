import * as T from "three";
import { adventureLandscape, withinTask } from "./adventure-landscape";
import { material } from "./art";
import { markScenery, terracedRock } from "./scenery";
import { createPlayer, stepPlayer } from "./physics";
import type { Point, WorldData } from "./worlds";

// Scripture chronology: 1 Nephi 18:23–25; 2 Nephi 1; 4:12; 5:5–17, 27.
// Final walk/death staging, terrain, costumes and condensed years are imagined.
export function buildPromisedLand(scene: T.Scene): WorldData {
  const land = adventureLandscape(
    scene,
    "The Promised Land — mountain valleys",
    0x8b9b68,
    190,
    260,
  );
  const { root, solids, solid } = land;
  const ocean = new T.Mesh(
    new T.PlaneGeometry(400, 100),
    material(0x478f9b, 0.4),
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(0, -0.12, 126);
  root.add(ocean);
  markScenery(ocean, {
    kind: "backdrop",
    reason: "Ocean beyond the bounded shore; exploration stays on dry land.",
  });
  // The arrival ship sits beyond the dry-land bounds: a shoreline landmark,
  // not another playable hull. Its sail makes the coast readable from camp.
  const arrival = new T.Group();
  arrival.name = "Arrival ship beyond the shore";
  arrival.position.set(25, 0, 91);
  arrival.rotation.y = -0.25;
  root.add(arrival);
  const hull = new T.Mesh(
    new T.SphereGeometry(1, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    material(0x785337),
  );
  hull.scale.set(3, 2.1, 7);
  hull.position.y = 1.1;
  (hull.material as T.MeshStandardMaterial).side = T.DoubleSide;
  arrival.add(hull);
  const deck = new T.Mesh(
    new T.BoxGeometry(4.8, 0.2, 11.5),
    material(0xb08a57),
  );
  deck.position.y = 1.1;
  arrival.add(deck);
  const mast = new T.Mesh(
    new T.CylinderGeometry(0.16, 0.2, 10, 8),
    material(0x6d4e37),
  );
  mast.position.y = 5.8;
  arrival.add(mast);
  const sail = new T.Mesh(new T.PlaneGeometry(5.5, 6), material(0xefe1bc));
  sail.position.set(2.8, 6.5, 0);
  (sail.material as T.MeshStandardMaterial).side = T.DoubleSide;
  arrival.add(sail);
  arrival.traverse((object) => {
    if (object instanceof T.Mesh)
      markScenery(object, {
        kind: "backdrop",
        reason:
          "Arrival ship offshore beyond exploration bounds; a coastal orientation landmark.",
      });
  });
  const foam = new T.InstancedMesh(
    new T.PlaneGeometry(3.5, 0.16),
    new T.MeshBasicMaterial({
      color: 0xd3e8da,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    }),
    28,
  );
  const foamTransform = new T.Object3D();
  for (let i = 0; i < 28; i++) {
    foamTransform.position.set(-68 + i * 5, 0.03, 80 + Math.sin(i * 0.7) * 1.8);
    foamTransform.rotation.x = -Math.PI / 2;
    foamTransform.updateMatrix();
    foam.setMatrixAt(i, foamTransform.matrix);
  }
  foam.name = "Shoreline foam beyond dry land";
  root.add(foam);
  markScenery(foam, {
    kind: "backdrop",
    reason:
      "Small surf lines beyond the dry-land route; nonphysical water effect.",
  });
  const shelter = (x: number, z: number, name: string) => {
    solid(
      { x: x - 2, y: 0, z, w: 0.22, h: 2.6, d: 4 },
      0xba9d70,
      `${name} left canvas`,
    );
    solid(
      { x: x + 2, y: 0, z, w: 0.22, h: 2.6, d: 4 },
      0xba9d70,
      `${name} right canvas`,
    );
    solid(
      { x, y: 0, z: z - 2, w: 4, h: 2.6, d: 0.22 },
      0xba9d70,
      `${name} rear canvas`,
    );
    solid(
      { x, y: 2.6, z, w: 4.25, h: 0.22, d: 4.25 },
      0xe0c99c,
      `${name} canopy`,
    );
  };
  shelter(-12, 40, "Family tent");
  shelter(13, 43, "Shore tent");
  // The hills are now reachable terrain, with broad interconnecting valleys.
  // Every mountain has a fitted supporting profile; the passages are real gaps.
  for (const [row, z] of [0, -36, -72].entries()) {
    const xs = row === 1 ? [-53, -18, 18, 53] : [-35, 0, 35];
    for (const [i, x] of xs.entries())
      terracedRock(
        root,
        solids,
        material(i % 2 ? 0x7b8c68 : 0x8e9571),
        { x, y: 0, z, w: 24, h: 7 + (i % 3) * 1.1, d: 24 },
        "Valley mountain",
      );
  }
  for (const [x, z] of [
    [-67, 10],
    [66, 9],
    [-65, -48],
    [66, -58],
    [-50, -103],
    [55, -102],
  ])
    land.tree(x, z, 1.2);
  // Paint the single existing ground surface along the valley network. No
  // overlay floors or invisible maze walls are introduced.
  const segments = [
    [-15, 21, -20, 14],
    [-15, 21, 20, 14],
    [-20, 14, -20, -18],
    [20, 14, 20, -18],
    [-20, -18, 20, -18],
    [0, -18, 0, -54],
    [-38, -18, -38, -54],
    [38, -18, 38, -54],
    [-38, -54, 38, -54],
    [-20, -54, -20, -92],
    [20, -54, 20, -92],
    [-60, 14, -60, -92],
    [60, 14, 60, -92],
    [-60, -92, 60, -92],
    [25, -92, 25, -105],
  ];
  const positions = land.ground.geometry.getAttribute("position"),
    colors = land.ground.geometry.getAttribute("color");
  const trailColor = new T.Color(0xb7a078);
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i) * 190,
      z = positions.getZ(i) * 260;
    let nearest = Infinity;
    for (const [ax, az, bx, bz] of segments) {
      const t = T.MathUtils.clamp(
        ((x - ax) * (bx - ax) + (z - az) * (bz - az)) /
          ((bx - ax) ** 2 + (bz - az) ** 2),
        0,
        1,
      );
      nearest = Math.min(
        nearest,
        Math.hypot(x - ax - t * (bx - ax), z - az - t * (bz - az)),
      );
    }
    if (z < 24) {
      const base = new T.Color(0x8b9b68).lerp(
        trailColor,
        1 - T.MathUtils.smoothstep(nearest, 2, 4),
      );
      colors.setXYZ(i, base.r, base.g, base.b);
    }
  }
  colors.needsUpdate = true;
  const grave = { x: -15, y: 0, z: 21 },
    settlement = { x: 25, y: 0, z: -105 };
  const lehi = land.actor("lehi", { x: 18, y: 0, z: 61 });
  const lehiPlayer = createPlayer(18, 0, 61);
  const relatives = [
    "sam",
    "zoram",
    "jacob",
    "child",
    "wife",
    "child",
    "laman",
    "lemuel",
  ] as const;
  const family = relatives.map((role, i) => {
    const angle = (i / relatives.length) * Math.PI * 2;
    const x = grave.x + Math.cos(angle) * (8 + i * 0.4);
    const z = grave.z + Math.sin(angle) * (8 + i * 0.4);
    return {
      rig: land.actor(role, { x, y: 0, z }),
      player: createPlayer(x, 0, z),
      willing: i < 6,
    };
  });
  family[3].rig.group.name = "joseph-character";
  // The memorial only becomes physical when the burial is complete.
  const memorial = solid(
    { x: grave.x, y: 0, z: grave.z, w: 1.7, h: 0.35, d: 1.2 },
    0xd5c4a1,
    "Quiet memorial stone",
  );
  memorial.visible = false;
  const memorialSolid = solids.pop()!;
  const circle = new T.Mesh(
    new T.RingGeometry(5, 5.35, 64),
    new T.MeshBasicMaterial({ color: 0xd8d49a, side: T.DoubleSide }),
  );
  circle.name = "New settlement arrival circle";
  circle.rotation.x = -Math.PI / 2;
  circle.position.set(settlement.x, 0.025, settlement.z);
  root.add(circle);
  markScenery(circle, {
    kind: "decoration",
    reason:
      "Thin arrival indicator above the sole ground support, without a duplicate floor.",
  });
  const trail: Point[] = [];
  let phase = "shore",
    deathTime = 0,
    gatherTime = 0,
    following = false,
    ended = false,
    disposed = false,
    trailTimer = 0;
  const moveToward = (
    p: ReturnType<typeof createPlayer>,
    target: Point,
    dt: number,
    speed: number,
  ) => {
    const dx = target.x - p.x,
      dz = target.z - p.z,
      d = Math.hypot(dx, dz);
    stepPlayer(
      p,
      {
        x: d ? (-dx / d) * Math.min(speed, d) : 0,
        y: d ? (dz / d) * Math.min(speed, d) : 0,
        jump: false,
        jumpHeld: false,
      },
      dt,
      0,
      solids,
    );
  };
  const world: WorldData = {
    name: "The Promised Land",
    subtitle:
      "Remember Lehi; lead the willing families • 2 Nephi 4–5 • Imagined route and condensed years",
    initialObjective: "Explore the shore and find Lehi",
    spawn: { x: 0, y: 0, z: 51 },
    solids,
    actorParent: root,
    bounds: { minX: -83, maxX: 83, minZ: -123, maxZ: 76 },
    goal: { ...settlement, radius: 5 },
    landmarks: [
      { name: "Shore camp", x: 0, y: 0, z: 43 },
      { name: "Memorial grove", ...grave },
      { name: "Mountain valleys", x: 0, y: 0, z: -36 },
      { name: "New settlement", ...settlement },
    ],
    update(dt, player) {
      if (disposed || ended) return;
      dt = Math.min(Math.max(dt, 0), 0.1);
      land.update(dt);
      if (phase === "shore") {
        moveToward(lehiPlayer, grave, dt, 0.16);
        lehi.update(dt, lehiPlayer);
        if (Math.hypot(lehiPlayer.x - grave.x, lehiPlayer.z - grave.z) < 0.35) {
          phase = "farewell";
          deathTime = 0;
        }
      } else if (phase === "farewell") {
        deathTime += dt;
        const ease = T.MathUtils.smoothstep(deathTime, 0, 2.8);
        lehi.group.rotation.z = (ease * Math.PI) / 2;
        lehi.group.position.y = ease * 0.35;
        if (deathTime >= 3) {
          phase = "burial";
        }
      }
      if (!following) return;
      gatherTime += dt;
      trailTimer += dt;
      if (trailTimer > 0.18) {
        trailTimer = 0;
        const prior = trail[trail.length - 1];
        if (!prior || Math.hypot(player.x - prior.x, player.z - prior.z) > 0.65)
          trail.push({ x: player.x, y: player.y, z: player.z });
        if (trail.length > 600) trail.shift();
      }
      family.forEach(({ rig, player: p, willing }, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const ring = {
          x: grave.x + Math.cos(angle) * 4.1,
          y: 0,
          z: grave.z + Math.sin(angle) * 4.1,
        };
        const target =
          !willing || gatherTime < 5
            ? ring
            : (trail[Math.max(0, trail.length - 5 - i * 4)] ?? ring);
        moveToward(p, target, dt, 0.72);
        rig.update(dt, p);
      });
    },
    adventure(hooks) {
      hooks.setAvatar("nephi");
      hooks.toast(
        "Lehi is walking inland. Explore the shore and look for him. This scene condenses years; his final walk is imagined.",
      );
      return {
        snapshot: () => ({
          phase,
          following,
          lehi: { x: lehiPlayer.x, y: lehiPlayer.y, z: lehiPlayer.z },
          grave,
          settlement,
          followers: family
            .filter((f) => f.willing)
            .map((f) => ({ x: f.player.x, y: f.player.y, z: f.player.z })),
          paths: segments,
        }),
        update(_dt, player, input) {
          const near = withinTask(player, grave, 3.1);
          if (phase === "burial" && near && input.interact) {
            lehi.group.visible = false;
            memorial.visible = true;
            solids.push(memorialSolid);
            phase = "journey";
            following = true;
            trail.push({ ...grave });
            hooks.toast(
              "Lehi is buried. His relatives gather. The Lord warns Nephi to depart; lead those who choose to follow through the valleys. Find a place to settle. (2 Nephi 4:12; 5:5–8)",
            );
          }
          if (phase === "journey" && withinTask(player, settlement, 5)) {
            phase = "done";
            ended = true;
            hooks.complete();
          }
          return {
            objective:
              phase === "shore"
                ? "Explore the shore and find Lehi"
                : phase === "farewell"
                  ? "Stay near Lehi"
                  : phase === "burial"
                    ? "Find Lehi and bury him"
                    : phase === "journey"
                      ? "Lead the willing families through the valleys; find a place to settle"
                      : "The families reach their new home",
            prompt: phase === "burial" && near ? "{action} · Bury Lehi" : "",
          };
        },
        dispose() {
          ended = true;
          land.marker.visible = false;
        },
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      ended = true;
      land.dispose();
    },
  };
  land.update(0);
  return world;
}
