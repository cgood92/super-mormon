import * as T from "three";
import {
  createPlayer,
  stepPlayer,
  type PlayerState,
} from "../../physics/physics";
import { terracedRock, markScenery } from "../shared/scenery";
import { material, label } from "../../rendering/art";
import { warWorld, nearWarPoint } from "../shared/war-world-kit";
import {
  ropeBlocksMove,
  ropeRingContainsAll,
  validRopeRing,
} from "./rope-perimeter";
import type { Point, WorldData } from "../../runtime/worlds";

/** Alma 50:25–36. The six-soldier rope puzzle is imagined staging. */
export const MORIANTON_ROUTE: Point[] = [
  { x: 0, y: 0, z: -57 },
  { x: 3, y: 0, z: -47 },
  { x: -8, y: 0, z: -8 },
  { x: -8, y: 0, z: 0 },
];
export const MORIANTON_POST_HINTS = [
  { x: -11, z: 2 },
  { x: 11, z: 2 },
  { x: 13, z: 30 },
  { x: 0, z: 36 },
  { x: -13, z: 30 },
  { x: -14, z: 15 },
];
const HOLD_SECONDS = 4;

export function buildMoriantonFlight(scene: T.Scene): WorldData {
  const land = warWorld(scene, "Narrow pass · Morianton's flight");
  const { root, solids, solid, actor, tree } = land;
  // Two waters bracket a genuinely narrow central route; their surfaces are below and outside play.
  for (const side of [-1, 1]) {
    const sea = new T.Mesh(
      new T.PlaneGeometry(65, 140),
      new T.MeshStandardMaterial({
        color: side < 0 ? 0x4a9cb7 : 0x5ca9bf,
        roughness: 0.28,
        metalness: 0.1,
      }),
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(side * 53, -0.27, 0);
    sea.name = side < 0 ? "West sea" : "East sea";
    sea.userData.scenery = {
      kind: "backdrop",
      reason: "Water beyond the pass, below the only walk surface.",
    };
    root.add(sea);
    for (const [z, w, d, h] of [
      [-38, 8, 12, 2.5],
      [-8, 11, 15, 3.2],
      [22, 9, 18, 3.5],
      [49, 10, 12, 2.8],
    ])
      terracedRock(
        root,
        solids,
        material(0x8d8571),
        { x: side * 20, y: 0, z, w, d, h },
        "Coastal limestone ridge",
      );
  }
  // Keep the encirclement clearing open; outcrops belong beside the approach.
  for (const [x, z, w, d, h] of [
    [7, -21, 4, 6, 1.2],
    [-15, -30, 3, 7, 1.5],
  ])
    solid({ x, y: 0, z, w, d, h }, 0x9b8c73, "Solid pass outcrop");
  for (const [x, z] of [
    [-17, -48],
    [16, -39],
    [-17, -19],
    [17, 52],
  ])
    tree(x, z);
  // The exit has visible posts and a readable direction, rather than an unseen timer.
  for (const x of [-5, 5])
    solid(
      { x, y: 0, z: 52, w: 0.65, d: 0.65, h: 3.8 },
      0x766047,
      "Northward exit post",
    );
  const exitSign = label(root, "NORTHWARD EXIT", 0, 3.7, 52, 9, 0.8);
  exitSign.rotation.y = Math.PI;
  for (const z of [44, 48]) {
    const arrow = new T.Mesh(
      new T.ConeGeometry(0.8, 1.7, 3),
      material(0xd9ab4e),
    );
    arrow.rotation.x = Math.PI / 2;
    arrow.position.set(0, 0.08, z);
    arrow.scale.z = 0.08;
    arrow.name = "Northward exit direction";
    markScenery(arrow, {
      kind: "decoration",
      reason: "Flat ground direction marker, not a raised walk surface.",
    });
    root.add(arrow);
  }
  const hintMaterial = new T.MeshBasicMaterial({
    color: 0x61b5ca,
    transparent: true,
    opacity: 0.65,
  });
  const hints = MORIANTON_POST_HINTS.map((p, i) => {
    const mesh = new T.Mesh(
      new T.TorusGeometry(0.7, 0.055, 5, 20),
      hintMaterial,
    );
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(p.x, 0.07, p.z);
    mesh.name = `Suggested rope position ${i + 1}`;
    markScenery(mesh, {
      kind: "decoration",
      reason:
        "Optional placement guide painted above the ground; no support surface.",
    });
    root.add(mesh);
    return mesh;
  });
  const maid = actor(
    "maidservant",
    MORIANTON_ROUTE[1],
    "Maidservant · escaped witness",
  );
  maid.group.scale.setScalar(0.94);
  const patrol = Array.from({ length: 6 }, (_, i) => ({
    rig: actor(
      "teancum-soldier",
      { x: -5 + (i % 3) * 2, y: 0, z: -51 - Math.floor(i / 3) * 2 },
      `Teancum soldier ${i + 1}`,
    ),
    state: createPlayer(-5 + (i % 3) * 2, 0, -51 - Math.floor(i / 3) * 2),
  }));
  const enemyStarts = [
    { x: 0, z: 13 },
    { x: -3, z: 11 },
    { x: 3, z: 11 },
    { x: 1, z: 8 },
  ];
  const enemies = enemyStarts.map((p, i) => ({
    rig: actor(
      i === 0 ? "morianton" : "morianton-follower",
      { ...p, y: 0 },
      i === 0 ? "Morianton · fleeing leader" : `Morianton follower ${i}`,
    ),
    state: createPlayer(p.x, 0, p.z),
  }));
  type Post = { x: number; z: number; soldier: number };
  let posts: Post[] = [],
    phase: "warning" | "approach" | "surround" | "held" | "done" = "warning";
  let alerted = false;
  let pending = false,
    disposed = false,
    ended = false,
    held = 0,
    attempts = 0;
  const ropeGeometry = new T.CylinderGeometry(0.06, 0.06, 1, 6);
  const ropeMaterial = material(0xdcc28b);
  const ropes = Array.from({ length: 12 }, (_, i) => {
    const mesh = new T.Mesh(ropeGeometry, ropeMaterial);
    mesh.name = `Patrol held rope ${i + 1}`;
    mesh.visible = false;
    markScenery(mesh, {
      kind: "decoration",
      reason:
        "Tension line with swept segment collision for fleeing opponents; Teancum can pass his own patrol to reposition it.",
    });
    root.add(mesh);
    return mesh;
  });
  const previewMaterial = new T.MeshBasicMaterial({
    color: 0x68d7eb,
    transparent: true,
    opacity: 0.45,
  });
  const previews = Array.from({ length: 2 }, () => {
    const m = new T.Mesh(ropeGeometry, previewMaterial);
    m.name = "Rope placement preview";
    m.visible = false;
    root.add(m);
    return m;
  });
  const up = new T.Vector3(0, 1, 0),
    direction = new T.Vector3();
  const span = (mesh: T.Mesh, a: T.Vector3, b: T.Vector3) => {
    direction.subVectors(b, a);
    const length = direction.length();
    mesh.visible = length > 0.001;
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.scale.set(1, length, 1);
    if (length > 0.001)
      mesh.quaternion.setFromUnitVectors(
        up,
        direction.multiplyScalar(1 / length),
      );
  };
  const insideArena = (p: PlayerState) =>
    p.grounded &&
    Math.abs(p.y) < 0.15 &&
    Math.abs(p.x) <= 14.5 &&
    p.z >= 0 &&
    p.z <= 42;
  const drawRopes = (player?: PlayerState) => {
    ropes.forEach((r) => (r.visible = false));
    previews.forEach((r) => (r.visible = false));
    posts.forEach((post, i) => {
      const rig = patrol[post.soldier].rig;
      const left = rig.sockets.leftHand.getWorldPosition(new T.Vector3()),
        right = rig.sockets.rightHand.getWorldPosition(new T.Vector3());
      span(ropes[6 + i], left, right);
      if (i < posts.length - 1 || posts.length === 6) {
        const next = patrol[posts[(i + 1) % posts.length].soldier].rig;
        span(
          ropes[i],
          right,
          next.sockets.leftHand.getWorldPosition(new T.Vector3()),
        );
      }
    });
    if (
      player &&
      phase === "surround" &&
      posts.length > 0 &&
      posts.length < 6 &&
      insideArena(player)
    ) {
      const at = new T.Vector3(player.x, 0.95, player.z),
        last = posts[posts.length - 1];
      span(previews[0], new T.Vector3(last.x, 0.95, last.z), at);
      if (posts.length === 5)
        span(previews[1], at, new T.Vector3(posts[0].x, 0.95, posts[0].z));
    }
    hints.forEach(
      (hint, i) =>
        (hint.visible =
          phase === "approach" || (phase === "surround" && i >= posts.length)),
    );
  };
  const resetPatrol = (player: PlayerState) => {
    attempts++;
    alerted = false;
    posts = [];
    held = 0;
    phase = "approach";
    Object.assign(player, createPlayer(-8, 0, -8));
    enemies.forEach((e, i) => {
      Object.assign(
        e.state,
        createPlayer(enemyStarts[i].x, 0, enemyStarts[i].z),
      );
      e.rig.update(0, e.state);
    });
    patrol.forEach((s, i) => {
      Object.assign(
        s.state,
        createPlayer(-8 + (i % 2) * 1.4, 0, -11 - Math.floor(i / 2) * 1.7),
      );
      s.rig.update(0, s.state);
    });
    drawRopes();
  };
  return {
    name: "Morianton's Flight",
    subtitle: "Surround the fleeing company · Alma 50:25–36",
    spawn: { ...MORIANTON_ROUTE[0], yaw: 0 },
    solids,
    actorParent: root,
    bounds: { minX: -19, maxX: 19, minZ: -62, maxZ: 61 },
    goal: { x: 0, y: 0, z: 17, radius: 15 },
    initialObjective: "You are Teancum · hear the maidservant's warning",
    landmarks: [
      { name: "Maidservant's warning", ...MORIANTON_ROUTE[1] },
      { name: "Rope challenge clearing", x: 0, y: 0, z: 17 },
      { name: "Northward escape route", x: 0, y: 0, z: 52 },
    ],
    adventure(hooks) {
      hooks.setAvatar("teancum");
      hooks.toast(
        "You are Teancum. Six armored soldiers are ready to follow you.",
      );
      const objective = () =>
        phase === "warning"
          ? "You are Teancum · hear the maidservant's warning"
          : phase === "approach"
            ? "Lead your six soldiers north to Morianton's company"
            : phase === "held"
              ? `Keep all four inside the rope · ${Math.max(0, Math.ceil(HOLD_SECONDS - held))} s`
              : phase === "done"
                ? "The pass is secured · the people return in peace"
                : `Surround all four opponents · ${posts.length}/6 soldiers placed`;
      return {
        snapshot: () => ({
          phase,
          placed: posts.map((p) => ({ ...p })),
          enemies: enemies.map((e) => ({ x: e.state.x, z: e.state.z })),
          soldiers: patrol.map((s) => ({
            x: s.state.x,
            y: s.state.y,
            z: s.state.z,
          })),
          held,
          attempts,
          route: MORIANTON_ROUTE,
          postHints: MORIANTON_POST_HINTS,
        }),
        movementLocked: () => pending,
        update(dt, player, input) {
          dt = Math.max(0, Math.min(dt, 0.1));
          if (disposed || pending || ended)
            return { objective: objective(), prompt: "" };
          if (
            phase === "warning" &&
            nearWarPoint(player, MORIANTON_ROUTE[1], 3) &&
            input.interact
          ) {
            pending = true;
            hooks.dialog(
              "Alma 50:30–34",
              "Lead the patrol",
              "The maidservant warned Moroni that Morianton plans to flee north. You are Teancum. Lead your six armored soldiers to his company. Walk around all four opponents and use {action} to station one soldier at a time. The first placement alerts them to run north; the sixth closes the rope. Keep everyone inside!",
              () => {
                if (disposed) return;
                pending = false;
                phase = "approach";
              },
              {
                focus: { ...MORIANTON_ROUTE[1], y: 1.1 },
                wide: 5,
                actors: [{ group: maid.group, gesture: "talk", speaker: true }],
              },
            );
          }
          if (phase === "approach" && player.z >= -3) {
            phase = "surround";
            hooks.toast(
              "Surround the dark-clothed company. Use {action} to place each soldier; pale blue rings suggest a route. Your first placement starts their escape north.",
            );
          }
          // Unplaced soldiers follow the actual trail, with the same physical step solver as Teancum.
          let ahead = player;
          if (phase !== "warning")
            patrol.forEach((soldier, i) => {
              const post = posts.find((p) => p.soldier === i);
              if (post) {
                soldier.rig.update(dt, {
                  ...soldier.state,
                  yaw: Math.atan2(-post.x, 17 - post.z),
                  carrying: true,
                  move: "idle",
                  vx: 0,
                  vz: 0,
                  runSpeed: 0,
                });
                return;
              }
              const dx = ahead.x - soldier.state.x,
                dz = ahead.z - soldier.state.z,
                d = Math.hypot(dx, dz);
              const move = d > 1.7 ? Math.min(1, (d - 1.4) / 2) : 0;
              stepPlayer(
                soldier.state,
                {
                  x: d ? (-dx / d) * move : 0,
                  y: d ? (dz / d) * move : 0,
                  jump: false,
                  jumpHeld: false,
                },
                dt,
                0,
                solids,
              );
              soldier.rig.update(dt, soldier.state);
              ahead = soldier.state;
            });
          if (phase === "surround" || phase === "held") {
            // Probe routes toward the visible north exit. Every proposed segment is swept against the rope.
            enemies.forEach((enemy, i) => {
              if (!alerted) return;
              const speed = phase === "held" ? 1.4 : 0.55;
              for (const angle of [
                0,
                (i % 2 ? 1 : -1) * 0.65,
                (i % 2 ? -1 : 1) * 0.65,
                1.3,
                -1.3,
              ]) {
                const candidate = { ...enemy.state };
                const dx = (Math.sin(angle) * speed) / 6.5,
                  dz = (Math.cos(angle) * speed) / 6.5;
                stepPlayer(
                  candidate,
                  { x: -dx, y: dz, jump: false, jumpHeld: false },
                  dt,
                  0,
                  solids,
                );
                if (
                  ropeBlocksMove(
                    enemy.state,
                    candidate,
                    posts,
                    posts.length === 6,
                  )
                )
                  continue;
                Object.assign(enemy.state, candidate);
                break;
              }
              enemy.rig.update(dt, enemy.state);
            });
            if (enemies.some((e) => e.state.z > 52)) {
              resetPatrol(player);
              hooks.toast(
                "An opponent escaped through the north exit. Your patrol is ready again—spread the rope farther ahead of them.",
              );
              return { objective: objective(), prompt: "" };
            }
            const nearest = posts.findIndex(
              (p) => Math.hypot(p.x - player.x, p.z - player.z) < 1.8,
            );
            if (input.interact && insideArena(player)) {
              if (nearest >= 0) {
                posts.splice(nearest, 1);
                held = 0;
                phase = "surround";
                hooks.toast(
                  "Soldier recalled. Place them farther around the company.",
                );
              } else if (posts.length < 6) {
                if (
                  enemies.some(
                    (e) =>
                      Math.hypot(e.state.x - player.x, e.state.z - player.z) <
                      1.5,
                  )
                )
                  hooks.toast(
                    "Leave space between your soldier and the fleeing company.",
                  );
                else {
                  const index = patrol.findIndex(
                    (_, i) => !posts.some((p) => p.soldier === i),
                  );
                  // Station just outside Teancum, keeping the two bodies separate.
                  const radial = Math.hypot(player.x, player.z - 17);
                  const angle =
                    radial > 0.1
                      ? Math.atan2(player.x, player.z - 17)
                      : player.yaw;
                  const position = [0, Math.PI / 2, -Math.PI / 2, Math.PI]
                    .map((turn) => ({
                      x: player.x + Math.sin(angle + turn) * 0.85,
                      z: player.z + Math.cos(angle + turn) * 0.85,
                    }))
                    .find(
                      (p) =>
                        Math.abs(p.x) < 18 &&
                        p.z >= 0 &&
                        p.z <= 43 &&
                        !solids.some(
                          (s) =>
                            s.y + s.h > 0.43 &&
                            s.y < 1.65 &&
                            Math.abs(p.x - s.x) < s.w / 2 + 0.32 &&
                            Math.abs(p.z - s.z) < s.d / 2 + 0.32,
                        ),
                    );
                  if (!position) {
                    hooks.toast(
                      "Leave a little more space beside the rocks to station a soldier.",
                    );
                    drawRopes(player);
                    return {
                      objective: objective(),
                      prompt: "Move into open ground to place a soldier",
                    };
                  }
                  const post = { ...position, soldier: index };
                  posts.push(post);
                  alerted = true;
                  Object.assign(
                    patrol[index].state,
                    createPlayer(post.x, 0, post.z),
                  );
                  patrol[index].rig.update(0, {
                    ...patrol[index].state,
                    yaw: Math.atan2(-post.x, 17 - post.z),
                    carrying: true,
                  });
                  if (posts.length === 6 && !validRopeRing(posts))
                    hooks.toast(
                      "The rope crosses itself. Stand beside a soldier and use {action} to recall and reposition them.",
                    );
                  else if (
                    posts.length === 6 &&
                    !ropeRingContainsAll(
                      posts,
                      enemies.map((e) => e.state),
                    )
                  )
                    hooks.toast(
                      "Someone is outside the rope. Recall a nearby soldier and widen your perimeter.",
                    );
                }
              }
            }
            if (
              ropeRingContainsAll(
                posts,
                enemies.map((e) => e.state),
              )
            ) {
              phase = "held";
              held += dt;
            } else {
              held = 0;
              phase = "surround";
            }
            if (held >= HOLD_SECONDS) {
              pending = true;
              hooks.dialog(
                "Alma 50:35–36",
                "The pass is secured",
                "Your patrol has surrounded the entire company! Alma records that a battle followed, Teancum defeated Morianton, and the survivors were taken prisoner. After promising to keep the peace, the people returned home.",
                () => {
                  if (disposed) return;
                  pending = false;
                  ended = true;
                  phase = "done";
                  previews.forEach((m) => (m.visible = false));
                  hints.forEach((m) => (m.visible = false));
                  hooks.complete();
                },
                {
                  focus: { x: 0, y: 1, z: enemies[0].state.z },
                  wide: 10,
                  actors: [
                    { group: enemies[0].rig.group },
                    ...patrol
                      .filter(
                        (s) =>
                          Math.hypot(
                            s.state.x - player.x,
                            s.state.z - player.z,
                          ) < 3,
                      )
                      .map((s) => ({ group: s.rig.group })),
                  ],
                },
              );
            }
            drawRopes(player);
            return {
              objective: objective(),
              prompt:
                nearest >= 0
                  ? "{action} · Recall this soldier"
                  : posts.length < 6
                    ? insideArena(player)
                      ? "{action} · Place a soldier here"
                      : "Move into the clearing to place soldiers"
                    : "Recall a soldier to adjust the rope",
            };
          }
          drawRopes();
          return {
            objective: objective(),
            prompt:
              phase === "warning" && nearWarPoint(player, MORIANTON_ROUTE[1], 3)
                ? "{action} · Hear the warning"
                : "",
          };
        },
        dispose() {
          disposed = true;
          pending = false;
        },
      };
    },
    dispose() {
      disposed = true;
      land.dispose();
    },
  };
}
