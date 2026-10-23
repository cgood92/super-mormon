import { mountainGeometry } from "./soft-geometry";
import * as T from "three";
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
    new T.TorusGeometry(0.43, 0.065, 5, 12),
    material(0xb79d6c),
  );
  rope.rotation.x = Math.PI / 2;
  rope.position.set(-4, 5.05, -4);
  ship.group.add(rope);
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
  const needle = new T.Mesh(
    new T.ConeGeometry(0.17, 0.8, 3),
    material(0xfff2a7),
  );
  needle.rotation.x = -Math.PI / 2;
  needle.position.set(0, 0.6, 0);
  compass.add(needle);
  const waypoint = new T.Mesh(
    new T.OctahedronGeometry(0.45),
    new T.MeshBasicMaterial({ color: 0x48cfff, depthTest: false }),
  );
  waypoint.name = "Blue next task beacon";
  waypoint.renderOrder = 20;
  ship.group.add(waypoint);
  const steeringOar = ship.group.getObjectByName("Steering oar pivot")!;
  let rudder = 0;
  const gate = new T.Group();
  gate.name = "Sunlit sailing passage";
  root.add(gate);
  gate.visible = false;
  for (const side of [-1, 1]) {
    const beacon = new T.Mesh(new T.ConeGeometry(3, 12, 5), material(0xefd686));
    beacon.position.set(side * 11, 5, 0);
    gate.add(beacon);
  }
  let time = 0,
    storm = 1,
    disposed = false,
    phase = "brothers",
    heading = 0,
    gateIndex = 0,
    passage = 0,
    steeringTime = 0;
  const courses = [0.62, -0.48, 0.85, -0.25, 0];
  const updateVisuals = (dt: number) => {
    time += dt;
    steeringOar.rotation.y = T.MathUtils.damp(
      steeringOar.rotation.y,
      rudder * 0.35,
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
      const error = wrap(courses[gateIndex] - heading);
      const distance = 75 - passage * 7;
      gate.position.set(
        Math.sin(error) * distance,
        0,
        -Math.cos(error) * distance,
      );
      gate.rotation.y = -error;
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
      { name: "Steering oar", ...ship.points.helm },
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
      hooks.dialog(
        "An imagined visit",
        "The fourth day",
        "An imagined visit: you are a child aboard during the fourth day of the storm. Find Laman and Lemuel below deck.",
        () => {},
        {
          actors: [{ group: npcs[2].group, gesture: "bound", speaker: true }],
          focus: npcs[2].group,
        },
      );
      return {
        movementLocked: () => phase === "steer",
        snapshot: () => ({
          phase,
          day: 4,
          heading,
          targetHeading: courses[Math.min(gateIndex, 4)],
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
                  "The storm has become terrible. Laman and Lemuel finally release Nephi. Go to him on deck.",
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
            if (near(player, ship.points.boundNephi)) {
              prompt = "{action} · Stand with Nephi";
              if (input.interact) {
                phase = "pray";
                rope.visible = false;
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
                  "The Liahona works again. Take the steering oar at the stern.",
                );
              }
            }
          } else if (phase === "helm") {
            objective = "Walk to the steering oar at the back of the ship.";
            if (near(player, ship.points.helm)) {
              prompt = "{action} · Take the steering oar";
              if (input.interact) {
                phase = "steer";
                gate.visible = true;
                hooks.toast(
                  "Stick left/right turns the ship. Keep each golden passage straight ahead.",
                );
              }
            }
          } else if (phase === "steer") {
            steeringTime += dt;
            rudder = input.x;
            heading = wrap(
              heading + input.x * dt * 0.55 + Math.sin(time * 0.8) * dt * 0.018,
            );
            const error = wrap(courses[gateIndex] - heading);
            if (Math.abs(error) < 0.17) passage += dt;
            else passage = Math.max(0, passage - dt * 0.22);
            objective = `Sail through passage ${gateIndex + 1} of 5 · ${Math.round((passage / 6) * 100)}%`;
            prompt =
              Math.abs(error) < 0.17
                ? "Hold this course · steady!"
                : `${error > 0 ? "Turn right →" : "← Turn left"} · ${Math.round((Math.abs(error) * 180) / Math.PI)}°`;
            if (passage >= 6) {
              passage = 0;
              gateIndex++;
              if (gateIndex === courses.length) {
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
                hooks.toast("Passage reached! Follow the next golden opening.");
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
