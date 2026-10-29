import * as T from "three";
import { adventureLandscape, withinTask } from "../shared/adventure-landscape";
import { material } from "../../rendering/art";
import { markScenery } from "../shared/scenery";
import type { Point, WorldData } from "../../runtime/worlds";

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
  for (const tree of [poor, poorer, choice]) {
    tree.crown.scale.setScalar(0.45);
    tree.fruit.visible = false;
  }
  mother.fruit.visible = false;
  wild.fruit.visible = false;
  const servant = land.actor("sam", { x: 7, y: 0, z: 29 });
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
  // Color the existing floor itself: no overlapping soil disks or extra floor owners.
  const groundPositions = land.ground.geometry.getAttribute("position");
  const groundColors = land.ground.geometry.getAttribute(
    "color",
  ) as T.BufferAttribute;
  for (let i = 0; i < groundPositions.count; i++) {
    const x = groundPositions.getX(i) * 160,
      z = groundPositions.getZ(i) * 150;
    const patches = [
      { x: -30, z: -20, color: 0x9a846b },
      { x: 0, z: -42, color: 0xc7b499 },
      { x: 32, z: -20, color: 0x625d35 },
    ];
    const color = new T.Color().fromBufferAttribute(groundColors, i);
    for (const patch of patches)
      color.lerp(
        new T.Color(patch.color),
        1 - T.MathUtils.smoothstep(Math.hypot(x - patch.x, z - patch.z), 5, 10),
      );
    groundColors.setXYZ(i, color.r, color.g, color.b);
  }
  groundColors.needsUpdate = true;
  mother.crown.name = "Sparse decaying mother canopy";
  mother.crown.scale.set(0.7, 0.65, 0.75);
  mother.crown.children.forEach((object) => {
    if (object instanceof T.Mesh && object !== mother.fruit)
      (object.material as T.MeshStandardMaterial).color.setHex(0x78684a);
  });
  const decay = new T.Group();
  decay.name = "Bare dying upper branches";
  root.add(decay);
  for (let i = 0; i < 5; i++) {
    const limb = new T.Mesh(new T.CylinderGeometry(0.08, 0.15, 2.8, 6), brown);
    limb.position.set(
      Math.sin(i * 2) * 1.2,
      6.2 + i * 0.15,
      18 + Math.cos(i * 2),
    );
    limb.rotation.z = Math.sin(i * 2) * 0.8;
    decay.add(limb);
    markScenery(limb, {
      kind: "decoration",
      reason:
        "Visible dead branch above standing height; solid mother trunk owns support.",
    });
  }
  const rootCare = new T.Group();
  rootCare.name = "Moist mulch around nourished roots";
  root.add(rootCare);
  rootCare.visible = false;
  for (let i = 0; i < 10; i++) {
    const mulch = new T.Mesh(new T.IcosahedronGeometry(0.3, 0), brown);
    mulch.scale.set(1, 0.25, 1);
    mulch.position.set(
      Math.sin(i * 2.4) * 1.25,
      0.08,
      18 + Math.cos(i * 2.4) * 1.25,
    );
    rootCare.add(mulch);
    markScenery(mulch, {
      kind: "decoration",
      reason:
        "Soft low mulch on the existing ground, not a separate walking surface.",
    });
  }
  const twigGeometry = new T.CylinderGeometry(0.045, 0.075, 1.2, 6),
    leafGeometry = new T.IcosahedronGeometry(0.25, 0);
  const makeTwig = (name: string) => {
    const group = new T.Group();
    group.name = name;
    const wood = new T.Mesh(twigGeometry, brown);
    wood.position.y = 0.4;
    wood.rotation.z = 0.35;
    const leaf = new T.Mesh(leafGeometry, green);
    leaf.position.set(-0.22, 0.9, 0);
    group.add(wood, leaf);
    for (const mesh of [wood, leaf])
      markScenery(mesh, {
        kind: "decoration",
        reason:
          "Small visible collectible branch, attached to tree or hand socket; no environment support.",
      });
    return group;
  };
  const wildBranch = makeTwig("Visible wild branch to collect");
  wildBranch.position.set(-23.1, 1.8, 17);
  root.add(wildBranch);
  const young = new T.Group();
  young.name = "Three young tender natural branches";
  young.position.set(0, 2.7, 18);
  root.add(young);
  young.visible = false;
  for (let i = 0; i < 3; i++) {
    const twig = makeTwig("Tender branch");
    twig.position.set((i - 1) * 0.65, Math.abs(i - 1) * 0.3, 0.7);
    young.add(twig);
  }
  const naturalBranch = makeTwig("Visible natural branch to gather back");
  naturalBranch.position.set(-29, 2, -20);
  naturalBranch.visible = false;
  root.add(naturalBranch);
  const carried = new T.Group();
  carried.name = "Hand-held olive branches";
  root.add(carried);
  carried.visible = false;
  for (let i = 0; i < 3; i++) {
    const twig = makeTwig(`Carried branch ${i + 1}`);
    twig.position.set((i - 1) * 0.15, 0, 0);
    twig.rotation.z = (i - 1) * 0.22;
    carried.add(twig);
  }
  let branchCount = 0,
    attached = false;
  const syncBranches = () => {
    carried.visible = branchCount > 0;
    carried.children.forEach((twig, i) => {
      twig.visible = i < branchCount;
    });
  };
  const fruitful = (good: boolean) => {
    for (const tree of [mother, poor, poorer, choice]) {
      tree.fruit.visible = true;
      (tree.fruit.material as T.MeshStandardMaterial).color.setHex(
        good ? 0xcab557 : 0x5b4541,
      );
    }
  };
  const healthy = () => {
    fruitful(true);
    decay.visible = false;
    for (let i = 0; i < 12; i++)
      choice.fruit.setColorAt(i, new T.Color(0xffffff));
    if (choice.fruit.instanceColor)
      choice.fruit.instanceColor.needsUpdate = true;
    for (const tree of [mother, poor, poorer, choice]) {
      tree.crown.scale.setScalar(1);
      tree.crown.children.forEach((object) => {
        if (object instanceof T.Mesh && object !== tree.fruit)
          (object.material as T.MeshStandardMaterial).color.setHex(0x788d55);
      });
    }
  };
  const servantAt = { x: 7, y: 0, z: 29 },
    home = { x: 1.7, y: 0, z: 19.7 },
    farA = { x: -28.3, y: 0, z: -18.3 },
    farB = { x: 1.7, y: 0, z: -40.3 },
    farC = { x: 33.7, y: 0, z: -18.3 };
  type Task = {
    id: string;
    at: Point;
    action: string;
    text?: string;
    ref: string;
    auto?: boolean;
    tree?: Point;
    run?: () => void;
    montage?: "inspect" | "harvest";
  };
  const tasks: Task[] = [
    {
      id: "learn",
      at: servantAt,
      action: "Meet the servant",
      auto: true,
      ref: "Jacob 5:1–6",
      text: "Jacob retells Zenos's allegory of the Lord's patient care. You are an imagined helper. Begin with the large decaying mother tree: prune it and loosen the soil around its roots.",
    },
    {
      id: "prune",
      at: home,
      tree: { x: 0, y: 0, z: 18 },
      action: "Prune and dig around the mother tree",
      ref: "Jacob 5:4–6",
      run: () => {
        decay.children.slice(0, 2).forEach((limb) => {
          limb.visible = false;
        });
      },
    },
    {
      id: "consultRoots",
      at: servantAt,
      action: "Return to the servant",
      auto: true,
      ref: "Jacob 5:4–11",
      text: "Now nourish the roots with water and mulch. Tender branches will appear. Then take the leafy branch from the wild tree and graft it beside the mother trunk.",
    },
    {
      id: "nourish",
      at: home,
      tree: { x: 0, y: 0, z: 18 },
      action: "Nourish the roots",
      ref: "Jacob 5:4–6",
      run: () => {
        rootCare.visible = true;
        young.visible = true;
      },
    },
    {
      id: "wild",
      at: { x: -22.3, y: 0, z: 18.7 },
      tree: { x: -24, y: 0, z: 17 },
      action: "Take the visible wild branch",
      ref: "Jacob 5:7–10",
      run: () => {
        wildBranch.visible = false;
        branchCount = 1;
      },
    },
    {
      id: "graft",
      at: home,
      tree: { x: 0, y: 0, z: 18 },
      action: "Graft beside the mother trunk",
      ref: "Jacob 5:9–11",
      run: () => {
        branch(0, 18);
        branchCount = 0;
      },
    },
    {
      id: "tender",
      at: home,
      tree: { x: 0, y: 0, z: 18 },
      action: "Take three tender branches",
      ref: "Jacob 5:13–14",
      run: () => {
        young.visible = false;
        branchCount = 3;
      },
    },
    {
      id: "plantA",
      at: farA,
      tree: { x: -30, y: 0, z: -20 },
      action: "Plant a branch in poor ground",
      ref: "Jacob 5:20–22",
      run: () => {
        poor.crown.scale.setScalar(0.7);
        branch(-30, -20);
        branchCount--;
      },
    },
    {
      id: "plantB",
      at: farB,
      tree: { x: 0, y: 0, z: -42 },
      action: "Plant a branch in still poorer ground",
      ref: "Jacob 5:23",
      run: () => {
        poorer.crown.scale.setScalar(0.7);
        branch(0, -42);
        branchCount--;
      },
    },
    {
      id: "plantC",
      at: farC,
      tree: { x: 32, y: 0, z: -20 },
      action: "Plant the last branch in choice ground",
      ref: "Jacob 5:24–25",
      run: () => {
        choice.crown.scale.setScalar(0.7);
        branch(32, -20);
        branchCount--;
      },
    },
    {
      id: "firstReturn",
      at: servantAt,
      action: "Return to the servant to inspect the plantings",
      auto: true,
      ref: "Jacob 5:15–25",
      montage: "inspect",
      run: () => {
        fruitful(true);
        for (const tree of [poor, poorer, choice])
          tree.crown.scale.setScalar(1);
        for (let i = 0; i < 12; i++)
          choice.fruit.setColorAt(i, new T.Color(i < 6 ? 0xcab557 : 0x5b4541));
        if (choice.fruit.instanceColor)
          choice.fruit.instanceColor.needsUpdate = true;
      },
    },
    {
      id: "mixed",
      at: farC,
      tree: { x: 32, y: 0, z: -20 },
      action: "Care for the tree with mixed fruit",
      ref: "Jacob 5:25–28",
      run: () => {
        branch(32, -20);
      },
    },
    {
      id: "decline",
      at: servantAt,
      action: "Consult the servant after another long season",
      auto: true,
      ref: "Jacob 5:29–56",
      text: "After another long time the fruit becomes corrupt throughout the vineyard. The servant pleads for more time. Gather a natural branch from the first distant tree and bring it back to the mother roots.",
      run: () => {
        fruitful(false);
        naturalBranch.visible = true;
      },
    },
    {
      id: "returnBranch",
      at: farA,
      tree: { x: -30, y: 0, z: -20 },
      action: "Collect the natural branch",
      ref: "Jacob 5:52–56",
      run: () => {
        naturalBranch.visible = false;
        branchCount = 1;
      },
    },
    {
      id: "regraft",
      at: home,
      tree: { x: 0, y: 0, z: 18 },
      action: "Regraft the natural branch beside the trunk",
      ref: "Jacob 5:52–60",
      run: () => {
        branch(-0.5, 18);
        branchCount = 0;
      },
    },
    {
      id: "helpers",
      at: servantAt,
      action: "Call fellow servants",
      ref: "Jacob 5:61–77",
      montage: "harvest",
      run: () => {
        helpers.forEach((helper) => {
          helper.group.visible = true;
        });
        healthy();
      },
    },
  ];
  let cameraPlayer = { x: 7, y: 0, z: 29 };
  let index = 0,
    pending = false,
    ended = false,
    time = 0;
  let montage: { kind: "inspect" | "harvest"; elapsed: number } | undefined;
  const views = [poor, poorer, choice];
  const advance = () => {
    pending = false;
    if (index === tasks.length - 1) ended = true;
    else index++;
  };
  land.update(0, tasks[0].at);
  return {
    name: "The Olive Vineyard",
    subtitle: "A playable allegory • Jacob 5",
    initialObjective: "Meet the servant in the olive garden",
    spawn: { x: 0, y: 0, z: 37 },
    solids,
    bounds: { minX: -65, maxX: 65, minZ: -60, maxZ: 60 },
    goal: { ...servantAt, radius: 3 },
    landmarks: [
      { name: "Decaying mother olive tree", x: 0, y: 0, z: 18 },
      { name: "Wild olive tree", x: -24, y: 0, z: 17 },
      { name: "Poor ground", ...farA },
      { name: "Poorer ground", ...farB },
      { name: "Choice ground", ...farC },
    ],
    update(dt, player) {
      if (ended) return;
      time += Math.min(Math.max(dt, 0), 0.1);
      land.update(dt, montage ? undefined : tasks[index]?.at);
      syncBranches();
      if (!attached) {
        carried.position.set(
          player.x + Math.cos(player.yaw) * 0.6,
          player.y + 0.8,
          player.z - Math.sin(player.yaw) * 0.6,
        );
        carried.rotation.y = player.yaw;
      }
    },
    adventure(hooks) {
      hooks.setAvatar("child");
      if (hooks.attachEquipment) {
        hooks.attachEquipment("rightHand", carried);
        attached = true;
        carried.position.set(0, -0.05, 0);
        carried.rotation.set(0, 0, -0.25);
      }
      hooks.toast(
        "Walk up to the servant. Press {action} once for each gardening action.",
      );
      const finish = () => {
        advance();
        if (ended) {
          land.marker.visible = false;
          hooks.complete();
        }
      };
      return {
        movementLocked: () => !!montage,
        camera: () => {
          if (!montage) return undefined;
          if (montage.elapsed >= 7.8)
            return {
              cut: true,
              position: {
                x: cameraPlayer.x + 6,
                y: cameraPlayer.y + 3.5,
                z: cameraPlayer.z + 7,
              },
              focus: {
                x: cameraPlayer.x,
                y: cameraPlayer.y + 1.1,
                z: cameraPlayer.z,
              },
            };
          const sequence =
            montage.kind === "harvest" ? [mother, ...views] : views;
          const tree =
            sequence[
              Math.min(
                sequence.length - 1,
                Math.floor(montage.elapsed / (7.8 / sequence.length)),
              )
            ];
          const { x, z } = tree.trunk.position;
          return {
            cut: true,
            position: { x: x + 18, y: 9, z: z + 25 },
            focus: { x: x + 1.4, y: 3, z: z + 0.5 },
          };
        },
        snapshot: () => ({
          phase: ended ? "done" : tasks[index].id,
          index,
          carrying: branchCount > 0,
          branchCount,
          montage: montage?.kind,
          targets: tasks.map((task) => ({ id: task.id, ...task.at })),
        }),
        update(dt, player, input) {
          cameraPlayer = { x: player.x, y: player.y, z: player.z };
          if (ended)
            return {
              objective: "Joy in the harvest",
              prompt: "Journey complete",
              carrying: false,
            };
          if (montage) {
            montage.elapsed += Math.min(Math.max(dt, 0), 0.1);
            if (montage.elapsed >= 8.6) {
              montage = undefined;
              finish();
            }
            return {
              objective:
                montage?.kind === "harvest"
                  ? "Good fruit returns throughout the vineyard"
                  : "Inspect the three distant plantings",
              prompt: "Watching the garden",
              carrying: false,
            };
          }
          const task = tasks[index],
            close = withinTask(
              player,
              task.tree ?? task.at,
              task.tree ? 3.4 : 2.8,
            );
          if (close && !pending && (task.auto || input.interact)) {
            pending = true;
            task.run?.();
            syncBranches();
            if (task.montage) {
              montage = { kind: task.montage, elapsed: 0 };
              hooks.toast(
                task.montage === "inspect"
                  ? "After a long time: poor ground and poorer ground bear good fruit; the choice planting bears mixed fruit."
                  : "The servants labor patiently together. Bad growth is removed gradually as good strengthens. The grove bears good fruit again.",
              );
            } else if (task.text)
              hooks.dialog(
                task.ref,
                "The servant's counsel",
                task.text,
                finish,
                {
                  actors: [
                    { group: servant.group, gesture: "talk", speaker: true },
                  ],
                  focus: servant.group,
                  wide: 6,
                },
              );
            else {
              hooks.toast(`${task.action} · ${task.ref}`);
              finish();
            }
          }
          return {
            objective: ended ? "Joy in the harvest" : tasks[index].action,
            prompt:
              close && !pending ? `{action} · ${tasks[index].action}` : "",
            carrying: branchCount > 0,
          };
        },
        dispose() {
          ended = true;
          carried.visible = false;
          land.marker.visible = false;
          carried.removeFromParent();
          root.add(carried);
        },
      };
    },
    dispose() {
      ended = true;
      carried.removeFromParent();
      root.add(carried);
      land.dispose();
    },
  };
}
