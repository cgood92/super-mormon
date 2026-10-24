import * as T from "three";
import { adventureLandscape, withinTask } from "./adventure-landscape";
import { material } from "./art";
import { markScenery } from "./scenery";
import { createPlayer, stepPlayer } from "./physics";
import type { Point, WorldData } from "./worlds";

// Scripture chronology: 1 Nephi 18:23–25; 2 Nephi 1; 4:12; 5:5–17, 27.
// Geography, tasks, compressed time and buildings are an imagined reconstruction.
export function buildPromisedLand(scene: T.Scene): WorldData {
  const land = adventureLandscape(
    scene,
    "The Promised Land and City of Nephi",
    0x8b9b68,
  );
  const { root, solids, solid } = land;
  const ocean = new T.Mesh(
    new T.PlaneGeometry(400, 100),
    material(0x478f9b, 0.4),
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(0, -0.12, 126);
  root.add(ocean);
  markScenery(ocean, {
    kind: "backdrop",
    reason: "Ocean beyond the bounded shore; exploration stays on dry land.",
  });
  // The arrival ship sits beyond the dry-land bounds: a shoreline landmark,
  // not another playable hull. Its sail makes the coast readable from camp.
  const arrival = new T.Group();
  arrival.name = "Arrival ship beyond the shore";
  arrival.position.set(25, 0, 91);
  arrival.rotation.y = -0.25;
  root.add(arrival);
  const hull = new T.Mesh(
    new T.SphereGeometry(1, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    material(0x785337),
  );
  hull.scale.set(3, 2.1, 7);
  hull.position.y = 1.1;
  (hull.material as T.MeshStandardMaterial).side = T.DoubleSide;
  arrival.add(hull);
  const deck = new T.Mesh(
    new T.BoxGeometry(4.8, 0.2, 11.5),
    material(0xb08a57),
  );
  deck.position.y = 1.1;
  arrival.add(deck);
  const mast = new T.Mesh(
    new T.CylinderGeometry(0.16, 0.2, 10, 8),
    material(0x6d4e37),
  );
  mast.position.y = 5.8;
  arrival.add(mast);
  const sail = new T.Mesh(new T.PlaneGeometry(5.5, 6), material(0xefe1bc));
  sail.position.set(2.8, 6.5, 0);
  (sail.material as T.MeshStandardMaterial).side = T.DoubleSide;
  arrival.add(sail);
  arrival.traverse((object) => {
    if (object instanceof T.Mesh)
      markScenery(object, {
        kind: "backdrop",
        reason:
          "Arrival ship offshore beyond exploration bounds; a coastal orientation landmark.",
      });
  });
  const foam = new T.InstancedMesh(
    new T.PlaneGeometry(3.5, 0.16),
    new T.MeshBasicMaterial({
      color: 0xd3e8da,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    }),
    28,
  );
  const foamTransform = new T.Object3D();
  for (let i = 0; i < 28; i++) {
    foamTransform.position.set(-68 + i * 5, 0.03, 80 + Math.sin(i * 0.7) * 1.8);
    foamTransform.rotation.x = -Math.PI / 2;
    foamTransform.updateMatrix();
    foam.setMatrixAt(i, foamTransform.matrix);
  }
  foam.name = "Shoreline foam beyond dry land";
  root.add(foam);
  markScenery(foam, {
    kind: "backdrop",
    reason:
      "Small surf lines beyond the dry-land route; nonphysical water effect.",
  });
  const tents: T.Mesh[] = [];
  const shelter = (x: number, z: number, name: string) => {
    const pieces = [
      solid(
        { x: x - 2, y: 0, z, w: 0.22, h: 2.6, d: 4 },
        0xba9d70,
        `${name} left canvas`,
      ),
      solid(
        { x: x + 2, y: 0, z, w: 0.22, h: 2.6, d: 4 },
        0xba9d70,
        `${name} right canvas`,
      ),
      solid(
        { x, y: 0, z: z - 2, w: 4, h: 2.6, d: 0.22 },
        0xba9d70,
        `${name} rear canvas`,
      ),
      solid(
        { x, y: 2.6, z, w: 4.25, h: 0.22, d: 4.25 },
        0xe0c99c,
        `${name} canopy`,
      ),
    ];
    return pieces;
  };
  shelter(-12, 40, "Family tent");
  shelter(13, 43, "Shore tent");
  const lehi = land.actor("lehi", { x: -9, y: 0, z: 27 });
  land.actor("sariah", { x: -12, y: 0, z: 29 });
  const family = [
    { role: "sam" as const, x: -4, z: 13 },
    { role: "zoram" as const, x: 1, z: 12 },
    { role: "child" as const, x: 4, z: 14 },
  ].map(({ role, x, z }) => ({
    rig: land.actor(role, { x, y: 0, z }),
    player: createPlayer(x, 0, z),
  }));
  for (const [x, z, scale] of [
    [-23, 4, 1.1],
    [24, 6, 1],
    [-18, -18, 1],
    [19, -25, 1.2],
    [-29, -43, 1.1],
    [28, -50, 1],
  ])
    land.tree(x, z, scale);
  // A broad, gently winding corridor stays open between the forest and city.
  solid(
    { x: -12, y: 0, z: -4, w: 4, h: 1.5, d: 7 },
    0xa69c7b,
    "Trail-side stone terrace",
  );
  solid(
    { x: 13, y: 0, z: -31, w: 5, h: 1.2, d: 6 },
    0xa69c7b,
    "Trail-side resting terrace",
  );
  solid(
    { x: 10, y: 0, z: -52, w: 3, h: 1.05, d: 1.5 },
    0x795b3e,
    "Building workbench",
  );
  solid(
    { x: 8.9, y: 1.05, z: -52, w: 0.65, h: 0.12, d: 0.45 },
    0xc3a45f,
    "Preserved brass records",
  );
  const cityBuildings: T.Mesh[] = [];
  const cityWall = (x: number, z: number, name: string) => {
    cityBuildings.push(
      solid({ x, y: 0, z, w: 5, h: 2.8, d: 0.4 }, 0xc6ac7d, name),
    );
    cityBuildings.push(
      solid(
        { x: x - 2.3, y: 0, z: z + 2, w: 0.4, h: 2.8, d: 4 },
        0xc6ac7d,
        `${name} side`,
      ),
    );
    cityBuildings.push(
      solid(
        { x, y: 2.8, z: z + 2, w: 5, h: 0.3, d: 4.4 },
        0x846247,
        `${name} roof`,
      ),
    );
  };
  // Completed buildings are outside every work interaction and the main north/south path.
  cityWall(-17, -58, "City dwelling");
  cityWall(21, -58, "City workshop");
  const temple: T.Mesh[] = [];
  const buildTemple = () => {
    temple.push(
      solid(
        { x: 0, y: 0, z: -65, w: 11, h: 0.3, d: 8 },
        0xddcda9,
        "Temple foundation",
      ),
    );
    temple.push(
      solid(
        { x: 0, y: 0.3, z: -68.5, w: 11, h: 5, d: 0.5 },
        0xd9c49c,
        "Temple rear wall",
      ),
    );
    for (const x of [-5.25, 5.25])
      temple.push(
        solid(
          { x, y: 0.3, z: -65, w: 0.5, h: 5, d: 7 },
          0xd9c49c,
          "Temple side wall",
        ),
      );
    temple.push(
      solid(
        { x: 0, y: 5.3, z: -65, w: 11.5, h: 0.4, d: 8.5 },
        0xe9d8b3,
        "Temple roof",
      ),
    );
  };
  const crop = new T.InstancedMesh(
    new T.ConeGeometry(0.18, 0.9, 5),
    material(0xaac264),
    30,
  );
  for (let i = 0; i < 30; i++)
    crop.setMatrixAt(
      i,
      new T.Matrix4().makeTranslation(
        8 + (i % 6) * 0.65,
        0.45,
        30 + Math.floor(i / 6) * 0.75,
      ),
    );
  crop.visible = false;
  root.add(crop);
  markScenery(crop, {
    kind: "decoration",
    reason:
      "Small flexible seedlings in the cultivated plot; no solid barrier.",
  });
  const memorial = solid(
    { x: -15, y: 0, z: 21, w: 1.7, h: 0.35, d: 1.2 },
    0xd5c4a1,
    "Quiet memorial stone",
  );
  memorial.visible = false;
  // Do not leave an invisible obstacle before the memorial is established.
  const memorialSolid = solids.pop()!;
  type Task = {
    id: string;
    at: Point;
    action: string;
    title: string;
    text: string;
    ref: string;
    work?: boolean;
    run?: () => void;
  };
  let following = false;
  const tasks: Task[] = [
    {
      id: "camp",
      at: { x: 0, y: 0, z: 43 },
      action: "Set up the shore camp",
      title: "On the promised shore",
      text: "The family pitches tents after arriving. This imagined journey compresses years into a few visits.",
      ref: "1 Nephi 18:23",
      run: () => {
        tents.push(...shelter(-23, 35, "Newly pitched tent"));
      },
    },
    {
      id: "seeds",
      at: { x: 7, y: 0, z: 32 },
      action: "Hold {action} · Plant the seeds",
      title: "Seeds from Jerusalem",
      text: "The seeds brought from Jerusalem grow abundantly in their new home.",
      ref: "1 Nephi 18:24",
      work: true,
      run: () => {
        crop.visible = true;
      },
    },
    {
      id: "counsel",
      at: { x: -7, y: 0, z: 29 },
      action: "Listen to Lehi",
      title: "A father's counsel",
      text: "Later, Lehi teaches his family to remember the Lord's mercy and live in unity.",
      ref: "2 Nephi 1",
    },
    {
      id: "farewell",
      at: { x: -12, y: 0, z: 22 },
      action: "Remember Lehi together",
      title: "Remembering Lehi",
      text: "After speaking to his household, Lehi grows old, dies, and is buried. We pause quietly with his family. This scene does not portray the manner of his death.",
      ref: "2 Nephi 4:12",
      run: () => {
        lehi.group.visible = false;
        memorial.visible = true;
        solids.push(memorialSolid);
      },
    },
    {
      id: "gather",
      at: { x: 0, y: 0, z: 13 },
      action: "Gather the willing families",
      title: "A warning and a departure",
      text: "The Lord warns Nephi to leave. His family, Sam's and Zoram's families, Jacob, Joseph, his sisters, and others who choose to go journey with him.",
      ref: "2 Nephi 5:5–7",
      run: () => {
        following = true;
      },
    },
    {
      id: "trail1",
      at: { x: 3, y: 0, z: 0 },
      action: "Lead the group onward",
      title: "Into the wilderness",
      text: "Stay on the open trail. The family is following your route.",
      ref: "An imagined route · 2 Nephi 5:7",
    },
    {
      id: "trail2",
      at: { x: -3, y: 0, z: -18 },
      action: "Rest and continue",
      title: "Many days pass",
      text: "The journey takes many days. Help the families reach a new place to settle.",
      ref: "2 Nephi 5:7",
    },
    {
      id: "settle",
      at: { x: 0, y: 0, z: -40 },
      action: "Pitch tents at the new settlement",
      title: "The land of Nephi",
      text: "The people name their new home Nephi.",
      ref: "2 Nephi 5:8",
      run: () => {
        tents.push(...shelter(-12, -43, "New settlement tent"));
      },
    },
    {
      id: "records",
      at: { x: 10, y: 0, z: -49 },
      action: "Safeguard the records",
      title: "Remembering their journey",
      text: "Nephi brings the brass plates and the compass. The people sow, harvest, and learn to build.",
      ref: "2 Nephi 5:11–15",
    },
    {
      id: "build",
      at: { x: 3, y: 0, z: -55 },
      action: "Hold {action} · Help build the temple",
      title: "Building with care",
      text: "Nephi builds a temple after the manner of Solomon's, with fewer precious materials. This building is an imagined representation.",
      ref: "2 Nephi 5:16",
      work: true,
      run: buildTemple,
    },
    {
      id: "joy",
      at: { x: 0, y: 0, z: -57 },
      action: "Gather in gratitude",
      title: "A community takes root",
      text: "Nephi teaches his people to work diligently. They seek a life of happiness together.",
      ref: "2 Nephi 5:17, 27",
    },
  ];
  let index = 0,
    effort = 0,
    pending = false,
    ended = false;
  const trail: Point[] = [{ x: 0, y: 0, z: 13 }];
  let trailTimer = 0;
  land.update(0, tasks[0].at);
  const world: WorldData = {
    name: "The Promised Land",
    subtitle: "Settle, remember, and build • 1 Nephi 18; 2 Nephi 1–5",
    initialObjective: "Set up the shore camp",
    spawn: { x: 0, y: 0, z: 51 },
    solids,
    bounds: { minX: -65, maxX: 65, minZ: -74, maxZ: 70 },
    goal: { x: 0, y: 0, z: -57, radius: 3 },
    landmarks: tasks.map((task) => ({ name: task.title, ...task.at })),
    update(dt, player) {
      if (ended) return;
      land.update(dt, ended ? undefined : tasks[index]?.at);
      if (!following || pending || ended) return;
      trailTimer += Math.min(dt, 0.1);
      if (trailTimer > 0.18) {
        trailTimer = 0;
        if (
          Math.hypot(
            player.x - trail[trail.length - 1].x,
            player.z - trail[trail.length - 1].z,
          ) > 0.6
        )
          trail.push({ x: player.x, y: player.y, z: player.z });
        if (trail.length > 160) trail.shift();
      }
      family.forEach(({ player: follower, rig }, i) => {
        const target = trail[Math.max(0, trail.length - 5 - i * 4)];
        const dx = target.x - follower.x,
          dz = target.z - follower.z,
          d = Math.hypot(dx, dz),
          speed = d > 0.8 ? Math.min(0.8, d * 0.35) : 0;
        stepPlayer(
          follower,
          {
            x: d ? (-dx / d) * speed : 0,
            y: d ? (dz / d) * speed : 0,
            jump: false,
            jumpHeld: false,
          },
          dt,
          0,
          solids,
        );
        rig.update(dt, follower);
      });
    },
    adventure(hooks) {
      hooks.setAvatar("nephi");
      hooks.toast(
        "Explore the shore. Follow the blue beacon to help your family settle.",
      );
      return {
        snapshot: () => ({
          phase: ended ? "done" : tasks[index].id,
          index,
          effort,
          following,
          targets: tasks.map((task) => ({ id: task.id, ...task.at })),
        }),
        update(dt, player, input) {
          if (ended)
            return {
              objective: "A community takes root",
              prompt: "Journey complete",
            };
          const task = tasks[index];
          const close = withinTask(player, task.at);
          if (!close || !input.interactHeld) effort = 0;
          if (close && task.work && input.interactHeld && !pending)
            effort += Math.min(Math.max(dt, 0), 0.1);
          if (
            close &&
            !pending &&
            (task.work ? effort >= 1.2 : input.interact)
          ) {
            effort = 0;
            pending = true;
            task.run?.();
            hooks.dialog(
              task.ref,
              task.title,
              task.text,
              () => {
                pending = false;
                if (index === tasks.length - 1) {
                  ended = true;
                  land.marker.visible = false;
                  hooks.complete();
                } else index++;
              },
              {
                focus: { ...task.at, y: 1.1 },
                wide: 7,
                playerGesture: task.work ? "work" : "talk",
                actors:
                  task.id === "counsel"
                    ? [{ group: lehi.group, gesture: "talk", speaker: true }]
                    : [],
              },
            );
          }
          return {
            objective: `${index + 1}/${tasks.length} · ${task.action.replace("Hold {action} · ", "")}`,
            prompt:
              close && !pending
                ? `${task.work ? task.action : `{action} · ${task.action}`}${task.work ? ` · ${Math.round((effort / 1.2) * 100)}%` : ""}`
                : "",
          };
        },
        dispose() {
          ended = true;
          land.marker.visible = false;
        },
      };
    },
    dispose() {
      ended = true;
      land.dispose();
    },
  };
  return world;
}
