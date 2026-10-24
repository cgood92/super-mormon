import * as T from "three";
import { sceneryBox, markScenery } from "./scenery";
import { createCharacter } from "./character";
import type { Solid, PlayerState } from "./physics";

/** An imagined family encampment, clear of the forge and timber carrying corridor. */
export function buildFamilyCamp(parent: T.Group, solids: Solid[]) {
  const group = new T.Group();
  group.name = "Family camp · imagined household shelters";
  parent.add(group);
  const cloth = new T.MeshStandardMaterial({
    color: 0xb99368,
    roughness: 1,
    side: T.DoubleSide,
  });
  const wood = new T.MeshStandardMaterial({ color: 0x755335, roughness: 1 });
  const mat = new T.MeshStandardMaterial({ color: 0x99734c, roughness: 1 });
  const families = [
    "Lehi and Sariah",
    "Nephi’s family",
    "Sam’s family",
    "Laman’s family",
    "Lemuel’s family",
    "Zoram’s family",
    "Ishmael’s first son’s family",
    "Ishmael’s second son’s family",
  ];
  const tents = families.map((name, i) => ({
    name,
    x: -18 + (i % 4) * 9,
    z: 33 + Math.floor(i / 4) * 12,
  }));
  const box = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    name: string,
    material: T.Material = cloth,
  ) => sceneryBox(group, solids, material, { x, y, z, w, h, d }, name);
  for (const tent of [
    ...tents,
    { name: "Shared family shelter", x: -18, z: 57 },
  ]) {
    const { x, z, name } = tent;
    const half = name === "Shared family shelter" ? 4 : 3;
    // Front faces the shared southern courtyard. Wide doorway has no invisible slab.
    box(x - half, 0, z, 0.16, 2.5, 6, `${name} · left canvas wall`);
    box(x + half, 0, z, 0.16, 2.5, 6, `${name} · right canvas wall`);
    box(x, 0, z + 3, half * 2, 2.5, 0.16, `${name} · back canvas wall`);
    for (const side of [-1, 1])
      box(
        x + side * ((half + 1.3) / 2),
        0,
        z - 3,
        half - 1.3,
        2.5,
        0.16,
        `${name} · doorway canvas`,
      );
    box(x, 2.5, z - 3, 2.6, 0.5, 0.16, `${name} · door lintel`);
    box(x, 0, z + 1.8, 4.4, 0.1, 1.8, `${name} · sleeping mat`, mat);
    for (const side of [-1, 1])
      box(
        x + side * (half - 0.2),
        0,
        z - 2.8,
        0.14,
        3,
        0.14,
        `${name} · tent pole`,
        wood,
      );
    const roof = new T.Mesh(new T.ConeGeometry(4.4, 1.8, 4), cloth);
    roof.position.set(x, 3.35, z);
    roof.rotation.y = Math.PI / 4;
    roof.scale.x = half / 3;
    roof.name = `${name} · canopy`;
    markScenery(roof, {
      kind: "decoration",
      reason: "Overhead canvas canopy above solid wall and doorway supports",
    });
    group.add(roof);
    box(x + 2, 0, z - 4, 0.4, 0.7, 0.4, `${name} · lamp stand`, wood);
    const lamp = new T.Mesh(
      new T.SphereGeometry(0.16, 6, 4),
      new T.MeshBasicMaterial({ color: 0xffcc74 }),
    );
    lamp.position.set(x + 2, 0.85, z - 4);
    lamp.name = "Warm family lamp";
    group.add(lamp);
  }
  // Only four nearby rigs animate; all use the existing crowd geometry budget.
  const actors = [
    createCharacter("wife", { quality: "crowd" }),
    createCharacter("wife", { quality: "crowd" }),
    createCharacter("child", { quality: "crowd" }),
    createCharacter("child", { quality: "crowd" }),
  ];
  actors.forEach((actor, i) => {
    group.add(actor.group);
    actor.group.name =
      i < 2 ? "Mother watching the children" : "Child playing in the courtyard";
  });
  let time = 0;
  const update = (dt: number, player: Pick<PlayerState, "x" | "z">) => {
    if (Math.hypot(player.x + 4, player.z - 24) > 45) return;
    time += Math.min(Math.max(dt, 0), 0.1);
    actors.forEach((actor, i) => {
      const child = i > 1,
        angle = time * (child ? 0.65 : 0) + i * Math.PI;
      const x = child ? -4 + Math.cos(angle) * 3 : -12 + i * 14,
        z = child ? 24 + Math.sin(angle) * 2 : 27;
      actor.update(dt, {
        x,
        y: 0,
        z,
        vx: 0,
        vy: 0,
        vz: 0,
        yaw: child ? -angle : Math.PI,
        grounded: true,
        runSpeed: child ? 1.6 : 0,
      });
    });
  };
  update(0, { x: -4, z: 24 });
  return {
    group,
    tents,
    update,
    dispose: () => actors.forEach((actor) => actor.dispose()),
  };
}
