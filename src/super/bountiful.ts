import {
  softBoxGeometry,
  mountainGeometry,
  palmFrondGeometry,
} from "./soft-geometry";
import * as T from "three";
import { markScenery, sceneryBox, terracedRock } from "./scenery";
import { buildFamilyCamp } from "./family-camp";
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
    const m = mesh(
      softBoxGeometry(w, h, d, name),
      color,
      x,
      y + h / 2,
      z,
      w,
      h,
      d,
      name,
    );
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
  // A single dry beach ends at z=-50; shallow, physically supported seabed
  // descends under the water. Adjacent surfaces meet without coplanar floors.
  block(0, -1, 20, 190, 1, 140, 0xd5bd82, true, "Warm sandy coastal plain");
  block(0, -1.75, -52.5, 190, 1, 5, 0xc5b482, true, "Wading seabed");
  block(0, -2.3, -58.5, 190, 1, 7, 0xb5aa80, true, "Nearshore seabed");
  block(0, -3.2, -66, 190, 1, 8, 0x9fa484, true, "Outer swimming seabed");
  const water = block(
    0,
    -0.55,
    -96,
    240,
    0.2,
    92,
    0x318d9b,
    false,
    "Irreantum — many waters",
  );
  markScenery(water, {
    kind: "decoration",
    reason:
      "Water is a visible surface; its bounded buoyancy region provides swimming, not a solid floor.",
  });
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
      mountainGeometry(i),
      i % 2 ? 0x8d9774 : 0xadb18b,
      x,
      0,
      78,
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
  block(-8, 0, 10, 3, 0.65, 2, 0x5f5c51, true, "Solid forge table");
  block(-11, 0, 10, 1.2, 0.8, 1.6, 0x795b3d, true, "Solid forge bellows");
  block(-8, 0.65, 10, 1, 0.18, 1, 0x343c3c, true, "Forge anvil");
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
    if (i < 4) {
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
        palmFrondGeometry(),
        0x547f4e,
        x,
        5,
        z,
        1,
        1,
        1,
        "Palm frond",
      );
      (leaf.material as T.MeshStandardMaterial).side = T.DoubleSide;
      markScenery(leaf, {
        kind: "decoration",
        reason: "Flexible foliage above the solid palm trunk",
      });
      leaf.rotation.y = j * 1.256;
    }
  }
  const familyCamp = buildFamilyCamp(root, solids);
  const people = [createCharacter("laman"), createCharacter("lemuel")];
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
  const sockets = Array.from({ length: 4 }, (_, i) => ({
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
  const placedSolids: WorldData["solids"] = [];
  const hammerPoint = point(-6, 12);
  const axePoint = point(-5, 11);
  const axe = new T.Group();
  axe.name = "Ground axe";
  root.add(axe);
  const axeHandle = new T.Mesh(cube, mat(0x765333));
  axeHandle.scale.set(0.1, 1.1, 0.1);
  const axeHead = new T.Mesh(cube, mat(0x65777c));
  axeHead.scale.set(0.65, 0.3, 0.16);
  axeHead.position.y = 0.4;
  axe.add(axeHandle, axeHead);
  axe.position.set(axePoint.x, 0.18, axePoint.z);
  axe.rotation.z = Math.PI / 2;
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
  tool.visible = true;
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
    swimRegions: [
      { minX: -78, maxX: 63, minZ: -68, maxZ: -50, surfaceY: -0.35 },
    ],
    bounds: { minX: -78, maxX: 63, minZ: -69, maxZ: 62 },
    goal: point(0, -23),
    landmarks: [
      { name: "Mountain prayer trail", ...summit },
      { name: "Ore", ...ore },
      { name: "Forge", ...forge },
      { name: "Timber grove", ...grove },
      { name: "Shipyard", ...point(0, -25) },
      { name: "Family camp", ...point(-4, 24) },
    ],
    update(dt, player) {
      if (!disposed) familyCamp.update(dt, player);
    },
    adventure(hooks) {
      hooks.setAvatar("nephi");
      let phase = "pray",
        strikes = 0,
        trees = 0,
        count = 0,
        carrying = false,
        dialog = false,
        finished = false,
        hasHammer = false,
        hasAxe = false,
        fallen = false;
      let animationTime = 0,
        swing = 0,
        spark = 0,
        power = 0,
        reconciliationTime = 0,
        hitTree = -1;
      const target = () =>
        count >= sockets.length
          ? ship.points.helm
          : phase === "pray"
            ? summit
            : phase === "ore"
              ? ore
              : phase === "hammer"
                ? hammerPoint
                : phase === "forge"
                  ? forge
                  : phase === "oppose" || phase === "power"
                    ? brothers
                    : phase === "timber" && !carrying
                      ? !hasAxe && !fallen
                        ? axePoint
                        : point(logs[trees].position.x, logs[trees].position.z)
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
            if (next === "power") {
              power = 2.8;
              reconciliationTime = 0;
            }
            dialog = false;
            strikes = 0;
          },
          {
            playerGesture:
              phase === "pray"
                ? "pray"
                : phase === "forge"
                  ? "work"
                  : phase === "power" || phase === "oppose"
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
                      ? "recoil"
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
            : phase === "hammer"
              ? "Pick up the hammer beside the forge"
              : phase === "forge"
                ? `Forge tools • ${strikes}/3 blows`
                : phase === "oppose"
                  ? "Speak with your brothers in the workyard"
                  : phase === "power"
                    ? "Nephi extends his hand; his brothers feel the Lord’s power"
                    : phase === "timber"
                      ? carrying
                        ? `Carry timber to plan ${count + 1}/4 • face along its length`
                        : `${fallen ? "Pick up the felled timber" : !hasAxe ? "Pick up the axe" : `Cut timber ${trees + 1}/4 • ${strikes}/3 axe blows`}`
                      : "Explore the ship; climb the stairs and visit the ship’s wheel";
      return {
        movementLocked: () => dialog || phase === "power",
        snapshot: () => ({
          phase,
          strikes,
          trees,
          placed: count,
          carrying,
          hasHammer,
          hasAxe,
          fallen,
          target: target(),
          sockets,
        }),
        update(dt, player, input) {
          animationTime += dt;
          swing = Math.max(0, swing - dt);
          spark = Math.max(0, spark - dt);
          power = Math.max(0, power - dt);
          tool.visible = phase === "hammer" || hasHammer;
          if (hasHammer)
            tool.position.set(
              player.x + Math.cos(player.yaw) * 0.65,
              player.y + 0.55,
              player.z - Math.sin(player.yaw) * 0.65,
            );
          else tool.position.set(hammerPoint.x, 0.16, hammerPoint.z);
          axe.visible = phase === "timber" && !carrying;
          if (hasAxe) {
            axe.position.set(
              player.x + Math.cos(player.yaw) * 0.65,
              player.y + 0.65,
              player.z - Math.sin(player.yaw) * 0.65,
            );
            axe.rotation.set(
              0,
              player.yaw,
              swing > 0 ? Math.sin((swing / 0.4) * Math.PI) * -1.5 : 0.2,
            );
          } else {
            axe.position.set(axePoint.x, 0.18, axePoint.z);
            axe.rotation.set(0, 0, Math.PI / 2);
          }
          tool.rotation.set(
            0,
            player.yaw,
            hasHammer
              ? swing > 0
                ? Math.sin((1 - swing / 0.4) * Math.PI) * -1.5
                : 0.2
              : Math.PI / 2,
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
          if (phase === "power" && !dialog) {
            reconciliationTime += dt;
            people.forEach((actor, i) => {
              actor.update(dt, {
                x: brothers.x + i * 2,
                y: 0,
                z: brothers.z,
                vx: 0,
                vy: 0,
                vz: 0,
                yaw: Math.PI,
                grounded: true,
                runSpeed: 0,
                pointing: true,
              });
              actor.group.rotation.z =
                Math.sin(reconciliationTime * 48 + i) * 0.12;
              actor.group.position.z +=
                Math.sin(reconciliationTime * 40) * 0.09;
            });
            if (reconciliationTime >= 2.8)
              say(
                "Willing hands",
                "His brothers feel the Lord’s power. They reconcile with Nephi and willingly help build the ship.",
                "timber",
              );
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
          marker.visible =
            phase === "pray" || Math.hypot(player.x - p.x, player.z - p.z) > 5;
          marker.position.set(
            p.x,
            p.y + 3 + Math.sin(Date.now() * 0.002) * 0.15,
            p.z,
          );
          fire.scale.y = 1.1 + Math.sin(Date.now() * 0.012) * 0.1;
          carried.visible = carrying;
          carried.position.set(
            player.x + Math.cos(player.yaw) * 0.62,
            player.y + 1.65,
            player.z - Math.sin(player.yaw) * 0.62,
          );
          carried.rotation.y = player.yaw;
          const aligned =
            !carrying ||
            Math.abs(Math.sin(player.yaw - sockets[count].yaw)) < 0.38;
          let prompt = near
            ? phase === "pray"
              ? "Pray"
              : phase === "ore"
                ? "Gather ore"
                : phase === "hammer"
                  ? "Pick up hammer"
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
                            : fallen
                              ? "Pick up timber; leave axe here"
                              : !hasAxe
                                ? "Pick up axe"
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
                "hammer",
              );
            else if (phase === "hammer") {
              hasHammer = true;
              phase = "forge";
            } else if (phase === "forge") {
              swing = 0.4;
              spark = 0.3;
              if (++strikes === 3) {
                hasHammer = false;
                say(
                  "The work begins",
                  "His brothers refuse to help. Go and hear them.",
                  "oppose",
                );
              } else hooks.toast("Metal worked. Strike again.");
            } else if (phase === "oppose")
              say(
                "Remember the Lord",
                "Nephi: Remember the Lord’s power. Do not touch me. Nephi extends his hand, and his brothers draw back and tremble.",
                "power",
              );
            else if (phase === "timber" && !carrying) {
              if (fallen) {
                hasAxe = false;
                fallen = false;
                carrying = true;
                axePoint.x = logs[trees].position.x;
                axePoint.z = logs[trees].position.z;
                logs[trees].visible = false;
                solids.splice(solids.indexOf(treeSolids[trees]), 1);
                trees++;
              } else if (!hasAxe) {
                hasAxe = true;
              } else {
                swing = 0.4;
                hitTree = trees;
                if (++strikes === 3) {
                  logs[trees].rotation.set(Math.PI / 2, 0, 0);
                  logs[trees].position.y = 0.325;
                  crowns[trees].visible = false;
                  Object.assign(treeSolids[trees], { y: 0, h: 0.65, d: 6 });
                  strikes = 0;
                  fallen = true;
                  hooks.toast(
                    "Tree felled. Pick up the timber and leave the axe here.",
                  );
                }
              }
            } else if (phase === "timber" && carrying && aligned) {
              plans[count].visible = false;
              const s = sockets[count];
              const beam = block(
                s.x,
                0,
                s.z,
                0.45,
                0.45,
                5,
                0x9b703e,
                true,
                "Placed structural timber",
              );
              beam.rotation.y = s.yaw;
              const beamSolid = solids[solids.length - 1];
              if (s.yaw !== 0) {
                beamSolid.w = 5;
                beamSolid.d = 0.45;
              }
              placedSolids.push(beamSolid);
              placed.push(beam);
              count++;
              carrying = false;
              hooks.toast(`Timber secured • ${count}/4`);
              if (count === 4) {
                ship.group.visible = true;
                scaffolding.visible = false;
                placed.forEach((m) => (m.visible = false));
                placedSolids.forEach((solid) =>
                  solids.splice(solids.indexOf(solid), 1),
                );
                Object.assign(player, ship.points.deckArrival, {
                  vx: 0,
                  vy: 0,
                  vz: 0,
                  grounded: true,
                  yaw: Math.PI,
                });
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
      familyCamp.dispose();
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
