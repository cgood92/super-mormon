import * as T from "three";
import { warWorld, nearWarPoint as near } from "../shared/war-world-kit";
import { markScenery } from "../shared/scenery";
import type { WorldData } from "../../runtime/worlds";
import type { AdventureRuntime } from "../../runtime/adventure";
export const CROSSING_TARGETS = Object.freeze({
  supply: { x: -7, y: 0, z: 8 },
  socket: { x: 7, y: 0, z: 8 },
  fodder: { x: -7, y: 0, z: 13 },
  animals: { x: -4, y: 0, z: -9 },
  vent: { x: 8, y: 3, z: -15 },
  shore: { x: 0, y: 0, z: 37 },
});
for (const point of Object.values(CROSSING_TARGETS)) Object.freeze(point);

export function buildJaredCrossing(scene: T.Scene): WorldData {
  const land = warWorld(scene, "Light upon the waters · vessel interior", true),
    { root, solid, decor, actor, solids } = land;
  const ground = root.getObjectByName("Single earth walk surface") as T.Mesh;
  (ground.material as T.MeshStandardMaterial).color.setHex(0x8c704b);
  // Open camera cutaway: these walls represent a tight closed vessel, not windows.
  for (const x of [-12, 12])
    solid(
      { x, y: 0, z: 0, w: 0.6, h: 5.5, d: 44 },
      0x6e5035,
      "Solid vessel side",
    );
  solid(
    { x: 0, y: 0, z: -22, w: 24, h: 5.5, d: 0.6 },
    0x67472e,
    "Solid vessel end",
  );
  const gate = solid(
    { x: 0, y: 0, z: 22, w: 24, h: 5.5, d: 0.6 },
    0x67472e,
    "Closed shore hatch",
  );
  for (const x of [-11.5, 11.5])
    for (let z = -19; z < 22; z += 5)
      solid({ x, y: 0, z, w: 0.8, h: 5.3, d: 0.55 }, 0xa08556, "Hull rib");
  const seams = new T.InstancedMesh(
    new T.BoxGeometry(23, 0.012, 0.035),
    new T.MeshStandardMaterial({ color: 0x5e472e, roughness: 1 }),
    42,
  );
  const seamMatrix = new T.Matrix4();
  for (let i = 0; i < 42; i++) {
    seamMatrix.makeTranslation(0, 0.009, -20.5 + i);
    seams.setMatrixAt(i, seamMatrix);
  }
  seams.name = "Deck plank seams";
  markScenery(seams, {
    kind: "decoration",
    reason:
      "Shallow wood grain seams above the single structural floor, without duplicate support.",
  });
  root.add(seams);
  // A raised vent work aisle reached by broad fitted stair treads.
  solid(
    { x: 8, y: 0, z: -15, w: 5, h: 3, d: 12 },
    0x8c704b,
    "Vent service landing",
  );
  for (let i = 0; i < 12; i++)
    solid(
      { x: 8, y: 0, z: -0.4 - i * 0.7, w: 5, h: (i + 1) * 0.25, d: 0.7 },
      0xa58a5b,
      "Vent stair",
    );
  const vent = decor(
    { x: 8, y: 5.2, z: -15, w: 1.5, h: 0.2, d: 1.5 },
    0xb69a65,
    "Upper air opening lid",
    "Movable air lid; roof omitted as an explicit camera cutaway, not an open vessel.",
  );
  for (const z of [-18, 18]) {
    const s = decor(
      { x: 0, y: 0.8, z, w: 0.48, h: 0.4, d: 0.48 },
      0xffecb5,
      "One stone at each vessel end",
      "The two prepared stones provide continual light, including beneath the waves.",
    );
    (s.material as T.MeshStandardMaterial).emissive.setHex(0xffd183);
    const light = new T.PointLight(0xffd398, 3.5, 28);
    light.position.set(0, 2, z);
    root.add(light);
  }
  for (const z of [-16, -9]) {
    solid(
      { x: -8, y: 0, z: z - 2, w: 6, h: 1.2, d: 0.25 },
      0xb09663,
      "Animal pen rail",
    );
    solid(
      { x: -11, y: 0, z, w: 0.25, h: 1.2, d: 4 },
      0xb09663,
      "Animal pen side",
    );
    solid(
      { x: -5, y: 0, z, w: 0.25, h: 1.2, d: 4 },
      0xb09663,
      "Animal pen side",
    );
    for (const x of [-9, -7]) {
      const body = decor(
        { x, y: 0.5, z, w: 0.7, h: 0.7, d: 1.2 },
        0xc1b292,
        "Resting flock animal",
        "Small animal within a solid pen; the rails own passage collision.",
      );
      decor(
        { x, y: 1.1, z: z + 0.5, w: 0.4, h: 0.4, d: 0.4 },
        0xc1b292,
        "Flock animal head",
        "Visual animal inside pen.",
      );
      body.rotation.y = 0.15;
    }
  }
  const trough = decor(
    { x: -5.7, y: 0.4, z: -9, w: 1, h: 0.4, d: 1.7 },
    0x68523c,
    "Empty feed trough",
    "Visible care task; positioned on the aisle side of the solid pen.",
  );
  for (const [x, z] of [
    [-8, 17],
    [7, 16],
    [-8, 3],
    [7, -5],
  ] as const)
    solid(
      { x, y: 0, z, w: 3, h: 1.5, d: 2 },
      0x98754a,
      "Secured provision stack",
    );
  const supply = decor(
    { x: -7, y: 0.2, z: 8, w: 1, h: 0.8, d: 1 },
    0xc5a265,
    "Loose provision basket",
    "Movable secured-supply task with a visible carrier.",
  );
  const fodder = decor(
    { x: -7, y: 0.2, z: 13, w: 1.1, h: 0.7, d: 1 },
    0x899558,
    "Feed bundle",
    "Movable bundle carried to the animal trough.",
  );
  const rope = decor(
    { x: 7, y: 0.03, z: 8, w: 2, h: 0.06, d: 2 },
    0xd1bc87,
    "Lashing bay",
    "Floor lashing marker on the single support surface.",
  );
  actor("jared-brother", { x: 3, y: 0, z: -17 }, "The brother of Jared");
  actor("wife", { x: 3, y: 0, z: 13 }, "Unnamed family member");
  actor("convert", { x: -2, y: 0, z: 14 }, "Unnamed traveler");
  // Shore is accessible after the vessel has arrived. The same floor owns beach support.
  for (const x of [-23, 23]) land.tree(x, 43);
  for (let i = 0; i < 7; i++)
    decor(
      { x: -45 + i * 15, y: 0.03, z: 58, w: 12, h: 0.04, d: 15 },
      0x5e9fad,
      "Sea at the landing",
      "Shallow visual beside the beach; ground owns support.",
    );
  solid(
    { x: 18, y: 0, z: 47, w: 8, h: 3, d: 7 },
    0x8e9884,
    "Beach lookout rock",
  );
  for (let i = 0; i < 12; i++)
    solid(
      { x: 18, y: 0, z: 37 + i * 0.55, w: 4, h: (i + 1) * 0.25, d: 0.55 },
      0xa2ab93,
      "Beach lookout stair",
    );
  let disposed = false;
  const runtimes = new Set<AdventureRuntime>();
  return {
    name: "Light upon the Waters",
    subtitle: "Ether 6 · 344 days condensed · imagined interior",
    initialObjective: "Carry the loose basket across to the lashing bay.",
    spawn: { x: 0, y: 0, z: 8 },
    solids,
    actorParent: root,
    bounds: { minX: -50, maxX: 50, minZ: -27, maxZ: 65 },
    goal: { ...CROSSING_TARGETS.shore, radius: 3 },
    landmarks: Object.entries(CROSSING_TARGETS).map(([name, p]) => ({
      name,
      ...p,
    })),
    adventure(hooks) {
      let elapsed = 0,
        secured = false,
        fed = false,
        carrying: "" | "supply" | "fodder" = "",
        ventOpen = false,
        airTime = 0,
        ventilated = false,
        closedSafely = false,
        landed = false,
        completed = false,
        stopped = false,
        missedWindows = 0;
      const discoveries = new Set<string>();
      hooks.setAvatar("jared");
      hooks.toast(
        "344 days are condensed here. Wind drives the vessels; this cutaway interior and care tasks are imagined. Two stones light this vessel continually.",
      );
      const phase = () =>
        elapsed % 18 < 9 ? "calm" : elapsed % 18 < 12 ? "warning" : "submerged";
      const runtime: AdventureRuntime = {
        update(dt, p, input) {
          let prompt = "";
          if (!disposed && !stopped) {
            const delta = Number.isFinite(dt)
              ? Math.max(0, Math.min(dt, 0.05))
              : 0;
            elapsed += delta;
            const state = phase();
            prompt = landed
              ? "The shore hatch is open"
              : state === "calm"
                ? "Above water: calm air window"
                : state === "warning"
                  ? "Amber waves: close the air lid"
                  : "Submerged: keep the air lid closed";
            (scene.background as T.Color).setHex(
              landed
                ? 0xc5d9d5
                : state === "submerged"
                  ? 0x122b41
                  : state === "warning"
                    ? 0x53647d
                    : 0x7898af,
            );
            vent.rotation.z = ventOpen ? -0.65 : 0;
            if (!secured && !carrying && near(p, CROSSING_TARGETS.supply)) {
              prompt = "Lift the loose provision basket";
              if (input.interact) carrying = "supply";
            } else if (
              carrying === "supply" &&
              near(p, CROSSING_TARGETS.socket)
            ) {
              prompt = "Lash the basket into the sheltered bay";
              if (input.interact) {
                secured = true;
                carrying = "";
                supply.position.set(7, 0.6, 8);
                rope.scale.y = 5;
                hooks.toast(
                  "The basket is lashed firmly. It stays secure through the storm.",
                );
              }
            } else if (
              secured &&
              !fed &&
              !carrying &&
              near(p, CROSSING_TARGETS.fodder)
            ) {
              prompt = "Carry fodder to the animals";
              if (input.interact) carrying = "fodder";
            } else if (
              carrying === "fodder" &&
              near(p, CROSSING_TARGETS.animals)
            ) {
              prompt = "Fill the animal trough";
              if (input.interact) {
                fed = true;
                carrying = "";
                fodder.position.set(-5.7, 0.8, -9);
                trough.scale.y = 1.4;
                hooks.toast(
                  "The animals have feed within their sheltered pen.",
                );
              }
            }
            if (near(p, CROSSING_TARGETS.vent, 2)) {
              prompt = ventOpen
                ? "Close the lid before the amber warning"
                : state === "calm"
                  ? "Open the air lid while above water"
                  : "Keep the air lid closed. Another calm window follows.";
              if (input.interact) {
                if (ventOpen) {
                  ventOpen = false;
                  if (ventilated) closedSafely = true;
                } else if (state === "calm") ventOpen = true;
              }
            }
            if (ventOpen) {
              airTime += delta;
              if (airTime >= 2) ventilated = true;
              if (state !== "calm") {
                ventOpen = false;
                missedWindows++;
                hooks.toast(
                  "The safety cover settles closed as waves rise. Wait for the next calm window.",
                );
              }
            }
            if (carrying) {
              const o = carrying === "supply" ? supply : fodder;
              o.position.set(
                p.x - Math.sin(p.yaw) * 0.6,
                p.y + 0.9,
                p.z - Math.cos(p.yaw) * 0.6,
              );
              o.rotation.y = p.yaw;
            }
            if (
              !landed &&
              secured &&
              fed &&
              ventilated &&
              closedSafely &&
              elapsed >= 54
            ) {
              landed = true;
              gate.visible = false;
              const index = solids.findIndex((s) => s.z === 22 && s.w === 24);
              if (index >= 0) solids.splice(index, 1);
              hooks.dialog(
                "Ether 6:11–12",
                "After 344 days",
                "The wind brought them to the promised land. They went ashore and gave thanks. Caring for this vessel did not steer it or create the arrival; the long crossing is condensed here.",
                () => {},
              );
            }
            if (landed && !completed && near(p, CROSSING_TARGETS.shore, 3)) {
              completed = true;
              hooks.complete();
            }
            for (const [id, q, text] of [
              [
                "family",
                { x: 3, y: 0, z: 13 },
                "Families shared the crossing and praised the Lord (Ether 6:9).",
              ],
              [
                "storage",
                { x: -8, y: 0, z: 17 },
                "Food was prepared for people and animals (Ether 6:4).",
              ],
              [
                "coast",
                { x: 18, y: 3, z: 47 },
                "A new shore: the exact geography and this lookout are imagined.",
              ],
            ] as const)
              if (near(p, q) && !discoveries.has(id)) {
                discoveries.add(id);
                hooks.toast(text);
              }
          }
          return {
            objective: completed
              ? "Explore the shore and the vessel freely."
              : landed
                ? "Walk through the shore hatch and explore the beach."
                : !secured
                  ? "Carry the loose basket across to the lashing bay."
                  : !fed
                    ? "Carry feed from the storage bay to the animal trough."
                    : !ventilated
                      ? "Use the east stairs. Open the air lid during calm."
                      : !closedSafely
                        ? "Close the air lid before the amber wave warning."
                        : "Stay sheltered as wind carries the vessel onward.",
            prompt,
            carrying: !!carrying,
          };
        },
        snapshot: () => ({
          elapsed,
          phase: phase(),
          secured,
          fed,
          carrying,
          ventOpen,
          airTime,
          ventilated,
          closedSafely,
          landed,
          completed,
          missedWindows,
          discoveries: [...discoveries],
          daysCondensed: 344,
          lights: 2,
          targets: CROSSING_TARGETS,
        }),
        dispose() {
          stopped = true;
          runtimes.delete(runtime);
        },
      };
      runtimes.add(runtime);
      return runtime;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const r of runtimes) r.dispose();
      land.dispose();
    },
  };
}
