import * as T from "three";
import { adventureLandscape, withinTask } from "./adventure-landscape";
import { material } from "./art";
import { markScenery } from "./scenery";
import type { Point, WorldData } from "./worlds";

/** Jacob retells Zenos's allegory; this is a symbolic garden, not a literal historical journey. */
export function buildOliveVineyard(scene: T.Scene): WorldData {
  const land = adventureLandscape(
    scene,
    "Zenos's Olive Vineyard",
    0xb6a67a,
    160,
    150,
  );
  const { root, solids, solid } = land;
  const mother = land.tree(0, 18, 1.35);
  const wild = land.tree(-24, 17, 1);
  const poor = land.tree(-30, -20, 1);
  const poorer = land.tree(0, -42, 1);
  const choice = land.tree(32, -20, 1.2);
  for (const tree of [poor, poorer, choice]) tree.crown.scale.setScalar(0.45);
  mother.fruit.visible = false;
  wild.fruit.visible = false;
  land.actor("sam", { x: 7, y: 0, z: 29 });
  // Ordinary servant actors represent helpers, never a physical portrayal of God.
  const helpers = [
    land.actor("zoram", { x: -8, y: 0, z: 35 }),
    land.actor("child", { x: -5, y: 0, z: 37 }),
  ];
  helpers.forEach((helper) => {
    helper.group.visible = false;
  });
  solid(
    { x: -9, y: 0, z: 32, w: 3.6, h: 1, d: 1.6 },
    0x8b6947,
    "Garden tool bench",
  );
  solid(
    { x: 8, y: 0, z: 18, w: 1.8, h: 0.65, d: 1.6 },
    0x9a7446,
    "Harvest basket",
  );
  // Outside the routes: low terraces can be jumped onto, and walked around on either side.
  solid(
    { x: -16, y: 0, z: -6, w: 5, h: 0.7, d: 4 },
    0xc6b992,
    "First garden terrace",
  );
  solid(
    { x: 17, y: 0, z: -5, w: 5, h: 0.7, d: 4 },
    0xc6b992,
    "Second garden terrace",
  );
  const green = material(0x8ca55b),
    brown = material(0x756047),
    gold = material(0xe5d48a);
  const grafts = new T.Group();
  grafts.name = "Grafted branches";
  root.add(grafts);
  const branch = (x: number, z: number) => {
    const mesh = new T.Mesh(new T.CylinderGeometry(0.08, 0.12, 1.3, 6), brown);
    mesh.rotation.z = -0.75;
    mesh.position.set(x + 0.65, 3.2, z);
    grafts.add(mesh);
    const leaf = new T.Mesh(new T.IcosahedronGeometry(0.5, 0), green);
    leaf.position.set(x + 1.15, 3.8, z);
    grafts.add(leaf);
    const tie = new T.Mesh(new T.TorusGeometry(0.14, 0.04, 4, 8), gold);
    tie.rotation.y = Math.PI / 2;
    tie.position.set(x + 0.4, 3, z);
    grafts.add(tie);
    grafts.children.slice(-3).forEach((object) =>
      markScenery(object, {
        kind: "decoration",
        reason:
          "Small graft above head height attached to an existing solid trunk.",
      }),
    );
  };
  const water = new T.InstancedMesh(
    new T.SphereGeometry(0.07, 4, 4),
    material(0x71bfda),
    10,
  );
  root.add(water);
  markScenery(water, {
    kind: "decoration",
    reason: "Brief nonphysical watering effect.",
  });
  water.visible = false;
  type Task = {
    id: string;
    at: Point;
    action: string;
    ref: string;
    title: string;
    text?: string;
    work?: boolean;
    run?: () => void;
  };
  const home = { x: 0, y: 0, z: 23 },
    farA = { x: -27, y: 0, z: -17 },
    farB = { x: 0, y: 0, z: -38 },
    farC = { x: 29, y: 0, z: -17 };
  let carrying = false;
  const fruitful = (good: boolean) => {
    for (const tree of [mother, poor, poorer, choice]) {
      tree.fruit.visible = true;
      (tree.fruit.material as T.MeshStandardMaterial).color.setHex(
        good ? 0xcab557 : 0x5b4541,
      );
    }
  };
  const tasks: Task[] = [
    {
      id: "learn",
      at: { x: 5, y: 0, z: 29 },
      action: "Meet the servant",
      ref: "Jacob 5:1–4",
      title: "A story within a story",
      text: "Jacob quotes Zenos. The tame olive tree represents Israel; the vineyard story teaches the Lord's patient care. You play an imagined helper, not Jacob or the Lord.",
    },
    {
      id: "prune",
      at: home,
      action: "Prune the decaying tree",
      ref: "Jacob 5:4–6",
      title: "Begin with care",
      work: true,
      run: () => {
        mother.crown.scale.set(0.85, 0.85, 0.85);
      },
    },
    {
      id: "dig",
      at: { x: -3, y: 0, z: 20 },
      action: "Dig around the roots",
      ref: "Jacob 5:4–6",
      title: "Make room for growth",
      work: true,
    },
    {
      id: "nourish",
      at: { x: 3, y: 0, z: 20 },
      action: "Nourish the roots",
      ref: "Jacob 5:4–6",
      title: "Young branches appear",
      text: "After time passes, tender growth appears, but the main top still decays.",
      work: true,
      run: () => {
        mother.crown.scale.setScalar(1);
      },
    },
    {
      id: "wild",
      at: { x: -21, y: 0, z: 19 },
      action: "Take a wild branch",
      ref: "Jacob 5:7–10",
      title: "A branch to graft",
      run: () => {
        carrying = true;
      },
    },
    {
      id: "graft",
      at: home,
      action: "Graft into the mother tree",
      ref: "Jacob 5:9–11",
      title: "Preserving the roots",
      work: true,
      run: () => {
        branch(0, 18);
        carrying = false;
      },
    },
    {
      id: "tender",
      at: { x: -3, y: 0, z: 20 },
      action: "Take tender natural branches",
      ref: "Jacob 5:13–14",
      title: "To distant parts",
      text: "Natural branches are planted in distant parts of the vineyard.",
      run: () => {
        carrying = true;
      },
    },
    {
      id: "plantA",
      at: farA,
      action: "Plant in the poor ground",
      ref: "Jacob 5:20–22",
      title: "The first distant planting",
      work: true,
      run: () => {
        poor.crown.scale.setScalar(0.7);
        branch(-30, -20);
      },
    },
    {
      id: "plantB",
      at: farB,
      action: "Plant in still poorer ground",
      ref: "Jacob 5:23",
      title: "The second distant planting",
      work: true,
      run: () => {
        poorer.crown.scale.setScalar(0.7);
        branch(0, -42);
      },
    },
    {
      id: "plantC",
      at: farC,
      action: "Plant in the choice ground",
      ref: "Jacob 5:24–25",
      title: "Another distant planting",
      text: "These visits show selected plantings from the allegory, not every tree in the vineyard.",
      work: true,
      run: () => {
        choice.crown.scale.setScalar(0.7);
        branch(32, -20);
        carrying = false;
      },
    },
    {
      id: "firstReturn",
      at: home,
      action: "Inspect after a long time",
      ref: "Jacob 5:15–18",
      title: "The first return",
      text: "The grafted mother tree bears good fruit. Distant trees also bear fruit; the choice tree bears both kinds.",
      run: () => {
        fruitful(true);
        for (const tree of [poor, poorer, choice])
          tree.crown.scale.setScalar(1);
      },
    },
    {
      id: "mixed",
      at: farC,
      action: "Give the mixed tree more care",
      ref: "Jacob 5:25–28",
      title: "Patience with the tree",
      work: true,
    },
    {
      id: "decline",
      at: home,
      action: "Return after another long time",
      ref: "Jacob 5:29–41",
      title: "Sorrow for the vineyard",
      text: "Later all the trees' fruit becomes corrupt. The Lord grieves over the vineyard.",
      run: () => {
        fruitful(false);
      },
    },
    {
      id: "spare",
      at: { x: 5, y: 0, z: 29 },
      action: "Ask for more time",
      ref: "Jacob 5:49–51",
      title: "Spare it longer",
      text: "The servant pleads for more time. The Lord agrees to keep working.",
    },
    {
      id: "returnBranch",
      at: farA,
      action: "Collect a natural branch",
      ref: "Jacob 5:52–56",
      title: "Gathering back",
      run: () => {
        carrying = true;
      },
    },
    {
      id: "regraft",
      at: home,
      action: "Regraft the natural branch",
      ref: "Jacob 5:52–60",
      title: "Together again",
      work: true,
      run: () => {
        branch(-0.5, 18);
        carrying = false;
      },
    },
    {
      id: "exchange",
      at: { x: 3, y: 0, z: 20 },
      action: "Take a branch for distant roots",
      ref: "Jacob 5:54–56",
      title: "Care in both directions",
      run: () => {
        carrying = true;
      },
    },
    {
      id: "distantGraft",
      at: farC,
      action: "Graft the mother branch here",
      ref: "Jacob 5:54–56",
      title: "Preserving distant roots",
      work: true,
      run: () => {
        branch(31, -20);
        carrying = false;
      },
    },
    {
      id: "helpers",
      at: { x: -5, y: 0, z: 32 },
      action: "Call fellow servants",
      ref: "Jacob 5:61–72",
      title: "Labor together",
      text: "More servants join the work. The Lord works alongside them.",
      run: () => {
        helpers.forEach((helper) => {
          helper.group.visible = true;
        });
      },
    },
    {
      id: "lastCare",
      at: farB,
      action: "Nourish the distant roots",
      ref: "Jacob 5:63–64",
      title: "Care for every tree",
      work: true,
    },
    {
      id: "gradual1",
      at: home,
      action: "Trim a little as good grows",
      ref: "Jacob 5:65–66",
      title: "Balance roots and branches",
      text: "Remove bad branches gradually as good growth strengthens, not all at once.",
      work: true,
      run: () => {
        mother.crown.scale.setScalar(0.9);
      },
    },
    {
      id: "gradual2",
      at: { x: 3, y: 0, z: 20 },
      action: "Nourish and trim again",
      ref: "Jacob 5:73–74",
      title: "Good fruit returns",
      work: true,
      run: () => {
        fruitful(true);
        mother.crown.scale.setScalar(1);
      },
    },
    {
      id: "harvest",
      at: { x: 6, y: 0, z: 21 },
      action: "Gather the good fruit",
      ref: "Jacob 5:75–77",
      title: "Joy in the harvest",
      text: "The servants share joy. Good fruit is stored for a long season; the allegory ends with a final gathering and burning of the vineyard.",
      work: true,
    },
  ];
  const carried = new T.Group();
  carried.name = "Branch carried at the helper's side";
  root.add(carried);
  const twig = new T.Mesh(new T.CylinderGeometry(0.055, 0.07, 1.1, 5), brown);
  twig.rotation.z = 0.6;
  carried.add(twig);
  const leaves = new T.Mesh(new T.IcosahedronGeometry(0.28, 0), green);
  leaves.position.set(-0.3, 0.45, 0);
  carried.add(leaves);
  markScenery(twig, {
    kind: "decoration",
    reason: "Small hand-held quest branch; no environment collision.",
  });
  markScenery(leaves, {
    kind: "decoration",
    reason: "Leaves attached to the carried quest branch.",
  });
  carried.visible = false;
  let index = 0,
    effort = 0,
    pending = false,
    ended = false,
    time = 0;
  land.update(0, tasks[0].at);
  return {
    name: "The Olive Vineyard",
    subtitle: "A playable allegory • Jacob 5",
    initialObjective: "Meet the servant in the olive garden",
    spawn: { x: 0, y: 0, z: 37 },
    solids,
    bounds: { minX: -65, maxX: 65, minZ: -60, maxZ: 60 },
    goal: { x: 6, y: 0, z: 21, radius: 3 },
    landmarks: [
      { name: "Mother olive tree", x: 0, y: 0, z: 18 },
      { name: "Wild olive tree", x: -24, y: 0, z: 17 },
      { name: "Poor ground", ...farA },
      { name: "Poorer ground", ...farB },
      { name: "Choice ground", ...farC },
    ],
    update(dt, player) {
      if (ended) return;
      land.update(dt, ended ? undefined : tasks[index]?.at);
      time += Math.min(Math.max(dt, 0), 0.1);
      carried.visible = carrying && !ended;
      // Offset perpendicular to heading keeps the branch clear of face and torso.
      carried.position.set(
        player.x + Math.cos(player.yaw) * 0.68,
        player.y + 1,
        player.z - Math.sin(player.yaw) * 0.68,
      );
      carried.rotation.y = player.yaw;
      water.visible =
        effort > 0 &&
        ["nourish", "lastCare", "gradual2"].includes(tasks[index]?.id);
      if (water.visible)
        for (let i = 0; i < 10; i++)
          water.setMatrixAt(
            i,
            new T.Matrix4().makeTranslation(
              player.x + Math.sin(i * 2.1) * 0.5,
              player.y + 1.3 - ((time * 1.3 + i * 0.1) % 1),
              player.z + Math.cos(i * 2.1) * 0.5,
            ),
          );
      water.instanceMatrix.needsUpdate = true;
    },
    adventure(hooks) {
      hooks.setAvatar("child");
      hooks.toast(
        "Walk through the vineyard. The blue beacon marks your next task; hold {action} to work.",
      );
      return {
        snapshot: () => ({
          phase: ended ? "done" : tasks[index].id,
          index,
          effort,
          carrying,
          targets: tasks.map((task) => ({ id: task.id, ...task.at })),
        }),
        update(dt, player, input) {
          if (ended)
            return {
              objective: "Joy in the harvest",
              prompt: "Journey complete",
              carrying: false,
            };
          const task = tasks[index],
            close = withinTask(player, task.at);
          if (!close || !input.interactHeld) effort = 0;
          if (close && !pending && task.work && input.interactHeld)
            effort += Math.min(Math.max(dt, 0), 0.1);
          if (
            close &&
            !pending &&
            (task.work ? effort >= 1.2 : input.interact)
          ) {
            effort = 0;
            task.run?.();
            const advance = () => {
              pending = false;
              if (index === tasks.length - 1) {
                ended = true;
                land.marker.visible = false;
                hooks.complete();
              } else index++;
            };
            if (task.text) {
              pending = true;
              hooks.dialog(task.ref, task.title, task.text, advance, {
                focus: { ...task.at, y: 1 },
                wide: 6,
                playerGesture: task.work ? "work" : "talk",
                actors: [],
              });
            } else {
              hooks.toast(`${task.title} · ${task.ref}`);
              advance();
            }
          }
          return {
            objective: `${index + 1}/${tasks.length} · ${tasks[index].action}`,
            prompt:
              close && !pending
                ? `${task.work ? "Hold " : ""}{action} · ${task.action}${task.work ? ` · ${Math.round((effort / 1.2) * 100)}%` : ""}`
                : "",
            carrying,
          };
        },
        dispose() {
          ended = true;
          carried.visible = false;
          water.visible = false;
          land.marker.visible = false;
        },
      };
    },
    dispose() {
      ended = true;
      land.dispose();
    },
  };
}
