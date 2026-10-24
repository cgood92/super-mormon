import { mountainGeometry } from "./soft-geometry";
import * as T from "three";
import { stepPlayer } from "./physics";
import { buildShip } from "./ship";
import { createCharacter } from "./character";
import { box, material } from "./art";
import type { WorldData, Point } from "./worlds";

const near = (a: Point, b: Point, r = 2.8) =>
  Math.hypot(a.x - b.x, a.z - b.z) < r && Math.abs(a.y - b.y) < 2;
const wrap = (n: number) => Math.atan2(Math.sin(n), Math.cos(n));

/** A child's imagined visit; ship architecture and sailing course are playful reconstructions. */
export function buildVoyage(scene: T.Scene): WorldData {
  const root = new T.Group();
  root.name = "Ocean voyage";
  scene.add(root);
  scene.background = new T.Color(0x34475f);
  scene.fog = new T.Fog(0x34475f, 110, 420);
  root.add(new T.HemisphereLight(0xd0e9ff, 0x414337, 2));
  const sun = new T.DirectionalLight(0xffe9bd, 2.2);
  sun.position.set(-35, 55, -70);
  root.add(sun);
  const ship = buildShip(root, { x: 0, y: 0, z: 0 });
  // Ship's physical space remains local while all its actors share the gentle visible roll.
  const oceanMaterial = material(0x174d67, 0.36);
  const oceanGeometry = new T.PlaneGeometry(1000, 1000, 64, 64);
  oceanGeometry.rotateX(-Math.PI / 2);
  const ocean = new T.Mesh(oceanGeometry, oceanMaterial);
  ocean.position.y = -1.35;
  root.add(ocean);
  const oceanPositions = oceanGeometry.getAttribute(
    "position",
  ) as T.BufferAttribute;
  const foam = new T.Group();
  root.add(foam);
  const foamMaterial = new T.MeshBasicMaterial({
    color: 0xc9eced,
    transparent: true,
    opacity: 0.5,
  });
  for (let i = 0; i < 85; i++) {
    const m = new T.Mesh(new T.PlaneGeometry(2 + (i % 5), 0.23), foamMaterial);
    m.rotation.x = -Math.PI / 2;
    m.position.set(Math.sin(i * 33) * 150, -0.8, Math.cos(i * 17) * 150);
    foam.add(m);
  }
  const clouds = new T.Group();
  root.add(clouds);
  for (let i = 0; i < 20; i++) {
    const m = new T.Mesh(new T.IcosahedronGeometry(12, 1), material(0x6b7484));
    m.scale.set(2.6, 0.4, 1);
    m.position.set(
      Math.sin(i * 4) * 210,
      40 + (i % 3) * 7,
      Math.cos(i * 4) * 210,
    );
    clouds.add(m);
  }
  const land = new T.Group();
  land.name = "Distant promised shore";
  root.add(land);
  for (let i = 0; i < 13; i++) {
    const hill = new T.Mesh(
      mountainGeometry(i),
      material(i % 2 ? 0x728b61 : 0x9caa75),
    );
    hill.scale.set(18 + (i % 4) * 6, 18 + (i % 5) * 9, 22 + (i % 4) * 5);
    hill.position.set((i - 6) * 22, -2, -290 - (i % 3) * 12);
    land.add(hill);
  }
  const brothers = { x: -1, y: 0, z: 16 };
  const releaseRoute = [
    { x: -1, y: 0, z: 11 },
    ship.points.stairBottom,
    ship.points.stairTop,
    { x: 3, y: 4.2, z: -3 },
    { x: 0, y: 4.2, z: -5 },
  ];
  let releaseStep = 0,
    releaseReady = false,
    openingTime = 0;
  const npcs = [
    createCharacter("laman"),
    createCharacter("lemuel"),
    createCharacter("nephi"),
  ];
  const positions = [
    { x: -3, y: 0, z: 15 },
    { x: 1, y: 0, z: 16 },
    ship.points.boundNephi,
  ];
  npcs.forEach((npc, i) => {
    ship.group.add(npc.group);
    npc.update(0, {
      ...positions[i],
      vx: 0,
      vy: 0,
      vz: 0,
      yaw: Math.PI,
      grounded: true,
      runSpeed: 0,
    });
  });
  const rope = new T.Mesh(
    new T.TorusGeometry(0.65, 0.065, 6, 24),
    material(0xb79d6c),
  );
  rope.rotation.x = Math.PI / 2;
  rope.position.set(0, 5.05, -6.65);
  rope.scale.set(0.72, 1.3, 1);
  ship.group.add(rope);
  const secondRope = rope.clone();
  secondRope.position.y = 5.4;
  ship.group.add(secondRope);
  const compass = new T.Group();
  compass.position.set(-3, 4.65, 12);
  ship.group.add(compass);
  const sphere = new T.Mesh(
    new T.IcosahedronGeometry(0.4, 2),
    new T.MeshStandardMaterial({
      color: 0xdab354,
      metalness: 0.65,
      roughness: 0.3,
    }),
  );
  compass.add(sphere);
  box(ship.group, -3, 4.2, 12, 1, 0.35, 1, 0x725039, "Liahona stand");
  ship.solids.push({ x: -3, y: 4.2, z: 12, w: 1, h: 1, d: 1 });
  const needle = new T.Mesh(
    new T.ConeGeometry(0.17, 0.8, 3),
    material(0xfff2a7),
  );
  needle.rotation.x = -Math.PI / 2;
  needle.position.set(0, 0.6, 0);
  compass.add(needle);
  const waypoint = new T.Mesh(
    new T.OctahedronGeometry(0.45),
    new T.MeshBasicMaterial({ color: 0x48cfff, depthTest: true }),
  );
  waypoint.name = "Blue next task beacon";
  waypoint.renderOrder = 0;
  ship.group.add(waypoint);
  const steeringOar = ship.group.getObjectByName("Ship wheel pivot")!;
  let rudder = 0;
  const gate = new T.Group();
  gate.name = "Sunlit sailing passage";
  root.add(gate);
  gate.visible = false;
  const channels = [
    { x: 18, z: -90 },
    { x: -12, z: -180 },
    { x: 26, z: -270 },
    { x: -10, z: -360 },
    { x: 0, z: -450 },
  ];
  const islands: { object: T.Mesh; x: number; z: number }[] = [];
  channels.forEach((channel, index) => {
    for (const side of [-1, 1]) {
      const rock = new T.Mesh(
        mountainGeometry(index * 2 + side + 1),
        material(0x666b5f),
      );
      rock.scale.set(20, 18, 24);
      rock.name = "Rocky island passage";
      gate.add(rock);
      islands.push({ object: rock, x: channel.x + side * 25, z: channel.z });
    }
  });
  let time = 0,
    storm = 1,
    disposed = false,
    phase = "brothers",
    heading = 0,
    gateIndex = 0,
    passage = 0,
    steeringTime = 0;
  let boatX = 0,
    boatZ = 0,
    contacts = 0;
  let checkpoint = { x: 0, z: 0 };
  let releaseCamera: { position: Point; focus: Point } | undefined;
  const desiredHeading = () => {
    const target = channels[Math.min(gateIndex, channels.length - 1)];
    return Math.atan2(target.x - boatX, boatZ - target.z);
  };
  const resetCourse = () => {
    contacts++;
    boatX = checkpoint.x;
    boatZ = checkpoint.z;
    heading = desiredHeading();
  };
  const updateVisuals = (dt: number) => {
    time += dt;
    steeringOar.rotation.z = T.MathUtils.damp(
      steeringOar.rotation.z,
      rudder * -0.8,
      5,
      dt,
    );
    const target =
      phase === "brothers"
        ? brothers
        : phase === "release" || phase === "pray"
          ? ship.points.boundNephi
          : phase === "liahona"
            ? ship.points.liahona
            : ship.points.helm;
    waypoint.visible = phase !== "steer" && phase !== "arrived";
    waypoint.position.set(
      target.x,
      target.y + 3 + Math.sin(time * 3) * 0.22,
      target.z,
    );
    waypoint.rotation.y = time;
    storm = T.MathUtils.damp(
      storm,
      ["brothers", "release", "pray"].includes(phase) ? 1 : 0,
      1.2,
      dt,
    );
    ship.group.position.y = Math.sin(time * 1.6) * (0.08 + storm * 0.14);
    ship.group.rotation.z = Math.sin(time * 1.3) * (0.012 + storm * 0.055);
    ship.group.rotation.x = Math.sin(time * 0.9) * (0.008 + storm * 0.018);
    for (let i = 0; i < oceanPositions.count; i++) {
      const x = oceanPositions.getX(i),
        z = oceanPositions.getZ(i);
      oceanPositions.setY(
        i,
        Math.sin(x * 0.055 + time * 1.7) * (0.22 + storm * 0.6) +
          Math.sin(z * 0.07 + time) * (0.18 + storm * 0.35),
      );
    }
    oceanPositions.needsUpdate = true;
    oceanGeometry.computeVertexNormals();
    foam.children.forEach((m, i) => {
      m.position.z += dt * (phase === "steer" ? 9 : 2);
      if (m.position.z > 170) m.position.z = -170;
      m.position.y = -0.85 + Math.sin(time + i) * 0.12;
    });
    oceanMaterial.color.setHex(storm > 0.4 ? 0x174d67 : 0x287f92);
    (scene.background as T.Color)
      .set(0x34475f)
      .lerp(new T.Color(0x9ed3d5), 1 - storm);
    if (scene.fog) scene.fog.color.copy(scene.background as T.Color);
    clouds.position.x = Math.sin(time * 0.02) * 30;
    clouds.position.y = (1 - storm) * 23;
    needle.rotation.z = -heading;
    if (phase === "steer") {
      for (const island of islands) {
        const dx = island.x - boatX,
          dz = island.z - boatZ;
        island.object.position.set(
          dx * Math.cos(heading) + dz * Math.sin(heading),
          -2,
          -dx * Math.sin(heading) + dz * Math.cos(heading),
        );
      }
      land.rotation.y = -heading;
    }
  };
  const world: WorldData = {
    name: "Across the Great Waters",
    initialObjective: "Find Laman and Lemuel below deck",
    subtitle: "An imagined child’s visit • 1 Nephi 18",
    spawn: { x: 2, y: 4.2, z: 2 },
    solids: ship.solids,
    climbables: ship.climbables,
    actorParent: ship.group,
    bounds: { minX: -8, maxX: 8, minZ: -20, maxZ: 20 },
    goal: { x: 0, y: 4.2, z: 17, radius: 2 },
    landmarks: [
      { name: "Common room · below deck", ...brothers },
      { name: "Nephi", ...ship.points.boundNephi },
      { name: "Liahona", ...ship.points.liahona },
      { name: "Ship wheel", ...ship.points.helm },
    ],
    update(dt, player) {
      if (!disposed) updateVisuals(Math.min(dt, 0.1));
      // Apply drift through velocity so shared swept collision still protects the hull.
      if (
        !disposed &&
        storm > 0.1 &&
        player.grounded &&
        player.y > 3.8 &&
        phase !== "steer"
      )
        player.vx += -Math.sin(ship.group.rotation.z) * 3 * Math.min(dt, 0.1);
    },
    adventure(hooks) {
      hooks.setAvatar("child");
      npcs
        .slice(0, 2)
        .forEach((npc, i) =>
          npc.group.position.set(i ? 0.85 : -0.85, 4.2, -6.2),
        );
      hooks.dialog(
        "An imagined visit",
        "The fourth day",
        "An imagined visit: you are a child aboard during the fourth day of the storm. Find Laman and Lemuel below deck.",
        () => {},
        {
          actors: [
            { group: npcs[2].group, gesture: "bound", speaker: true },
            ...npcs
              .slice(0, 2)
              .map((npc) => ({ group: npc.group, gesture: "work" as const })),
          ],
          focus: npcs[2].group,
        },
      );
      return {
        movementLocked: () =>
          phase === "steer" ||
          (phase === "release" && !releaseReady) ||
          openingTime < 4,
        camera: () =>
          phase === "steer"
            ? {
                position: { x: 0, y: 7.4, z: 20 },
                focus: { x: 0, y: 6, z: -70 },
              }
            : openingTime < 4
              ? {
                  position: { x: 8 - openingTime, y: 8, z: -12 },
                  focus: { x: 0, y: 5.3, z: -6.5 },
                }
              : releaseCamera,
        snapshot: () => ({
          phase,
          day: 4,
          heading,
          targetHeading: desiredHeading(),
          boat: { x: boatX, z: boatZ },
          channels,
          contacts,
          releaseReady,
          gateIndex,
          passage,
          steeringTime,
          targets: {
            brothers,
            nephi: ship.points.boundNephi,
            liahona: ship.points.liahona,
            helm: ship.points.helm,
          },
          storm,
        }),
        update(dt, player, input) {
          dt = Math.min(Math.max(dt, 0), 0.1);
          openingTime += dt;
          if (openingTime < 4) {
            npcs.slice(0, 2).forEach((npc, i) =>
              npc.update(dt, {
                x: i ? 0.85 : -0.85,
                y: 4.2,
                z: -6.2,
                vx: 0,
                vy: 0,
                vz: 0,
                yaw: i ? -Math.PI / 2 : Math.PI / 2,
                grounded: true,
                runSpeed: 0,
              }),
            );
            npcs.slice(0, 2).forEach((npc, i) => {
              const arm = npc.group.getObjectByName("right-arm");
              if (arm)
                arm.rotation.x = -1.1 + Math.sin(openingTime * 7 + i) * 0.4;
            });
            for (const name of ["right-arm", "left-arm"]) {
              const arm = npcs[2].group.getObjectByName(name);
              if (arm) arm.rotation.x = -0.9;
            }
            rope.visible = secondRope.visible = openingTime > 1.2;
            return {
              objective: "Laman and Lemuel bind Nephi to the mast",
              prompt: "The storm grows",
            };
          }
          if (phase === "brothers")
            npcs.slice(0, 2).forEach((npc, i) =>
              npc.update(dt, {
                ...positions[i],
                vx: 0,
                vy: 0,
                vz: 0,
                yaw: Math.PI,
                grounded: true,
                runSpeed: 0,
              }),
            );
          if (phase === "release" && !releaseReady) {
            const target = releaseRoute[releaseStep];
            let arrived = true;
            npcs.slice(0, 2).forEach((npc, i) => {
              const pos = npc.group.position,
                tx = target.x + (i ? 0.45 : -0.45),
                dx = tx - pos.x,
                dz = target.z - pos.z,
                distance = Math.hypot(dx, dz),
                advance = Math.min(distance, dt * 3);
              if (distance > 0.15) arrived = false;
              npc.update(dt, {
                x: pos.x + (distance ? (dx / distance) * advance : 0),
                y: T.MathUtils.damp(pos.y, target.y, 5, dt),
                z: pos.z + (distance ? (dz / distance) * advance : 0),
                vx: 0,
                vy: 0,
                vz: 0,
                yaw: Math.atan2(dx, dz),
                grounded: true,
                runSpeed: distance > 0.15 ? 3 : 0,
              });
            });
            // The child follows the same physical stair route while the brothers lead.
            const dx = target.x - player.x,
              dz = target.z - player.z,
              distance = Math.hypot(dx, dz);
            const strength = Math.min(0.48, distance);
            player.vx = distance ? (dx / distance) * strength * 6.5 : 0;
            player.vz = distance ? (dz / distance) * strength * 6.5 : 0;
            stepPlayer(
              player,
              {
                x: distance ? (-dx / distance) * strength : 0,
                y: distance ? (dz / distance) * strength : 0,
                jump: false,
                jumpHeld: false,
              },
              dt,
              0,
              ship.solids,
            );
            releaseCamera = {
              position: { x: player.x - 1.6, y: player.y + 2, z: player.z + 2 },
              focus: { x: player.x, y: player.y + 1, z: player.z - 2 },
            };
            arrived =
              arrived &&
              distance < 0.45 &&
              Math.abs(player.y - target.y) < 0.45;
            if (arrived) {
              releaseStep++;
              releaseReady = releaseStep === releaseRoute.length;
            }
            if (releaseReady) {
              rope.visible = false;
              secondRope.visible = false;
              releaseCamera = undefined;
              hooks.dialog(
                "1 Nephi 18:20",
                "Nephi is released",
                "At the mast, Laman and Lemuel loosen the ropes. The child stands beside them as Nephi is finally freed.",
                () => {},
                {
                  actors: npcs.map((npc, i) => ({
                    group: npc.group,
                    gesture: i === 2 ? "talk" : "work",
                    speaker: i === 2,
                  })),
                  focus: npcs[2].group,
                  wide: 7,
                },
              );
            }
          }
          let objective = "",
            prompt = "";
          if (phase === "brothers") {
            objective =
              "Find Laman and Lemuel below deck. Use the stairs on the right.";
            if (near(player, brothers)) {
              prompt = "{action} · Ask them to release Nephi";
              if (input.interact) {
                phase = "release";
                hooks.dialog(
                  "1 Nephi 18:13–15",
                  "The fourth day",
                  "The storm has become terrible. Laman and Lemuel agree to release Nephi. You follow them up the stairs to the mast.",
                  () => {},
                  {
                    actors: npcs.slice(0, 2).map((npc, i) => ({
                      group: npc.group,
                      gesture: "recoil",
                      speaker: i === 0,
                    })),
                    focus: npcs[0].group,
                  },
                );
              }
            }
          } else if (phase === "release") {
            objective =
              "Return up the stairs. Find Nephi beside the forward mast.";
            if (releaseReady && near(player, ship.points.boundNephi)) {
              prompt = "{action} · Stand with Nephi";
              if (input.interact) {
                phase = "pray";
                rope.visible = false;
                secondRope.visible = false;
                npcs[2].group.visible = false;
                hooks.setAvatar("nephi");
                hooks.dialog(
                  "Now play as Nephi",
                  "Turn toward God",
                  "Though his wrists are sore, Nephi praises God. Use {action} to pray.",
                  () => {},
                  {
                    actors: [],
                    playerGesture: "pray",
                    focus: ship.points.boundNephi,
                  },
                );
              }
            }
          } else if (phase === "pray") {
            objective = "As Nephi, pray for the people aboard.";
            prompt = "{action} · Pray";
            if (input.interact) {
              phase = "liahona";
              hooks.dialog(
                "1 Nephi 18:21",
                "Peace on the waters",
                "Nephi prays. The winds cease and the storm becomes calm. Find the Liahona near the stern.",
                () => {},
                {
                  actors: [],
                  playerGesture: "pray",
                  focus: ship.points.boundNephi,
                },
              );
            }
          } else if (phase === "liahona") {
            objective = "Find the golden Liahona on the rear deck.";
            if (near(player, ship.points.liahona)) {
              prompt = "{action} · Follow its direction";
              if (input.interact) {
                phase = "helm";
                hooks.toast(
                  "The Liahona works again. Take the ship wheel at the stern.",
                );
              }
            }
          } else if (phase === "helm") {
            objective = "Walk to the ship wheel at the back of the ship.";
            if (near(player, ship.points.helm)) {
              prompt = "{action} · Take the ship wheel";
              if (input.interact) {
                phase = "steer";
                gate.visible = true;
                hooks.toast(
                  "Steer left and right. Guide the bow through the open water between the rocky islands.",
                );
              }
            }
          } else if (phase === "steer") {
            steeringTime += dt;
            rudder = input.x;
            heading = wrap(
              heading + input.x * dt * 0.55 + Math.sin(time * 0.8) * dt * 0.018,
            );
            const previousZ = boatZ;
            boatX += Math.sin(heading) * dt * 9;
            boatZ -= Math.cos(heading) * dt * 9;
            const channel = channels[gateIndex];
            const hit = islands.some(
              (island) => Math.hypot(boatX - island.x, boatZ - island.z) < 15,
            );
            const crossing = previousZ > channel.z && boatZ <= channel.z;
            const failed =
              hit || (crossing && Math.abs(boatX - channel.x) > 10);
            if (failed) {
              resetCourse();
              hooks.toast(
                "Rocky water! Return to the last safe passage and aim for the open channel.",
              );
            }
            passage = Math.max(
              0,
              (checkpoint.z - boatZ) / (checkpoint.z - channel.z),
            );
            objective = `Sail through rocky passage ${gateIndex + 1} of ${channels.length}`;
            prompt = "Steer left / right · guide the bow through open water";
            if (!failed && crossing && Math.abs(boatX - channel.x) <= 10) {
              checkpoint = { x: boatX, z: boatZ - 16 };
              gateIndex++;
              if (gateIndex === channels.length) {
                phase = "arrived";
                gate.visible = false;
                land.position.z = 190;
                hooks.dialog(
                  "1 Nephi 18:23",
                  "A new shore",
                  "After many days, the family reaches the promised land. You helped Nephi guide the ship with patience and care.",
                  () => hooks.complete(),
                  {
                    actors: npcs
                      .slice(0, 2)
                      .map((npc) => ({ group: npc.group, gesture: "point" })),
                    focus: ship.points.helm,
                    wide: 10,
                  },
                );
              } else
                hooks.toast(
                  "Passage reached! Find the next gap between the islands.",
                );
            }
          } else {
            objective = "The promised shore lies ahead.";
            prompt = "Journey complete";
          }
          return { objective, prompt };
        },
        dispose() {
          gate.visible = false;
        },
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      npcs.forEach((n) => n.dispose());
      const geometries = new Set<T.BufferGeometry>(),
        materials = new Set<T.Material>();
      root.traverse((o) => {
        if (o instanceof T.InstancedMesh) o.dispose();
        if (o instanceof T.Mesh) {
          geometries.add(o.geometry);
          for (const m of Array.isArray(o.material) ? o.material : [o.material])
            materials.add(m);
        }
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      scene.remove(root);
    },
  };
  return world;
}
