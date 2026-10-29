import * as T from "three";
import { markScenery } from "../shared/scenery";
import { nearWarPoint, warWorld } from "../shared/war-world-kit";
import type { Point, WorldData } from "../../runtime/worlds";

const p = (x: number, z: number, y = 0): Point => ({ x, y, z });
const WALL = 5.6;
const stages = [
  {
    id: "scout",
    at: p(-24, -12, WALL),
    objective: "Climb the western wall and scout the eastern entrance",
    ref: "Alma 62:20–21",
    title: "A night view from the wall",
    body: "Moroni climbs the wall in darkness. From here he sees the Lamanite army asleep on the east, by the entrance. This city's exact plan and Moroni's climbing route are imagined.",
  },
  {
    id: "report",
    at: p(-42, 0),
    objective: "Return to the army in the plain",
    ref: "Alma 62:21",
    title: "Prepare in haste",
    body: "Moroni returns to his army and orders strong cords and ladders prepared. The soldiers will enter on the west, away from the sleeping camp.",
  },
  {
    id: "rope",
    at: p(-44, 9),
    objective: "Collect strong rope from the supply ground",
    ref: "Alma 62:21",
    title: "Strong cords",
    body: "Take the rope to the ladder-making place. The supply work is an imagined playable detail of Moroni's order.",
  },
  {
    id: "tie",
    at: p(-38, -8),
    objective: "Carry the rope to the ladder-making place",
    ref: "Alma 62:21",
    title: "Bind the rungs",
    body: "The first cord is bound across the ladder rails. Timber is still needed before the force can scale the wall.",
  },
  {
    id: "timber",
    at: p(-45, -11),
    objective: "Collect ladder timber",
    ref: "Alma 62:21",
    title: "Ladder timber",
    body: "Take the light timber back to the work place. The exact materials and assembly steps are interpretive.",
  },
  {
    id: "assemble",
    at: p(-38, -8),
    objective: "Finish the ladder with timber and rope",
    ref: "Alma 62:21",
    title: "Ladders ready",
    body: "The strong cords and ladder are ready. Carry them to the western wall, where the defenders did not camp.",
  },
  {
    id: "place",
    at: p(-37, 8),
    objective: "Place the ladder against the western wall",
    ref: "Alma 62:22",
    title: "The western approach",
    body: "Moroni's force approaches the west at night. Set the ladder here and climb the wall. The placement and route are playable interpretation.",
  },
  {
    id: "top",
    at: p(-24, 8, WALL),
    objective: "Climb the ladder onto the wall",
    ref: "Alma 62:22",
    title: "On the wall",
    body: "Moroni's men reach the wall's top on the west, well away from the sleeping army by the eastern entrance.",
  },
  {
    id: "lower",
    at: p(-24, 8, WALL),
    objective: "Lower cords and an inner ladder into the city",
    ref: "Alma 62:21–23",
    title: "The descent",
    body: "Lower the strong cords and ladder into the inside of the western wall. The army must descend before morning.",
  },
  {
    id: "descend",
    at: p(-12, 8),
    objective: "Descend the inner ladder into the western city",
    ref: "Alma 62:23",
    title: "Inside the wall",
    body: "You reach the western side of the city. Moroni's men follow down by cords and ladders in the darkness.",
  },
  {
    id: "squad-west",
    at: p(-11, 9),
    objective: "Guide the first squad through the west lane",
    ref: "Alma 62:23",
    title: "The first squad",
    body: "Guide the men into the western lane. The city streets and individual squads are imagined; the record says all the force entered before morning.",
  },
  {
    id: "squad-center",
    at: p(-5, -8),
    objective: "Guide the second squad toward the inner court",
    ref: "Alma 62:23",
    title: "All within the walls",
    body: "The second squad moves inward. The army is inside the city when morning comes.",
  },
  {
    id: "morning",
    at: p(0, 0),
    objective: "Reach the court as morning breaks",
    ref: "Alma 62:23–24",
    title: "Morning in Nephihah",
    body: "When the Lamanites wake and see Moroni's army within the walls, they are frightened and flee by the pass.",
  },
  {
    id: "flight",
    at: p(13, 0),
    objective: "Observe the flight toward the eastern pass",
    ref: "Alma 62:24–26",
    title: "The city recovered",
    body: "Many Lamanites flee. Moroni's men pursue, slay many, and surround and capture others. Moroni and Pahoran recover Nephihah without losing a Nephite soul; it is not a bloodless battle.",
  },
  {
    id: "aftermath",
    at: p(5, 11),
    objective: "Speak with Pahoran about the prisoners",
    ref: "Alma 62:26–29",
    title: "A new life for prisoners",
    body: "The Lamanite prisoners who wish to join the people of Ammon are permitted to do so, becoming free people and working the land. Nephihah has been recovered.",
  },
] as const;

