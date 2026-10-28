import * as T from "three";
import { adventureLandscape, withinTask } from "./adventure-landscape";
import { createPlayer, stepPlayer } from "./physics";
import { markScenery } from "./scenery";
import type { AdventureRuntime } from "./adventure";
import type { Point, WorldData } from "./worlds";

const depot = { x: 0, y: 0, z: -37 };
const supplies = [
  { name: "Orchard grain", x: -39, y: 0, z: 38 },
  { name: "East farm seed", x: 40, y: 0, z: 16 },
  { name: "South store provisions", x: 16, y: 0, z: 62 },
];
const familyStart = { x: -35, y: 0, z: 62 };
const discoveries = [
  { name: "Watchtower vista", x: 30, y: 3, z: -35 },
  { name: "Hidden orchard spring", x: -59, y: 0, z: 28 },
  { name: "Quiet weaving court", x: -24, y: 0, z: -55 },
];

/** Imagined refuge and countryside, grounded in 3 Nephi 3–4's gathering. */
export function buildLachoneusGathering(scene: T.Scene): WorldData {
  const previousBackground = scene.background,
    previousFog = scene.fog;
  const land = adventureLandscape(
    scene,
    "Lachoneus · fortified gathering valley",
    0x9eaa77,
    160,
    180,
  );
  const { solid, tree } = land;
  const actor = (
    role: Parameters<typeof land.actor>[0],
    point: Point,
    name: string,
  ) => {
    const rig = land.actor(role, point);
    rig.group.name = name;
    return rig;
  };
  solid(
    { x: -62, y: 0, z: 28, w: 2.5, h: 0.35, d: 2.5 },
    0x679da8,
    "Hidden spring basin",
  );
  // A broad gate and an eastern supply entrance give two physical approaches.
  for (const [x, w] of [
    [-37, 62],
    [25, 38],
    [60, 12],
  ] as const)
    solid(
      { x, y: 0, z: -15, w, h: 5, d: 2 },
      0xb7a17e,
      "Refuge defensive wall",
    );
  solid(
    { x: -68, y: 0, z: -43, w: 2, h: 5, d: 58 },
    0xb7a17e,
    "West enclosure",
  );
  solid({ x: 67, y: 0, z: -43, w: 2, h: 5, d: 58 }, 0xb7a17e, "East enclosure");
  solid(
    { x: 0, y: 0, z: -72, w: 136, h: 5, d: 2 },
    0xb7a17e,
    "North enclosure",
  );
  // Courtyards are genuinely open rooms, with a doorway facing the main lane.
  for (const x of [-25, 24]) {
    solid(
      { x: x - 7, y: 0, z: -53, w: 1, h: 3, d: 17 },
      0xc8b692,
      "Court side wall",
    );
    solid(
      { x: x + 7, y: 0, z: -53, w: 1, h: 3, d: 17 },
      0xc8b692,
      "Court side wall",
    );
    solid({ x, y: 0, z: -61, w: 14, h: 3, d: 1 }, 0xc8b692, "Court rear wall");
    for (const dx of [-4.7, 4.7])
      solid(
        { x: x + dx, y: 0, z: -45, w: 4.6, h: 3, d: 1 },
        0xc8b692,
        "Court doorway flank",
      );
  }
  for (let i = 0; i < 6; i++)
    solid(
      { x: 30, y: 0, z: -23 - i * 2, w: 5, h: (i + 1) * 0.5, d: 2 },
      0xb7a17e,
      "Watchtower stair terrace",
    );
  solid(
    { x: 30, y: 0, z: -36, w: 7, h: 3, d: 4 },
    0xb7a17e,
    "Watchtower lookout platform",
  );
  // A low ridge forces the west route around its ends; it is also jumpable.
  solid(
    { x: -17, y: 0, z: 24, w: 8, h: 1.5, d: 28 },
    0x8b886a,
    "Walkable valley rock ridge",
  );
  for (const [x, z] of [
    [-48, 37],
    [-50, 48],
    [-45, 15],
    [49, 30],
    [50, 55],
    [-58, 23],
    [57, -46],
  ] as const)
    tree(x, z);
  for (const s of supplies)
    solid(
      { x: s.x - 3.5, y: 0, z: s.z, w: 3.2, h: 1.2, d: 2 },
      0x9e774e,
      `${s.name} store`,
    );
  for (let i = 0; i < 3; i++)
    solid(
      { x: -5 + i * 5, y: 0, z: -41, w: 3.5, h: 1.4, d: 2 },
      0x947046,
      "Refuge granary bin",
    );
  const supplySacks = supplies.map((source) => {
    const sack = new T.Mesh(
      new T.CylinderGeometry(0.27, 0.4, 0.75, 8),
      new T.MeshStandardMaterial({ color: 0xc8ad7c, roughness: 1 }),
    );
    sack.name = `${source.name} portable sack`;
    sack.position.set(source.x, 0.375, source.z);
    markScenery(sack, {
      kind: "decoration",
      reason:
        "Small portable provision sack moves from source to carrier to granary; static stores and bins own collision.",
    });
    land.root.add(sack);
    return sack;
  });
  const people = [
    {
      role: "lehi" as const,
      name: "Lachoneus",
      x: -8,
      y: 0,
      z: -30,
      text: "I am Lachoneus, governor in this later generation. Gather families and provisions here. Our safety rests on preparation, unity, and trust in God.",
    },
    {
      role: "moroni" as const,
      name: "Gidgiddoni",
      x: 8,
      y: 0,
      z: -24,
      text: "I am Gidgiddoni, not Captain Moroni. We will not march into the robbers' hills. Bring the people together and defend this place. The broad gate and eastern gap both lead inside.",
    },
    {
      role: "sariah" as const,
      name: "Orchard keeper",
      x: -42,
      y: 0,
      z: 42,
      text: "The spring lies behind the western trees. Take one load at a time; the lane west of the rock ridge is wide enough for the family.",
    },
    {
      role: "zoram" as const,
      name: "Storekeeper",
      x: 5,
      y: 0,
      z: -36,
      text: "Set the sacks by the granary. Many years of provision, not a single errand, sustained the gathered people.",
    },
    {
      role: "wife" as const,
      name: "Weaver",
      x: -27,
      y: 0,
      z: -55,
      text: "A new place can become a community. We share work here, and leave room for the next family.",
    },
  ];
  people.forEach((p) => actor(p.role, p, p.name));
  const family = [
    actor("sam", familyStart, "Unnamed family parent"),
    actor("child", { ...familyStart, x: -37 }, "Unnamed family child"),
  ];
  let runtime: AdventureRuntime | undefined,
    disposed = false;
  return {
    name: "Lachoneus's Gathering",
    subtitle: "Protect a community · 3 Nephi 3–4",
    initialObjective:
      "Carry three provision loads to the refuge granary; guide the southern family through either entrance",
    spawn: { x: 0, y: 0, z: -7 },
    solids: land.solids,
    actorParent: land.root,
    bounds: { minX: -75, maxX: 75, minZ: -78, maxZ: 82 },
    goal: { ...depot, radius: 4 },
    landmarks: [
      { name: "Refuge granary", ...depot },
      { name: "Southern family", ...familyStart },
      ...supplies,
      ...discoveries,
      { name: "Eastern supply entrance", x: 49, y: 0, z: -15 },
      { name: "Broad main gate", x: 0, y: 0, z: -15 },
    ],
    adventure(hooks) {
      const delivered = new Set<number>(),
        found = new Set<string>();
      let carrying: number | undefined,
        following = false,
        sheltered = false,
        completed = false,
        stopped = false;
      let escort = createPlayer(familyStart.x, 0, familyStart.z),
        child = createPlayer(familyStart.x - 2, 0, familyStart.z),
        time = 0;
      hooks.setAvatar("nephi");
      const resetEscort = () => {
        escort = createPlayer(familyStart.x, 0, familyStart.z);
        child = createPlayer(familyStart.x - 2, 0, familyStart.z);
        following = false;
        family[0].update(0, escort);
        family[1].update(0, child);
      };
      const objective = () =>
        completed
          ? "Community gathered. Explore the refuge, spring, and watchtower"
          : `${delivered.size}/3 loads stored · ${sheltered ? "family sheltered" : following ? "guide family slowly; stay within 10 paces" : "find family southwest"}${carrying === undefined ? "" : ` · carrying ${supplies[carrying].name}`}`;
      runtime = {
        update(dt, player, input) {
          if (stopped || disposed)
            return {
              objective: objective(),
              prompt: "",
              carrying: carrying !== undefined,
            };
          dt = Math.min(Math.max(dt, 0), 0.1);
          time += dt;
          if (player.y < -5 || Math.abs(player.x) > 79 || player.z > 87) {
            if (carrying !== undefined)
              hooks.toast("Your load is back at its store. Try another route.");
            carrying = undefined;
            if (!sheltered) resetEscort();
          }
          for (const d of discoveries)
            if (!found.has(d.name) && withinTask(player, d, 3)) {
              found.add(d.name);
              hooks.toast(`Discovered: ${d.name}`);
            }
          if (!sheltered && !following && withinTask(player, familyStart, 4)) {
            following = true;
            hooks.toast(
              "The family will follow. Walk nearby and wait when they fall behind; choose the broad gate or eastern entrance.",
            );
          }
          if (following && !sheltered) {
            const dx = player.x - escort.x,
              dz = player.z - escort.z,
              distance = Math.hypot(dx, dz);
            const moving =
              Math.hypot(escort.x - child.x, escort.z - child.z) < 6 &&
              distance > 2.2 &&
              distance < 10 &&
              Math.abs(player.y - escort.y) < 1.5;
            stepPlayer(
              escort,
              {
                x: moving ? (-dx / distance) * 0.42 : 0,
                y: moving ? (dz / distance) * 0.42 : 0,
                jump: false,
                jumpHeld: false,
              },
              dt,
              0,
              land.solids,
            );
            const childDx = escort.x - child.x,
              childDz = escort.z - child.z,
              childDistance = Math.hypot(childDx, childDz),
              childMoving = childDistance > 1.5;
            stepPlayer(
              child,
              {
                x: childMoving ? (-childDx / childDistance) * 0.5 : 0,
                y: childMoving ? (childDz / childDistance) * 0.5 : 0,
                jump: false,
                jumpHeld: false,
              },
              dt,
              0,
              land.solids,
            );
            family[0].update(dt, escort);
            family[1].update(dt, child);
            if (withinTask(escort, depot, 5) && withinTask(child, depot, 5)) {
              sheltered = true;
              following = false;
              hooks.toast("The family has reached the refuge.");
            }
          }
          if (carrying !== undefined && withinTask(player, depot, 3.5)) {
            delivered.add(carrying);
            carrying = undefined;
            hooks.toast(
              `${delivered.size} of 3 provision loads safely stored.`,
            );
          }
          let prompt = "";
          const source = supplies.findIndex(
            (s, i) => !delivered.has(i) && withinTask(player, s, 3),
          );
          if (carrying === undefined && source >= 0) {
            prompt = `Carry ${supplies[source].name}`;
            if (input.interact) {
              carrying = source;
              hooks.toast("Carry this load to the granary inside the refuge.");
            }
          } else if (carrying !== undefined)
            prompt = "Bring your load to the refuge granary";
          else {
            const person = people.find((p) => withinTask(player, p));
            if (person) {
              prompt = `Talk with ${person.name}`;
              if (input.interact)
                hooks.dialog(
                  "The gathering",
                  person.name,
                  person.text,
                  () => {},
                );
            }
          }
          supplySacks.forEach((sack, i) => {
            if (carrying === i) {
              sack.position.set(
                player.x + Math.sin(player.yaw) * 0.65,
                player.y + 1,
                player.z + Math.cos(player.yaw) * 0.65,
              );
            } else if (delivered.has(i)) {
              sack.position.set(-5 + i * 5, 1.775, -41);
            } else {
              sack.position.set(supplies[i].x, 0.375, supplies[i].z);
            }
          });
          if (!completed && sheltered && delivered.size === 3) {
            completed = true;
            hooks.toast(
              "Your preparations are finished. The scriptural account continues through years of defense and gratitude to God.",
            );
            hooks.complete();
          }
          const target: Point | undefined =
            carrying !== undefined
              ? depot
              : delivered.size < 3
                ? supplies.find((_, i) => !delivered.has(i))
                : sheltered
                  ? undefined
                  : following
                    ? escort
                    : familyStart;
          land.update(dt, target);
          return {
            objective: objective(),
            prompt,
            carrying: carrying !== undefined,
          };
        },
        snapshot: () => ({
          phase: completed ? "gathered" : "preparing",
          delivered: [...delivered],
          carrying: carrying === undefined ? null : supplies[carrying].name,
          family: {
            x: escort.x,
            y: escort.y,
            z: escort.z,
            following,
            sheltered,
          },
          child: { x: child.x, y: child.y, z: child.z },
          sacks: supplySacks.map((sack, i) => ({
            name: supplies[i].name,
            state:
              carrying === i
                ? "carried"
                : delivered.has(i)
                  ? "deposited"
                  : "source",
            x: sack.position.x,
            y: sack.position.y,
            z: sack.position.z,
          })),
          discoveries: [...found],
          time,
          disposed: stopped || disposed,
          targets: { depot, supplies, familyStart, discoveries },
          routes: [
            "Broad main gate (0,-15)",
            "Eastern supply entrance (49,-15)",
          ],
        }),
        dispose() {
          stopped = true;
          land.marker.visible = false;
        },
      };
      return runtime;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      runtime?.dispose();
      land.dispose();
      scene.background = previousBackground;
      scene.fog = previousFog;
    },
  };
}
