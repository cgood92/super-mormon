import * as T from "three";
import { planStoryCamera, StoryMeshObstacles } from "../../camera/cinematic";
import { createCharacter } from "../../characters/character";
import { createPlayer, stepPlayer } from "../../physics/physics";
import type { AdventureHooks, AdventureRuntime } from "../../runtime/adventure";
import type { Point, Solid } from "../../runtime/worlds";

/** 1 Nephi 1:18–20; dialogue, listeners, blue door and escape route are imagined. */
export function createLehiOpening(
  root: T.Group,
  solids: Solid[],
  spawn: Point,
  home: Point,
  hooks: AdventureHooks,
): AdventureRuntime {
  const lehi = hooks.avatar ?? new T.Group();
  if (!hooks.avatar) lehi.position.set(spawn.x, spawn.y, spawn.z);
  const listeners = (
    [
      ["convert", -3.2, 28],
      ["spy", 1.8, 29],
      ["maidservant", 4.2, 27.8],
    ] as const
  ).map(([role, x, z], i) => {
    const rig = createCharacter(role);
    rig.group.name = `Jerusalem listener ${i + 1} · imagined`;
    root.add(rig.group);
    const state = createPlayer(x, 0, z);
    state.yaw = Math.atan2(spawn.x - x, spawn.z - z);
    rig.update(0, state);
    return { rig, state };
  });
  // A framing anchor just outside the visible door, never inside its solid house.
  const doorway = new T.Group();
  doorway.position.set(home.x + 0.96, home.y, home.z);
  root.add(doorway);
  // Frame the confrontation as a group, including Lehi on a narrow phone view.
  const confrontation = new T.Group();
  confrontation.position.set(-1, 0, 26.5);
  confrontation.scale.setScalar(2);
  root.add(confrontation);
  const obstacles = new StoryMeshObstacles(root, [
    { group: lehi },
    ...listeners.map(({ rig }) => ({ group: rig.group })),
  ]);
  let elapsed = 0;
  let plannedBeat = -1,
    plannedAspect = 0;
  let camera: ReturnType<NonNullable<AdventureRuntime["camera"]>>;
  let disposed = false;
  const beat = () => (elapsed < 5 ? 0 : elapsed < 9 ? 1 : elapsed < 12 ? 2 : 3);
  const names = ["warning", "angry-crowd", "blue-door", "escape"];
  const objectives = [
    "Lehi warns Jerusalem: repent and turn to the Lord. · 1 Nephi 1:18–19",
    "The people mock Lehi and become angry. His life is in danger. · 1 Nephi 1:19–20",
    "Lehi’s home is behind the blue door, around the western houses.",
    "Help Lehi get home safely. Avoid the angry people and find the blue door!",
  ];
  return {
    movementLocked: () => !disposed && elapsed < 15,
    camera: () => camera,
    snapshot: () => ({
      phase: elapsed < 15 ? "intro" : "escape",
      movieBeat: elapsed < 15 ? names[beat()] : undefined,
      elapsed,
    }),
    update(dt, player) {
      if (disposed || elapsed >= 15)
        return { objective: objectives[3], prompt: "" };
      dt = Math.max(0, Math.min(dt, 0.1));
      elapsed = Math.min(15, elapsed + dt);
      const current = beat();
      player.yaw = current === 3 ? -Math.PI / 2 : 0;
      for (const [i, { rig, state }] of listeners.entries()) {
        if (current === 1 && i === 1) {
          const dx = spawn.x - state.x,
            dz = spawn.z - state.z;
          const d = Math.hypot(dx, dz);
          stepPlayer(
            state,
            {
              x: d > 3 ? (-dx / d) * 0.12 : 0,
              y: d > 3 ? (dz / d) * 0.12 : 0,
              jump: false,
              jumpHeld: false,
              traversal: false,
            },
            dt,
            0,
            solids,
          );
        }
        rig.update(dt, {
          ...state,
          pointing: current === 1 && i !== 2,
          lookYaw: state.yaw,
        });
      }
      const aspect = hooks.viewAspect?.() ?? 16 / 9;
      if (current !== plannedBeat || aspect !== plannedAspect) {
        plannedBeat = current;
        plannedAspect = aspect;
        const anchor =
          current === 2 ? doorway : current === 1 ? confrontation : lehi;
        const probe = new T.PerspectiveCamera(58, aspect, 0.08, 320);
        probe.position
          .copy(anchor.position)
          .add(
            current === 2
              ? new T.Vector3(-1.6, 2.4, 5.8)
              : current === 1
                ? new T.Vector3(-2.5, 2.5, -5)
                : new T.Vector3(4, 2.8, 6),
          );
        probe.lookAt(anchor.position);
        root.updateWorldMatrix(true, true);
        const plan = planStoryCamera(
          probe,
          {
            cutaway: true,
            actors: [{ group: anchor }],
            wide:
              current === 1 ? 9 : current === 2 ? 4 : current === 3 ? 5 : 4.5,
          },
          solids,
          obstacles,
        );
        camera = { position: plan.wide, focus: plan.focus, cut: true };
      }
      if (elapsed >= 15) {
        camera = undefined;
        hooks.toast(objectives[3]);
      }
      return {
        objective: objectives[current],
        prompt: "",
        pointing: current === 0 && elapsed < 4.5,
      };
    },
    dispose() {
      disposed = true;
      camera = undefined;
      listeners.forEach(({ rig }) => rig.dispose());
      root.remove(doorway, confrontation);
    },
  };
}
