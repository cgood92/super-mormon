import * as T from "three";
import { warWorld, nearWarPoint } from "./war-world-kit";
import { createPlayer } from "./physics";
import type { Point, WorldData } from "./worlds";
import type { AdventureRuntime } from "./adventure";

export const BOUNTIFUL_PLACES = {
  spawn: { x: 0, y: 0, z: 48 },
  witness: { x: 0, y: 0, z: -12 },
  neighbor: { x: 31, y: 0, z: -25 },
  home: { x: 30, y: 0, z: 43 },
  water: { x: -29, y: 0, z: 25 },
  shelter: { x: -29, y: 0, z: -24 },
  terrace: { x: -22, y: 3, z: -42 },
  room: { x: 25, y: 0, z: -46 },
} satisfies Record<string, Point>;

/** 3 Nephi 11 and 17; this explorable architecture and all errands are imagined. */
export function buildChristBountiful(scene: T.Scene): WorldData {
  const land = warWorld(scene, "Bountiful · temple courts and gardens");
  const { root, solid, decor, tree, actor, solids } = land;
  const p = BOUNTIFUL_PLACES;
  // Open court: the ground owns its floor; no second coplanar paving mesh.
  for (const x of [-47, 47])
    solid(
      { x, y: 0, z: -4, w: 1, h: 3, d: 104 },
      0xcdbb96,
      "Outer garden wall",
    );
  solid(
    { x: 0, y: 0, z: -55, w: 94, h: 5, d: 1 },
    0xcdbb96,
    "Temple precinct rear wall",
  );
  // Temple silhouette and open porch. The inner rooms are an interpretation, not a reconstruction.
  solid(
    { x: 0, y: 0, z: -43, w: 22, h: 0.3, d: 20 },
    0xd7c8ab,
    "Temple porch floor",
  );
  for (const x of [-10.7, 10.7])
    solid(
      { x, y: 0.3, z: -43, w: 0.6, h: 8, d: 20 },
      0xd8c8a7,
      "Temple side wall",
    );
  solid(
    { x: 0, y: 8.3, z: -43, w: 22, h: 0.5, d: 20 },
    0xc3ad86,
    "Temple roof",
  );
  for (const x of [-7, 7])
    solid(
      { x, y: 0.3, z: -34, w: 0.8, h: 8, d: 0.8 },
      0xe2d4b9,
      "Solid porch pillar",
    );
  // Accessible side rooms: wide front doorways and high roofs leave real usable interiors.
  for (const x of [-29, 25]) {
    for (const dx of [-6, 6])
      solid(
        { x: x + dx, y: 0, z: -46, w: 0.6, h: 5, d: 12 },
        0xc8b18d,
        "Garden room side wall",
      );
    solid(
      { x, y: 0, z: -52, w: 12, h: 5, d: 0.6 },
      0xc8b18d,
      "Garden room rear wall",
    );
    solid(
      { x, y: 5, z: -46, w: 12.6, h: 0.35, d: 12.6 },
      0xbda27a,
      "Garden room roof",
    );
    for (const dx of [-4.5, 4.5])
      solid(
        { x: x + dx, y: 0, z: -40, w: 3, h: 5, d: 0.6 },
        0xc8b18d,
        "Open room doorway pier",
      );
  }
  // Western terrace: broad stairs, landing and real-height support, with two approach routes.
  solid(
    { x: -22, y: 0, z: -34, w: 8, h: 3, d: 21 },
    0xc3b18d,
    "Solid garden terrace",
  );
  for (let i = 0; i < 10; i++)
    solid(
      { x: -22, y: 0, z: -13.5 - i, w: 6, h: (i + 1) * 0.3, d: 1 },
      0xd5c3a1,
      "Terrace stair tread",
    );
  // Two separated garden beds force route choices without enclosing the central witness space.
  for (const x of [-29, 29])
    for (const z of [4, 18]) {
      solid(
        { x, y: 0, z, w: 9, h: 0.85, d: 6 },
        0x95845f,
        "Raised herb garden bed",
      );
      decor(
        { x, y: 0.85, z, w: 8.4, h: 0.14, d: 5.4 },
        0x6e8750,
        "Low herb canopy",
        "Shallow leaves on the solid raised bed; no independent walk surface.",
      );
    }
  for (const [x, z] of [
    [-39, -25],
    [39, -9],
    [-39, 32],
    [10, 32],
    [39, 31],
  ] as const)
    tree(x, z);
  for (const [x, z] of [
    [-15, 18],
    [15, 18],
    [-14, -21],
    [14, -21],
  ] as const)
    solid(
      { x, y: 0, z, w: 4, h: 0.65, d: 1.4 },
      0xb6a17e,
      "Solid courtyard bench",
    );
  solid(
    { x: -29, y: 0, z: 23, w: 0.8, h: 0.8, d: 0.8 },
    0x9c6950,
    "Water vessel stand",
  );
  const jar = decor(
    { x: -29, y: 0.8, z: 23, w: 0.45, h: 0.45, d: 0.45 },
    0xb67a56,
    "Water vessel · supplies for the garden shelter",
    "Small portable vessel rests on the solid supply stand.",
  );
  const elder = actor("lehi", p.neighbor, "Unnamed neighbor · returning home");
  const inhabitants = [
    [
      "sariah",
      -29,
      -24,
      "Shelter keeper",
      "There is room in the shade. Water from the south garden would help.",
    ],
    [
      "zoram",
      -9,
      25,
      "Gardener",
      "The western stairs lead to a quiet view above the gardens.",
    ],
    [
      "wife",
      25,
      -46,
      "Room keeper",
      "This room is open to anyone who needs rest.",
    ],
    [
      "child",
      -22,
      -42,
      "Terrace visitor",
      "From here, you can see both paths through the garden.",
    ],
  ] as const;
  inhabitants.forEach(([role, x, z, name]) =>
    actor(
      role,
      { x, y: name === "Terrace visitor" ? 3 : 0, z },
      `Unnamed ${name.toLowerCase()}`,
    ),
  );
  for (const [role, x, z] of [
    ["sam", -5, -17],
    ["convert", 6, -18],
    ["child", 9, -9],
    ["wife", -9, -8],
  ] as const)
    actor(role, { x, y: 0, z }, "Unnamed temple witness");
  const witnessLight = new T.PointLight(0xfff1d0, 0, 20);
  witnessLight.position.set(0, 7, -12);
  root.add(witnessLight);
  let disposed = false;
  const runtimes = new Set<AdventureRuntime>();
  return {
    name: "Christ at Bountiful",
    subtitle: "An imagined temple precinct · 3 Nephi 8–11; 17",
    initialObjective:
      "Walk north to the open temple court; explore the gardens along the way",
    spawn: p.spawn,
    solids,
    actorParent: root,
    bounds: { minX: -46, maxX: 46, minZ: -54, maxZ: 57 },
    goal: { ...p.home, radius: 3 },
    landmarks: Object.entries(p).map(([name, point]) => ({ name, ...point })),
    adventure(hooks) {
      let stopped = false,
        pending = false,
        witnessed = false,
        following = false,
        escorted = false,
        completed = false,
        carrying = false,
        watered = false;
      const discoveries = new Set<string>(),
        conversations = new Set<string>();
      const neighbor = { ...p.neighbor };
      const near = (a: Point, b: Point, radius = 2.8) =>
        nearWarPoint(a, b, radius);
      const say = (title: string, body: string, next = () => {}) => {
        pending = true;
        hooks.dialog("3 Nephi · source and adaptation", title, body, () => {
          if (stopped || disposed) return;
          pending = false;
          next();
        });
      };
      const runtime: AdventureRuntime = {
        update(dt, player, input) {
          let prompt = "";
          if (!stopped && !disposed && !pending) {
            for (const [id, point] of [
              ["terrace-vista", p.terrace],
              ["quiet-room", p.room],
            ] as const)
              if (near(player, point) && !discoveries.has(id)) {
                discoveries.add(id);
                hooks.toast(
                  id === "terrace-vista"
                    ? "Discovered: the high garden vista"
                    : "Discovered: an open room for rest",
                );
              }
            if (!witnessed && near(player, p.witness, 7)) {
              witnessLight.intensity = 12;
              say(
                "The people at Bountiful",
                "After the loss and great changes described in 3 Nephi 8–10, people gathered around the temple. They heard the Father's voice and saw Jesus Christ descend in a white robe. He invited them to come forward one by one (3 Nephi 11).",
                () => {
                  say(
                    "Compassion for every person",
                    "Later in His ministry, Jesus invited the people to bring those who were afflicted, and He healed them. He blessed the children and prayed for the people (3 Nephi 17). These sacred moments are remembered here, not earned through errands.",
                    () => {
                      witnessed = true;
                      hooks.toast(
                        "Explore freely. A neighbor in the northeast garden would welcome company on the walk home.",
                      );
                    },
                  );
                },
              );
            } else if (witnessed && !escorted && near(player, neighbor)) {
              prompt = following
                ? "Walk with your neighbor to the southeast home gate"
                : "Offer to walk home together";
              if (input.interact && !following) {
                following = true;
                hooks.toast(
                  "Keep your neighbor nearby. Use the wide outer garden path east of the raised beds.",
                );
              }
            }
            if (following && !escorted) {
              const distance = Math.hypot(
                player.x - neighbor.x,
                player.z - neighbor.z,
              );
              // Stop rather than cutting across scenery. Follow only when the straight segment has clearance.
              const blocked = solids.some(
                (s) =>
                  s.y + s.h > 0.43 &&
                  s.y < 1.65 &&
                  Array.from({ length: 12 }, (_, i) => (i + 1) / 12).some(
                    (t) =>
                      Math.abs(neighbor.x + (player.x - neighbor.x) * t - s.x) <
                        s.w / 2 + 0.4 &&
                      Math.abs(neighbor.z + (player.z - neighbor.z) * t - s.z) <
                        s.d / 2 + 0.4,
                  ),
              );
              if (distance > 1.6 && distance < 10 && !blocked) {
                const step = Math.min(
                  Math.max(0, Math.min(dt, 0.05)) * 6.8,
                  distance - 1.6,
                );
                neighbor.x += ((player.x - neighbor.x) / distance) * step;
                neighbor.z += ((player.z - neighbor.z) / distance) * step;
                elder.update(dt, {
                  ...createPlayer(neighbor.x, 0, neighbor.z),
                  yaw: Math.atan2(player.x - neighbor.x, player.z - neighbor.z),
                  runSpeed: 3,
                });
              }
              if (distance <= 1.6 || blocked || distance >= 10)
                elder.update(dt, {
                  ...createPlayer(neighbor.x, 0, neighbor.z),
                  yaw: Math.atan2(player.x - neighbor.x, player.z - neighbor.z),
                });
              if (near(player, p.home, 3.8) && near(neighbor, p.home, 5)) {
                escorted = true;
                following = false;
                hooks.toast(
                  "Your neighbor has reached home. Thank you for the company.",
                );
              }
            }
            if (near(player, p.water) && !carrying && !watered) {
              prompt = "Carry water to the northwest shelter";
              if (input.interact) {
                carrying = true;
                jar.visible = false;
              }
            }
            if (carrying && near(player, p.shelter)) {
              carrying = false;
              watered = true;
              hooks.toast(
                "Water delivered to the shelter · optional kindness complete",
              );
            }
            for (const [, x, z, title, body] of inhabitants) {
              const point = { x, y: title === "Terrace visitor" ? 3 : 0, z };
              if (near(player, point) && !conversations.has(title)) {
                prompt = `Speak with the ${title.toLowerCase()}`;
                if (input.interact) {
                  conversations.add(title);
                  say(title, body);
                  break;
                }
              }
            }
            if (witnessed && escorted && !completed) {
              completed = true;
              hooks.complete();
            }
          }
          return {
            objective: !witnessed
              ? "Find the open temple court north of the gardens"
              : !following && !escorted
                ? "Find the neighbor in the northeast garden; offer company home"
                : !escorted
                  ? "Walk together down the east garden path to the southeast home gate"
                  : "Explore the terraces, rooms and gardens; help at the shelter if you wish",
            prompt,
            carrying,
          };
        },
        snapshot: () => ({
          phase: completed
            ? "done"
            : witnessed
              ? "return-home"
              : "temple-court",
          witnessed,
          following,
          escorted,
          completed,
          carrying,
          watered,
          pending,
          neighbor: { ...neighbor },
          discoveries: [...discoveries],
          conversations: [...conversations],
          places: p,
        }),
        dispose() {
          stopped = true;
          pending = false;
          runtimes.delete(runtime);
        },
      };
      runtimes.add(runtime);
      return runtime;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      runtimes.forEach((r) => r.dispose());
      land.dispose();
    },
  };
}