/** Alma 62:18–29. The city dimensions, house layout, supply tasks and squads are gameplay interpretations. */
export function buildNephihah(scene: T.Scene): WorldData {
  const land = warWorld(scene, "Nephihah · western wall crossing", true);
  const { root, solids, solid, decor, actor, tree } = land;
  // Continuous walls except for the true east entrance. The west wall has no door.
  solid(
    { x: -24, y: 0, z: 0, w: 1.4, h: WALL, d: 44 },
    0x9f8b69,
    "Nephihah solid west wall",
  );
  for (const z of [-22, 22])
    solid(
      { x: 0, y: 0, z, w: 48, h: WALL, d: 1.4 },
      0x9f8b69,
      "Nephihah solid north or south wall",
    );
  for (const z of [-14, 14])
    solid(
      { x: 24, y: 0, z, w: 1.4, h: WALL, d: 16 },
      0x9f8b69,
      "Nephihah east gate flanking wall",
    );
  solid(
    { x: 24, y: 4.25, z: 0, w: 1.4, h: 1.35, d: 12 },
    0x8e785b,
    "Nephihah east gate lintel",
  );
  for (const [x, z] of [
    [-24, -22],
    [24, -22],
    [-24, 22],
    [24, 22],
  ] as const)
    solid(
      { x, y: 0, z, w: 2.4, h: 6.2, d: 2.4 },
      0x867359,
      "Nephihah solid corner watch tower",
    );
  // Open-front houses have real side/back walls; broad lanes stay clear.
  for (const [x, z] of [
    [-13, -14],
    [0, -14],
    [-13, 15],
    [0, 15],
  ] as const) {
    const color = z < 0 ? 0xbea681 : 0xc5ae89;
    for (const dx of [-3, 3])
      solid(
        { x: x + dx, y: 0, z, w: 0.55, h: 3, d: 5 },
        color,
        "Nephihah dwelling side wall",
      );
    solid(
      { x, y: 0, z: z + 2.5, w: 6.5, h: 3, d: 0.55 },
      color,
      "Nephihah dwelling rear wall",
    );
    solid(
      { x, y: 3, z, w: 6.5, h: 0.3, d: 5.5 },
      0x92734f,
      "Nephihah solid cedar roof",
    );
  }
  // A physically traversable scout ascent; Moroni's exact means of climbing is unknown.
  for (let i = 0; i < 14; i++)
    solid(
      {
        x: -35.25 + i * 0.76,
        y: 0,
        z: -12,
        w: 0.78,
        h: (i + 1) * 0.4,
        d: 1.8,
      },
      0xb19a74,
      "Scouting earthen ascent terrace",
    );
  for (const [x, z] of [
    [-49, -38],
    [-35, -35],
    [-48, 35],
    [-34, 32],
    [36, -34],
    [38, 33],
  ] as const)
    tree(x, z);
  for (const [x, z] of [
    [-42, -30],
    [-36, -27],
    [-47, 22],
  ] as const)
    solid(
      { x, y: 0, z, w: 2.8, h: 0.9, d: 2 },
      0x746e60,
      "Plain campsite supply table",
    );
  // The rope and wood move with Moroni; their staging meshes have explicit nonphysical intent.
  const rope = new T.Mesh(
    new T.TorusGeometry(0.42, 0.1, 6, 12),
    new T.MeshStandardMaterial({ color: 0xbba67e, roughness: 1 }),
  );
  rope.name = "Carried strong rope coil";
  root.add(rope);
  markScenery(rope, {
    kind: "decoration",
    reason:
      "Portable coil follows the player while carried; supplies do not obstruct the lane.",
  });
  const timber = decor(
    { x: -45, y: 0.2, z: -11, w: 0.45, h: 0.3, d: 2.6 },
    0x987048,
    "Portable ladder timber",
    "Portable timber is carried by the player, not a fixed obstacle.",
  );
  rope.visible = timber.visible = false;
  const sleepers = Array.from({ length: 5 }, (_, i) =>
    actor(
      "guard",
      p(11 + (i % 2) * 2.6, -6 + Math.floor(i / 2) * 5),
      `Sleeping eastern defender ${i + 1}`,
    ),
  );
  sleepers.forEach((rig, i) => {
    rig.group.rotation.z = -1.15;
    rig.group.position.y = 0.3;
    rig.group.rotation.y = i * 0.4;
  });
  const squads = [
    Array.from({ length: 3 }, (_, i) =>
      actor(
        "guard",
        p(-45 + i * 2, -2),
        `West approach squad A soldier ${i + 1}`,
      ),
    ),
    Array.from({ length: 3 }, (_, i) =>
      actor(
        "guard",
        p(-45 + i * 2, 3),
        `West approach squad B soldier ${i + 1}`,
      ),
    ),
  ];
  const pahoran = actor("guard", p(-41, 4), "Pahoran · companion commander");
  const prisoner = actor(
    "guard",
    p(5, 12),
    "Lamanite prisoner who joins the people of Ammon",
  );
  prisoner.group.visible = false;
  const marker = new T.Mesh(
    new T.OctahedronGeometry(0.42),
    new T.MeshBasicMaterial({ color: 0x60cfff, depthTest: false }),
  );
  marker.name = "Nephihah next task beacon";
  marker.renderOrder = 20;
  root.add(marker);
  markScenery(marker, {
    kind: "decoration",
    reason: "Nonphysical task indicator.",
  });
  const climbables: NonNullable<WorldData["climbables"]> = [];
  let index = 0,
    pending = false,
    ended = false,
    carrying: "rope" | "timber" | null = null,
    time = 0,
    outerPlaced = false,
    innerPlaced = false,
    entered = 0;
  const makeLadder = (inside: boolean) => {
    for (let i = 0; i < (inside ? 13 : 14); i++) {
      const x = inside ? -22.75 + i * 0.7 : -35.25 + i * 0.76;
      const top = inside ? 5.2 - i * 0.4 : (i + 1) * 0.4;
      // Thin treads form a walkable ladder with <=0.4 m consecutive rise.
      if (inside)
        solid(
          { x, y: top - 0.14, z: 8, w: 0.74, h: 0.14, d: 1.7 },
          0x9c7750,
          "Inner strong-cord ladder rung",
        );
      else
        solid(
          { x, y: top - 0.14, z: 8, w: 0.78, h: 0.14, d: 1.7 },
          0x9c7750,
          "Outer strong-cord ladder rung",
        );
    }
    const id = inside ? "nephihah-inner-ladder" : "nephihah-outer-ladder";
    climbables.push({
      id,
      x: inside ? -22.1 : -25.6,
      z: inside ? 9.5 : 8,
      y: 0,
      height: 6.2,
      radius: inside ? 0.7 : 1.2,
    });
    // Cords make the treads read as a ladder, not a freestanding staircase.
    for (const z of [7.12, 8.88]) {
      const rail = new T.Mesh(
        new T.BoxGeometry(0.12, 0.12, 12),
        new T.MeshStandardMaterial({ color: 0x866a4b, roughness: 1 }),
      );
      rail.rotation.y = Math.PI / 2;
      rail.rotation.z = inside ? 0.4 : -0.4;
      rail.position.set(inside ? -18.2 : -30, 2.8, z);
      rail.name = "Strong ladder side cord";
      root.add(rail);
      markScenery(rail, {
        kind: "decoration",
        reason:
          "Side cord follows the physical ladder rungs without an extra walk surface.",
      });
    }
  };
  const advance = () => {
    index++;
    pending = false;
    if (index >= stages.length) {
      ended = true;
      marker.visible = false;
    }
  };
  return {
    name: "The Taking of Nephihah",
    subtitle: "The western wall by night · Alma 62:18–29",
    initialObjective: stages[0].objective,
    spawn: { ...p(-43, -18), yaw: Math.PI / 2 },
    solids,
    climbables,
    actorParent: root,
    bounds: { minX: -53, maxX: 53, minZ: -62, maxZ: 62 },
    goal: { ...stages[stages.length - 1].at, radius: 3 },
    landmarks: [
      { name: "Moroni and Pahoran's camp", ...p(-42, 0) },
      { name: "Western wall and ladders", ...p(-30, 8) },
      { name: "Eastern entrance", ...p(24, 0) },
      { name: "Western city lanes", ...p(-12, 8) },
    ],
    update(dt, player) {
      time += Math.min(0.1, Math.max(0, dt));
      marker.visible = !ended;
      const target = stages[Math.min(index, stages.length - 1)].at;
      marker.position.set(
        target.x,
        target.y + 2.4 + Math.sin(time * 3) * 0.15,
        target.z,
      );
      rope.visible = carrying === "rope";
      timber.visible = carrying === "timber";
      if (carrying === "rope")
        rope.position.set(player.x + 0.55, player.y + 1.45, player.z);
      if (carrying === "timber")
        timber.position.set(player.x + 0.62, player.y + 1.45, player.z);
      if (index >= 10)
        squads[0].forEach((rig, i) =>
          rig.group.position.set(-15 + i * 1.8, 0, 8 + i * 0.8),
        );
      if (index >= 11)
        squads[1].forEach((rig, i) =>
          rig.group.position.set(-9 + i * 1.8, 0, -8 + i * 0.8),
        );
      if (index >= 13)
        sleepers.forEach((rig, i) => {
          rig.group.rotation.z = 0;
          rig.group.position.set(16 + i * 1.3, 0, (i - 2) * 1.7);
        });
      if (index >= 14) {
        pahoran.group.position.set(5, 0, 11);
        prisoner.group.visible = true;
      }
    },
    adventure(hooks) {
      hooks.setAvatar("moroni");
      hooks.toast(
        "Alma 62:18–29 · Climb and explore as Moroni. The streets, supplies, and exact ladder route are imagined.",
      );
      return {
        snapshot: () => ({
          phase: ended ? "done" : stages[index].id,
          index,
          pending,
          target: stages[Math.min(index, stages.length - 1)].at,
          carrying,
          outerPlaced,
          innerPlaced,
          entered,
        }),
        movementLocked: () => pending,
        update(_dt, player, input) {
          if (ended)
            return {
              objective: "Nephihah recovered",
              prompt: "Journey complete",
            };
          const stage = stages[index];
          const near = nearWarPoint(
            player,
            stage.at,
            index === 0 || index === 7 || index === 8 ? 1.8 : 2.8,
          );
          // A wall-top checkpoint is reached only by real vertical traversal.
          if (near && input.interact && !pending) {
            pending = true;
            hooks.dialog(
              stage.ref,
              stage.title,
              stage.body,
              () => {
                if (index === 2) carrying = "rope";
                if (index === 3) carrying = null;
                if (index === 4) carrying = "timber";
                if (index === 5) carrying = null;
                if (index === 6) {
                  makeLadder(false);
                  outerPlaced = true;
                }
                if (index === 8) {
                  makeLadder(true);
                  innerPlaced = true;
                }
                if (index === 9) entered = 1;
                if (index === 10) entered = 2;
                if (index === 11) entered = 3;
                if (index === 14) hooks.complete();
                advance();
              },
              {
                focus: { x: stage.at.x, y: stage.at.y + 1, z: stage.at.z },
                wide: 5,
                playerGesture:
                  index === 3 || index === 5 || index === 6 || index === 8
                    ? "work"
                    : "talk",
                actors:
                  index === 1 || index === 14
                    ? [{ group: pahoran.group, gesture: "talk", speaker: true }]
                    : [],
              },
            );
          }
          return {
            objective: stage.objective,
            prompt: pending ? "" : near ? `{action} · ${stage.objective}` : "",
            carrying: !!carrying,
          };
        },
        dispose() {
          ended = true;
          marker.visible = false;
        },
      };
    },
    dispose: land.dispose,
  };
}
