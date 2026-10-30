import * as T from "three";
import { createCharacter } from "../../characters/character";
import type { PlayerState } from "../../physics/physics";
import { markScenery } from "../shared/scenery";

type Walker = {
  group: T.Group;
  speed: number;
  direction: number;
  animate(dt: number, moving: boolean): void;
  dispose(): void;
};

/** Soft moving inhabitants follow open sidewalks; fixed architecture owns collision. */
export function buildStreetLife(root: T.Group) {
  const walkers: Walker[] = [];
  const outfits = [
    [0x628ca1, 0x354452, 0x33271f],
    [0xb76045, 0x343e56, 0x4f3021],
    [0x6e8a54, 0x564b43, 0x24201d],
    [0xc8a455, 0x354855, 0xa38a68],
    [0x8675a4, 0x454040, 0x603c27],
    [0x4f9d93, 0x5d5460, 0xaaa099],
  ];
  outfits.forEach(([shirt, trousers, hair], i) => {
    const rig = createCharacter("missionary", { quality: "crowd" });
    const clones: T.Material[] = [];
    const group = rig.group;
    group.name = `Neighborhood resident ${i + 1}`;
    group.scale.setScalar([0.95, 1.04, 0.9, 1, 0.97, 1.07][i]);
    group.position.set(
      [-25, 19, -14, 25, -3, 8][i],
      0.08,
      [-14.2, 3.8, 21.8, 38.8, -14.2, 21.8][i],
    );
    group.traverse((o) => {
      if (!(o instanceof T.Mesh)) return;
      markScenery(o, {
        kind: "decoration",
        reason:
          "Moving neighborhood resident; intentionally yields to players.",
      });
      if (["modern-tie", "missionary-name-tag"].includes(o.name))
        o.visible = false;
      const color =
        o.name === "continuous-robe-and-sleeves"
          ? shirt
          : ["left-trouser", "right-trouser", "modern-waistband"].includes(
                o.name,
              )
            ? trousers
            : o.name === "single-sculpted-hair-cap"
              ? hair
              : undefined;
      if (color !== undefined) {
        const recolor = (m: T.Material) => {
          const clone = m.clone() as T.MeshStandardMaterial;
          clone.color.setHex(color);
          clones.push(clone);
          return clone;
        };
        o.material = Array.isArray(o.material)
          ? o.material.map(recolor)
          : recolor(o.material);
      }
    });
    root.add(group);
    const walker: Walker = {
      group,
      speed: 0.65 + i * 0.045,
      direction: i % 2 ? -1 : 1,
      animate(dt, moving) {
        rig.update(dt, {
          x: group.position.x,
          y: 0.08,
          z: group.position.z,
          vx: moving ? walker.direction * walker.speed : 0,
          vy: 0,
          vz: 0,
          yaw: (walker.direction * Math.PI) / 2,
          grounded: true,
          runSpeed: moving ? walker.speed : 0,
          move: moving ? "run" : "idle",
        });
      },
      dispose() {
        rig.dispose();
        clones.forEach((m) => m.dispose());
        group.removeFromParent();
      },
    };
    walker.animate(0, false);
    walkers.push(walker);
  });
  for (let i = 0; i < 3; i++) {
    const group = new T.Group();
    group.name = `Neighborhood dog ${i + 1}`;
    group.position.set([-21, 0, 23][i], 0.08, [39, 3.8, 38.8][i]);
    group.scale.setScalar([1, 0.78, 1.12][i]);
    const fur = new T.MeshStandardMaterial({
      color: [0xb88750, 0xeee3ce, 0x51463e][i],
      roughness: 0.95,
    });
    const dark = new T.MeshStandardMaterial({
      color: 0x252321,
      roughness: 0.9,
    });
    const geometries: T.BufferGeometry[] = [];
    const shape = (
      name: string,
      size: number[],
      position: number[],
      material = fur,
    ) => {
      const geometry = new T.BoxGeometry(...(size as [number, number, number]));
      geometries.push(geometry);
      const mesh = new T.Mesh(geometry, material);
      mesh.name = name;
      mesh.position.set(...(position as [number, number, number]));
      group.add(mesh);
      markScenery(mesh, {
        kind: "decoration",
        reason: "Moving neighborhood dog; soft nonblocking character.",
      });
      return mesh;
    };
    shape("dog-body", [0.38, 0.38, 0.85], [0, 0.59, 0]);
    shape("dog-chest", [0.4, 0.43, 0.3], [0, 0.64, 0.29]);
    shape("dog-head", [0.35, 0.33, 0.37], [0, 0.91, 0.4]);
    shape("dog-muzzle", [0.24, 0.18, 0.28], [0, 0.84, 0.64]);
    shape("dog-nose", [0.15, 0.12, 0.05], [0, 0.87, 0.79], dark);
    for (const side of [-1, 1]) {
      const ear = shape(
        "dog-floppy-ear",
        [0.12, 0.3, 0.2],
        [side * 0.2, 0.91, 0.34],
        dark,
      );
      ear.rotation.z = side * 0.18;
      shape("dog-eye", [0.04, 0.05, 0.045], [side * 0.13, 0.98, 0.59], dark);
    }
    const legs = [
      [-0.13, 0.3],
      [0.13, 0.3],
      [-0.13, -0.3],
      [0.13, -0.3],
    ].map(([x, z]) => {
      const pivot = new T.Group();
      pivot.position.set(x, 0.48, z);
      group.add(pivot);
      const leg = shape("dog-leg", [0.12, 0.43, 0.13], [0, -0.21, 0]);
      pivot.add(leg);
      return pivot;
    });
    const tailPivot = new T.Group();
    tailPivot.position.set(0, 0.69, -0.4);
    group.add(tailPivot);
    const tail = shape("dog-tail", [0.1, 0.1, 0.48], [0, 0.11, -0.2]);
    tail.rotation.x = 0.5;
    tailPivot.add(tail);
    root.add(group);
    let phase = i;
    const walker: Walker = {
      group,
      speed: 0.85 + i * 0.08,
      direction: i % 2 ? -1 : 1,
      animate(dt, moving) {
        if (moving) phase += dt * 7;
        legs.forEach(
          (leg, j) =>
            (leg.rotation.x = moving
              ? Math.sin(phase + (j === 0 || j === 3 ? 0 : Math.PI)) * 0.5
              : 0),
        );
        tailPivot.rotation.y = Math.sin(phase) * 0.35;
        group.rotation.y = (walker.direction * Math.PI) / 2;
      },
      dispose() {
        group.removeFromParent();
        geometries.forEach((g) => g.dispose());
        fur.dispose();
        dark.dispose();
        group.clear();
      },
    };
    walker.animate(0, false);
    walkers.push(walker);
  }
  let disposed = false;
  return {
    update(dt: number, player?: PlayerState) {
      if (disposed || !Number.isFinite(dt) || dt <= 0) return;
      // Substeps preserve player clearance even after a long frame.
      let remaining = Math.min(dt, 2);
      while (remaining > 0) {
        const step = Math.min(remaining, 0.1);
        remaining -= step;
        walkers.forEach((w) => {
          const p = w.group.position;
          if (
            p.x + w.direction * w.speed * step > 29 ||
            p.x + w.direction * w.speed * step < -29
          )
            w.direction *= -1;
          const next = p.x + w.direction * w.speed * step;
          const blocked =
            player &&
            Math.abs(player.y - p.y) < 2 &&
            Math.min(
              Math.hypot(player.x - p.x, player.z - p.z),
              Math.hypot(player.x - next, player.z - p.z),
            ) < 1.7;
          if (!blocked) p.x = next;
          w.animate(step, !blocked);
        });
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      walkers.forEach((w) => w.dispose());
    },
  };
}
