import * as T from "three";
import { adventureLandscape, withinTask } from "../shared/adventure-landscape";
import { buildNephiteTemple } from "../shared/nephite-temple";
import type { WorldData } from "../../runtime/worlds";
import {
  createCharacter,
  type CharacterRole,
} from "../../characters/character";

/** Jacob 7:1–23. Architecture and exploration staging are interpretive. */
export function buildJacobSherem(scene: T.Scene): WorldData {
  const land = adventureLandscape(
    scene,
    "Jacob's settlement",
    0xb3b081,
    170,
    180,
  );
  const { root, solids, solid } = land;
  const temple = buildNephiteTemple(root, solids);
  // The expanded north approach must remain in front of the distant backdrop.
  root.traverse((object) => {
    if (object.name === "Distant rolling hills") object.position.z -= 40;
  });
  // Open doorways face the streets. Walls and roofs share their physical dimensions.
  function home(x: number, z: number, tint: number) {
    solid({ x: x - 4, y: 0, z, w: 0.6, h: 4.2, d: 8 }, tint, "Home west wall");
    solid({ x: x + 4, y: 0, z, w: 0.6, h: 4.2, d: 8 }, tint, "Home east wall");
    solid({ x, y: 0, z: z - 4, w: 8, h: 4.2, d: 0.6 }, tint, "Home back wall");
    for (const dx of [-2.8, 2.8])
      solid(
        { x: x + dx, y: 0, z: z + 4, w: 2.4, h: 4.2, d: 0.6 },
        tint,
        "Doorway side",
      );
    solid(
      { x, y: 4.2, z, w: 8.8, h: 0.5, d: 8.8 },
      0x9d7955,
      "Solid timber roof",
    );
  }
  home(-17, 23, 0xc8b58b);
  home(17, 20, 0xd1b990);
  home(-19, -19, 0xbfa981);
  home(20, -19, 0xd6c29b);
  home(-58, 20, 0xbfae87);
  home(58, 20, 0xd1bc96);
  home(-58, -18, 0xc8b58b);
  home(58, -18, 0xbfa981);
  solid(
    { x: -15, y: 0, z: 23, w: 2, h: 0.8, d: 1.5 },
    0x816046,
    "Household table",
  );
  solid(
    { x: 24, y: 0, z: 4, w: 4, h: 0.75, d: 2 },
    0x9d805a,
    "Low garden terrace",
  );
  solid(
    { x: -25, y: 0, z: -3, w: 3, h: 0.7, d: 2 },
    0x947653,
    "Stone resting bench",
  );
  for (const [x, z] of [
    [-29, 29],
    [29, 30],
    [-30, -31],
    [31, -31],
  ])
    land.tree(x, z);
  // Straight, open street patrols avoid buildings and temple surfaces. Their
  // visible actor and collision body always share the same position.
  const roles: CharacterRole[] = [
    "convert",
    "wife",
    "sam",
    "sariah",
    "zoram",
    "child",
    "lemuel",
    "lamans-wife",
  ];
  const residents = Array.from({ length: 24 }, (_, i) => {
    const actor = createCharacter(roles[i % roles.length], {
      quality: "crowd",
    });
    actor.group.name = `Settlement resident ${i + 1} · imagined inhabitant`;
    root.add(actor.group);
    const row = Math.floor(i / 4);
    const z = [-27, -8, 34, 52, 65, 76][row] + (i % 4) * 1.1;
    const extent = row < 3 ? 34 : 65;
    const body = { x: 0, y: 0, z, w: 0.6, h: i % 8 === 5 ? 1.15 : 1.7, d: 0.6 };
    solids.push(body);
    return {
      actor,
      body,
      extent,
      z,
      offset: i * 13.7,
      speed: 1.65 + (i % 3) * 0.12,
    };
  });
  const sherem = land.actor("sherem", { x: 2.8, y: 0, z: 40 });
  sherem.group.name = "Sherem · articulate visitor";
  const sheremBody = { x: 2.8, y: 0, z: 40, w: 0.7, h: 1.7, d: 0.7 };
  solids.push(sheremBody);
  let time = 0,
    fallTime = 0,
    epilogueTime = 0,
    disposed = false;
  let phase: "search" | "encounter" | "fall" | "epilogue" | "done" = "search";
  const patrol = (
    actor: ReturnType<typeof createCharacter>,
    body: typeof sheremBody,
    extent: number,
    z: number,
    distance: number,
    speed: number,
    dt: number,
  ) => {
    const t = ((distance % (extent * 4)) + extent * 4) % (extent * 4);
    const direction = t < extent * 2 ? 1 : -1;
    const x = t < extent * 2 ? -extent + t : extent * 3 - t;
    actor.update(dt, {
      x,
      y: 0,
      z,
      vx: direction * speed,
      vy: 0,
      vz: 0,
      yaw: (direction * Math.PI) / 2,
      grounded: true,
      runSpeed: speed,
    });
    body.x = x;
  };
  const animate = (dt: number) => {
    if (disposed) return;
    const delta = Math.min(Math.max(dt, 0), 0.1);
    time += delta;
    for (const r of residents)
      patrol(
        r.actor,
        r.body,
        r.extent,
        r.z,
        time * r.speed + r.offset,
        r.speed,
        delta,
      );
    if (phase === "search")
      patrol(sherem, sheremBody, 30, 40, time * 1.8 + 32.8, 1.8, delta);
    land.update(delta); // This search deliberately has no objective beacon.
  };
  const closingCaption =
    "Later, after many days of care, Sherem called a gathering for the next day. He confessed Christ, then died after speaking. Peace returned (Jacob 7:15–23).";
  animate(0);
  return {
    name: "Jacob and Sherem",
    subtitle: "Find a voice in the city • Jacob 7 • Imagined settlement",
    initialObjective:
      "Find Sherem among the people in the city and its outskirts.",
    spawn: { x: 14, y: 0, z: -84 },
    solids,
    actorParent: root,
    bounds: { minX: -80, maxX: 80, minZ: -88, maxZ: 85 },
    goal: { x: 0, y: 0, z: 40, radius: 3 },
    landmarks: [
      { name: "Nephi's temple · interpretive", ...temple.entrance },
      { name: "City square", x: 0, y: 0, z: 0 },
      { name: "Outer gardens", x: 0, y: 0, z: 65 },
    ],
    update(dt) {
      animate(dt);
    },
    adventure(hooks) {
      hooks.setAvatar("jacob");
      hooks.toast(
        "Pass the temple and explore the city. Find Sherem: a traveling speaker in a plum-colored mantle. Speak beside him when you recognize him.",
      );
      return {
        snapshot: () => ({
          phase,
          target: { ...sherem.group.position },
          pending: phase !== "search" && phase !== "done",
        }),
        movementLocked: () => phase !== "search" && phase !== "done",
        update(dt, player, input) {
          if (disposed) return { objective: "", prompt: "" };
          if (phase === "fall") {
            fallTime = Math.min(
              1,
              fallTime + Math.min(Math.max(dt, 0), 0.1) / 0.9,
            );
            sherem.group.rotation.z =
              (-Math.PI / 2) * fallTime * fallTime * (3 - 2 * fallTime);
            sherem.group.position.y = fallTime * 0.35;
            sheremBody.h = 0.5;
            if (fallTime === 1) {
              phase = "epilogue";
              hooks.toast(closingCaption);
            }
          }
          if (phase === "epilogue") {
            epilogueTime += Math.min(Math.max(dt, 0), 0.1);
            if (epilogueTime >= 8) {
              phase = "done";
              hooks.complete();
            }
          }
          const close = withinTask(player, sherem.group.position, 2.6);
          if (phase === "search" && close && input.interact) {
            phase = "encounter";
            // Control is locked through completion; the actor capsule must not
            // occlude its own face from the story camera.
            solids.splice(solids.indexOf(sheremBody), 1);
            sherem.update(0, {
              ...sherem.group.position,
              vx: 0,
              vy: 0,
              vz: 0,
              yaw: Math.atan2(
                player.x - sherem.group.position.x,
                player.z - sherem.group.position.z,
              ),
              grounded: true,
              runSpeed: 0,
            });
            hooks.dialog(
              "Jacob 7:6–15",
              "Jacob's witness of Christ",
              "Sherem challenges Jacob's teaching about Christ. Jacob testifies that the scriptures and prophets bear witness of Him. Sherem asks for a sign; Jacob leaves the matter to God's will. The Lord's power comes upon Sherem, and he falls to the earth.",
              () => {
                if (!disposed && phase === "encounter") phase = "fall";
              },
              {
                actors: [
                  { group: sherem.group, gesture: "talk", speaker: true },
                ],
                playerGesture: "talk",
                focus: sherem.group,
                wide: 6,
              },
            );
          }
          return {
            objective:
              phase === "epilogue"
                ? closingCaption
                : phase === "done"
                  ? "Peace restored"
                  : phase === "search"
                    ? "Find Sherem among the people in the city and its outskirts."
                    : "Witness Jacob's encounter with Sherem",
            prompt:
              phase === "search" && close ? "{action} · Speak with Sherem" : "",
          };
        },
        dispose() {
          phase = "done";
        },
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      residents.forEach((r) => r.actor.dispose());
      land.dispose();
    },
  };
}
