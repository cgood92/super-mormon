import * as T from "three";
import { markScenery, sceneryBox, terracedRock } from "./scenery";
import { buildShip } from "./ship";
import { createCharacter } from "./character";
import type { WorldData, Point } from "./worlds";

const point = (x: number, z: number, y = 0): Point => ({ x, y, z });
/** Interactive retelling of 1 Nephi 17–18. All architecture and vessel geometry are imagined. */
export function buildBountiful(scene: T.Scene): WorldData {
  scene.background = new T.Color(0xbce0df);
  scene.fog = new T.Fog(0xbce0df, 95, 230);
  const root = new T.Group();
  root.name = "Bountiful — the shore of Irreantum";
  scene.add(root);
  const sky = new T.HemisphereLight(0xe4f6ff, 0xb49b69, 2.2);
  root.add(sky);
  const sun = new T.DirectionalLight(0xffe6b0, 2.8);
  sun.position.set(-35, 65, -25);
  root.add(sun);
  const solids: WorldData["solids"] = [],
    climbables: NonNullable<WorldData["climbables"]> = [];
  const materials = new Map<number, T.MeshStandardMaterial>();
  const mat = (color: number) => {
    if (!materials.has(color))
      materials.set(
        color,
        new T.MeshStandardMaterial({ color, roughness: 0.95 }),
      );
    return materials.get(color)!;
  };
  const cube = new T.BoxGeometry(1, 1, 1),
    cone = new T.ConeGeometry(1, 1, 7),
    sphere = new T.IcosahedronGeometry(1, 1);
  function mesh(
    geometry: T.BufferGeometry,
    color: number,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    name = "",
  ) {
    const m = new T.Mesh(geometry, mat(color));
    m.position.set(x, y, z);
    m.scale.set(w, h, d);
    m.name = name;
    m.receiveShadow = true;
    root.add(m);
    return m;
  }
  function block(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: number,
    solid = false,
    name = "",
  ) {
    const m = mesh(cube, color, x, y + h / 2, z, w, h, d, name);
    if (solid) {
      const shape = { x, y, z, w, h, d };
      solids.push(shape);
      markScenery(m, { kind: "solid", solids: [shape] });
    }
    return m;
  }
  const rock = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: number,
    name: string,
  ) => terracedRock(root, solids, mat(color), { x, y, z, w, h, d }, name);
  block(0, -1, 5, 190, 1, 170, 0xd5bd82, false, "Warm sandy coastal plain");
  const water = block(
    0,
    -0.55,
    -96,
    240,
    0.2,
    90,
    0x318d9b,
    false,
    "Irreantum — many waters",
  );
  for (let i = 0; i < 8; i++)
    block(0, -0.35, -58 - i * 5, 180, 0.035, 0.35, 0x9bd5cc);
  for (let i = 0; i < 18; i++) {
    const side = i % 2 ? -1 : 1,
      x = side * (24 + (i % 5) * 8),
      z = -44 + (i % 7) * 5;
    mesh(sphere, 0xc6b686, x, 0.15, z, 5, 1.1, 4, "Shore dunes");
    mesh(sphere, 0x78874d, x + 2, 0.5, z + 2, 1.3, 0.7, 1.6, "Coastal scrub");
  }
  for (let i = 0; i < 26; i++) {
    const x = -85 + i * 6.8;
    const ridge = mesh(
      cone,
      i % 2 ? 0x8d9774 : 0xadb18b,
      x,
      8 + (i % 4) * 2,
      67,
      10,
      20 + (i % 4) * 5,
      12,
      "Distant green mountain ridge",
    );
    markScenery(ridge, {
      kind: "backdrop",
      reason: "Distant skyline outside playable mountain route",
    });
  }
  for (let i = 0; i < 14; i++) {
    const x = 43 + (i % 4) * 9,
      z = -35 + Math.floor(i / 4) * 14;
    rock(x, 0, z, 8.8, 6, 12, 0xb6ab85, "Coastal limestone");
  }
  // A broad stair trail gives every mountain ascent a physically traversable surface.
  for (let i = 0; i < 30; i++)
    block(
      -36,
      0,
      13 + i * 0.85,
      5,
      (i + 1) * 0.3,
      1,
      i % 2 ? 0xb7a478 : 0xc3b38c,
      true,
      "Mountain prayer trail",
    );
  block(-36, 0, 41, 11, 9, 6, 0xa69a73, true, "Mountain summit");
  for (let i = 0; i < 9; i++) {
    const z = 20 + i * 3,
      height = 2 + i * 0.9;
    for (const side of [-1, 1])
      rock(
        -36 + side * 5,
        0,
        z,
        8.6,
        height * 1.05,
        10,
        i % 2 ? 0x9a9e74 : 0xa8a47b,
        "Mountain rock shoulders",
      );
  }
  rock(-43, 0, 43, 16, 11, 20, 0x9b9e77, "Mountain western crag");
  const summit = point(-36, 39, 9),
    ore = point(-22, 18),
    forge = point(-8, 10),
    brothers = point(9, 4);
  for (let i = 0; i < 7; i++)
    rock(
      -23 + (i % 3),
      0,
      18 + Math.floor(i / 3),
      1.4,
      1.3 + (i % 2) * 0.4,
      1.3,
      i % 2 ? 0x566572 : 0x9e6a3f,
      "Ore outcrop",
    );
  block(-8, 0, 10, 3, 0.65, 2, 0x5f5c51);
  block(-8, 0.65, 10, 1, 0.18, 1, 0x343c3c);
  const fire = mesh(
    cone,
    0xe7a344,
    -10,
    0.5,
    10,
    0.55,
    1.1,
    0.55,
    "Forge fire",
  );
  const logs: T.Mesh[] = [],
    crowns: T.Mesh[] = [];
  const treeSolids: WorldData["solids"] = [];
  const grove = point(22, 20);
  for (let i = 0; i < 16; i++) {
    const x = 19 + (i % 4) * 6,
      z = 17 + Math.floor(i / 4) * 7;
    const trunk = block(x, 0, z, 0.65, 6, 0.65, 0x705036, true, "Timber grove");
    const crown = mesh(
      sphere,
      0x6c8a45,
      x,
      6.5,
      z,
      2.5,
      2.6,
      2.3,
      "Leaf canopy",
    );
    if (i < 6) {
      logs.push(trunk);
      crowns.push(crown);
      treeSolids.push(solids[solids.length - 1]);
    }
  }
  // Palms and small shelters frame the workyard without enclosing the route.
  for (let i = 0; i < 12; i++) {
    const x = -65 + i * 10,
      z = -8 + (i % 3) * 6;
    sceneryBox(
      root,
      solids,
      mat(0x8b7047),
      { x, y: 0, z, w: 0.4, h: 5, d: 0.4 },
      "Palm trunk",
    );
    for (let j = 0; j < 5; j++) {
      const leaf = mesh(
        cone,
        0x547f4e,
        x + Math.sin(j * 1.256),
        5,
        z + Math.cos(j * 1.256),
        0.55,
        3,
        0.6,
        "Palm frond",
      );
      markScenery(leaf, {
        kind: "decoration",
        reason: "Flexible foliage above the solid palm trunk",
      });
      leaf.rotation.z = 1.15;
      leaf.rotation.y = j * 1.256;
    }
  }
  for (const x of [-2, 8]) {
    block(x, 0, 22, 5, 0.15, 5, 0xb49b6a);
    const roof = mesh(cone, 0xc2ac7e, x, 2.6, 22, 4, 2, 4, "Family shelter");
    roof.rotation.y = Math.PI / 4;
  }
  const people = [createCharacter("laman"), createCharacter("sam")];
  people.forEach((actor, i) => {
    actor.group.position.set(brothers.x + i * 2, 0, brothers.z);
    root.add(actor.group);
  });
  const ship = buildShip(root, point(0, -40));
  ship.group.visible = false;
  const scaffolding = new T.Group();
  root.add(scaffolding);
  for (const x of [-9, 9])
    for (const z of [-52, -44, -36, -28]) {
      const b = new T.Mesh(cube, mat(0x896b47));
      b.position.set(x, 1, z);
      b.scale.set(0.3, 2, 0.3);
      scaffolding.add(b);
    }
  const sockets = Array.from({ length: 6 }, (_, i) => ({
    ...point((i % 2 ? 1 : -1) * 3, -27 - Math.floor(i / 2) * 7),
    yaw: i % 2 ? Math.PI / 2 : 0,
  }));
  const plans = sockets.map((p, i) => {
    const m = block(
      p.x,
      0.08,
      p.z,
      0.45,
      0.12,
      5,
      0x70bfc1,
      false,
      `Timber plan ${i + 1}`,
    );
    m.rotation.y = p.yaw;
    return m;
  });
  const carried = block(
    0,
    1,
    0,
    0.4,
    0.4,
    5,
    0x9a703e,
    false,
    "Carried timber",
  );
  carried.visible = false;
  const placed: T.Mesh[] = [];
  const marker = mesh(
    cone,
    0x45bfff,
    summit.x,
    summit.y + 3,
    summit.z,
    0.45,
    0.9,
    0.45,
    "Current task beacon",
  );
  marker.rotation.z = Math.PI;
  const tool = new T.Group();
  tool.name = "Animated work tool";
  root.add(tool);
  tool.visible = false;
  const handle = block(0, 0, 0, 0.11, 1.15, 0.11, 0x765333);
  tool.add(handle);
  const head = block(0, 0.88, 0, 0.62, 0.28, 0.2, 0x65777c);
  tool.add(head);
  const sparkMaterial = new T.MeshBasicMaterial({
    color: 0xffdc82,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const sparks = new T.Mesh(sphere, sparkMaterial);
  sparks.name = "Brief forge sparks";
  root.add(sparks);
  const powerMaterial = new T.MeshBasicMaterial({
    color: 0xc8edff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    wireframe: true,
  });
  const powerGlow = new T.Mesh(sphere, powerMaterial);
  powerGlow.name = "Quiet light of reconciliation";
  root.add(powerGlow);
  let disposed = false;
  const data: WorldData = {
    name: "Bountiful",
    initialObjective: "Climb the mountain trail and pray",
    subtitle: "Build with faith • 1 Nephi 17–18 • Imagined vessel design",
    spawn: point(-27, 9),
    solids,
    climbables,
    actorParent: root,
    bounds: { minX: -78, maxX: 63, minZ: -65, maxZ: 62 },
    goal: point(0, -23),
    landmarks: [
      { name: "Mountain prayer trail", ...summit },
      { name: "Ore", ...ore },
      { name: "Forge", ...forge },
      { name: "Timber grove", ...grove },
      { name: "Shipyard", ...point(0, -25) },
    ],
    adventure(hooks) {
      hooks.setAvatar("nephi");
      let phase = "pray",
        strikes = 0,
        trees = 0,
        count = 0,
        carrying = false,
        dialog = false,
        finished = false;
      let animationTime = 0,
        swing = 0,
        spark = 0,
        power = 0,
        hitTree = -1;
      const target = () =>
        count >= sockets.length
          ? ship.points.helm
          : phase === "pray"
            ? summit
            : phase === "ore"
              ? ore
              : phase === "forge"
                ? forge
                : phase === "oppose" || phase === "power"
                  ? brothers
                  : phase === "timber" && !carrying
                    ? point(logs[trees].position.x, logs[trees].position.z)
                    : phase === "timber"
                      ? sockets[count]
                      : ship.points.helm;
      const say = (title: string, body: string, next: string) => {
        dialog = true;
        hooks.dialog(
          "1 Nephi 17–18",
          title,
          body,
          () => {
            phase = next;
            dialog = false;
            strikes = 0;
          },
          {
            playerGesture:
              phase === "pray"
                ? "pray"
                : phase === "forge"
                  ? "work"
                  : phase === "power"
                    ? "point"
                    : "talk",
            actors: (phase === "pray" || phase === "forge" || phase === "ore"
              ? []
              : phase === "oppose" || phase === "power" || next === "explore"
                ? people
                : [people[0]]
            ).map((actor, i) => ({
              group: actor.group,
              speaker: i === 0,
              gesture:
                phase === "pray"
                  ? "pray"
                  : phase === "forge"
                    ? "work"
                    : phase === "oppose"
                      ? "point"
                      : "talk",
            })),
            focus:
              phase === "pray"
                ? summit
                : phase === "forge"
                  ? forge
                  : phase === "ore"
                    ? ore
                    : next === "explore"
                      ? ship.points.helm
                      : brothers,
          },
        );
      };
      const objective = () =>
        phase === "pray"
          ? "Climb the mountain trail and pray"
          : phase === "ore"
            ? "Find ore near the mountain"
            : phase === "forge"
              ? `Forge tools • ${strikes}/3 blows`
              : phase === "oppose"
                ? "Speak with your brothers in the workyard"
                : phase === "power"
                  ? "Return to your brothers and extend your hand"
                  : phase === "timber"
                    ? carrying
                      ? `Carry timber to plan ${count + 1}/6 • face along its length`
                      : `Cut timber ${trees + 1}/6 • ${strikes}/3 axe blows`
                    : "Explore the ship; climb the stairs and visit the steering oar";
      return {
        movementLocked: () => dialog,
        snapshot: () => ({
          phase,
          strikes,
          trees,
          placed: count,
          carrying,
          target: target(),
          sockets,
        }),
        update(dt, player, input) {
          animationTime += dt;
          swing = Math.max(0, swing - dt);
          spark = Math.max(0, spark - dt);
          power = Math.max(0, power - dt);
          tool.visible = swing > 0;
          tool.position.set(player.x + 0.6, player.y + 0.8, player.z);
          tool.rotation.set(
            0,
            player.yaw,
            Math.sin((1 - swing / 0.4) * Math.PI) * -1.5,
          );
          sparks.position.set(forge.x, 1.1, forge.z);
          sparks.scale.setScalar(0.15 + (1 - spark / 0.3) * 0.65);
          sparkMaterial.opacity = (spark / 0.3) * 0.85;
          powerGlow.position.set(brothers.x + 1, 1.2, brothers.z);
          powerGlow.scale.setScalar(1 + (1 - power / 1.8) * 1.5);
          powerMaterial.opacity = (power / 1.8) * 0.22;
          if (hitTree >= 0 && hitTree < logs.length) {
            const shake =
              swing > 0 ? Math.sin(animationTime * 65) * swing * 0.09 : 0;
            logs[hitTree].rotation.z = shake;
            crowns[hitTree].rotation.z = shake;
          }
          if (phase === "timber" || phase === "explore")
            people.forEach((actor, i) => {
              const work = phase === "timber";
              actor.update(dt, {
                x: 12 + i * 4,
                y: 0,
                z: -16 - i * 3,
                vx: 0,
                vy: 0,
                vz: 0,
                yaw: -Math.PI / 2,
                grounded: true,
                runSpeed: 0,
                carrying: work && Math.sin(animationTime * 1.7 + i * 2) > 0,
                pointing: work && Math.sin(animationTime * 1.7 + i * 2) <= 0,
              });
              actor.group.rotation.z = work
                ? Math.sin(animationTime * 2 + i) * 0.04
                : 0;
            });
          const p = target(),
            near =
              Math.hypot(player.x - p.x, player.z - p.z) <
                (phase === "timber" && carrying ? 2.8 : 3.2) &&
              Math.abs(player.y - p.y) < 3;
          marker.visible = Math.hypot(player.x - p.x, player.z - p.z) > 5;
          marker.position.set(
            p.x,
            p.y + 3 + Math.sin(Date.now() * 0.002) * 0.15,
            p.z,
          );
          fire.scale.y = 1.1 + Math.sin(Date.now() * 0.012) * 0.1;
          carried.visible = carrying;
          carried.position.set(player.x, player.y + 1.2, player.z);
          carried.rotation.y = player.yaw;
          const aligned =
            !carrying ||
            Math.abs(Math.sin(player.yaw - sockets[count].yaw)) < 0.38;
          let prompt = near
            ? phase === "pray"
              ? "Pray"
              : phase === "ore"
                ? "Gather ore"
                : phase === "forge"
                  ? "Strike the tool"
                  : phase === "oppose"
                    ? "Listen to your brothers"
                    : phase === "power"
                      ? "Extend your hand"
                      : phase === "timber"
                        ? carrying
                          ? aligned
                            ? "Place aligned timber"
                            : "Turn to face along the glowing timber plan"
                          : "Swing axe"
                        : "Inspect the finished ship"
            : "";
          if (!dialog && near && input.interact) {
            if (phase === "pray")
              say(
                "A command to build",
                "Nephi prays on the mountain. The Lord commands him to build a ship and shows him how.",
                "ore",
              );
            else if (phase === "ore")
              say(
                "Ore for tools",
                "Nephi finds ore. Now make tools at the forge.",
                "forge",
              );
            else if (phase === "forge") {
              swing = 0.4;
              spark = 0.3;
              if (++strikes === 3)
                say(
                  "The work begins",
                  "His brothers refuse to help. Go and hear them.",
                  "oppose",
                );
              else hooks.toast("Metal worked. Strike again.");
            } else if (phase === "oppose")
              say(
                "Remember the Lord",
                "Nephi: Remember the Lord’s power. Do not touch me. His brothers draw back in anger.",
                "power",
              );
            else if (phase === "power") {
              power = 1.8;
              say(
                "Reconciliation",
                "Nephi extends his hand. His brothers feel the Lord’s power, reconcile, and agree to help build.",
                "timber",
              );
            } else if (phase === "timber" && !carrying) {
              swing = 0.4;
              hitTree = trees;
              if (++strikes === 3) {
                logs[trees].visible = false;
                crowns[trees].visible = false;
                solids.splice(solids.indexOf(treeSolids[trees]), 1);
                trees++;
                strikes = 0;
                carrying = true;
                hooks.toast(
                  "Timber lifted. Walk it to the glowing plan; face along its length.",
                );
              }
            } else if (phase === "timber" && carrying && aligned) {
              plans[count].visible = false;
              const s = sockets[count];
              const beam = block(
                s.x,
                0.15 + Math.floor(count / 2) * 0.45,
                s.z,
                0.45,
                0.45,
                5,
                0x9b703e,
                false,
                "Placed structural timber",
              );
              beam.rotation.y = s.yaw;
              placed.push(beam);
              count++;
              carrying = false;
              hooks.toast(`Timber secured • ${count}/6`);
              if (count === 6) {
                ship.group.visible = true;
                scaffolding.visible = false;
                placed.forEach((m) => (m.visible = false));
                solids.push(...ship.solids);
                for (let i = 0; i < 14; i++)
                  block(
                    19 - i * 0.75,
                    0,
                    -27,
                    0.75,
                    (i + 1) * 0.3,
                    2.8,
                    0xa67f50,
                    true,
                    "Beach boarding stair",
                  );
                block(
                  8.7,
                  3.95,
                  -27,
                  3.2,
                  0.25,
                  2.8,
                  0xa67f50,
                  true,
                  "Gangway landing",
                );
                climbables.push(...ship.climbables);
                say(
                  "A ship completed",
                  "They worked timbers with curious workmanship, as the Lord showed Nephi. The family saw that the ship was good. Explore this imagined vessel, including its stairs, common room and masts. (1 Nephi 18:1–4)",
                  "explore",
                );
              }
            } else if (phase === "explore" && !finished) {
              finished = true;
              hooks.complete();
            }
          }
          return { objective: objective(), prompt, carrying };
        },
        dispose() {
          carried.visible = false;
          marker.visible = false;
          tool.visible = false;
          sparkMaterial.opacity = 0;
          powerMaterial.opacity = 0;
        },
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      people.forEach((a) => a.dispose());
      const geometries = new Set<T.BufferGeometry>(),
        mats = new Set<T.Material>();
      root.traverse((o) => {
        if (o instanceof T.InstancedMesh) o.dispose();
        if (o instanceof T.Mesh) {
          geometries.add(o.geometry);
          for (const m of Array.isArray(o.material) ? o.material : [o.material])
            mats.add(m);
        }
      });
      geometries.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      root.removeFromParent();
    },
  };
  return data;
}
