import * as T from "three";
import type { WorldData, Point } from "./worlds";
import { sceneryBox, terracedRock, markScenery } from "./scenery";
import { createCharacter } from "./character";
import { aimDirection, createArrowState, stepArrow } from "./hunting-physics";
import {
  createHuntingAnimal,
  createHuntingBow,
  createArrowModel,
} from "./hunting-models";

const p = (x: number, z: number, y = 0): Point => ({ x, y, z });
/** 1 Nephi 16:18–32. Landscape and animal species are an imagined Arabian setting. */
export function buildBrokenBow(scene: T.Scene): WorldData {
  scene.background = new T.Color(0xe8d6b5);
  scene.fog = new T.Fog(0xe8d6b5, 75, 160);
  const root = new T.Group();
  root.name = "The broken bow — wilderness provision";
  scene.add(root);
  root.add(new T.HemisphereLight(0xe9f4ff, 0xa28759, 2.2));
  const sun = new T.DirectionalLight(0xffdfad, 2.5);
  sun.position.set(-30, 65, 25);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {
    left: -70,
    right: 70,
    top: 70,
    bottom: -70,
    near: 1,
    far: 180,
  });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0002;
  root.add(sun);
  const solids: WorldData["solids"] = [];
  const mat = (color: number) =>
    new T.MeshStandardMaterial({ color, roughness: 0.95 });
  const sand = mat(0xcbb185),
    stone = mat(0xa68c68),
    wood = mat(0x71543b),
    green = mat(0x6f7950);
  sceneryBox(
    root,
    solids,
    sand,
    { x: 0, y: -1, z: 7, w: 140, h: 1, d: 140 },
    "Wilderness ground",
  );
  // A single broad ascending trail: adjacent steps have no coplanar overlap.
  for (let i = 0; i < 32; i++)
    sceneryBox(
      root,
      solids,
      i % 2 ? stone : sand,
      {
        x: Math.sin(i * 0.15) * 1.8,
        y: 0,
        z: 12 + i * 0.8,
        w: 7 + Math.sin(i * 0.7) * 0.4,
        h: (i + 1) * 0.25,
        d: 0.8,
      },
      "Mountain trail step",
    );
  // Adjacent ledges form an irregular mountain table, each surface owned once.
  for (let i = 0; i < 7; i++)
    sceneryBox(
      root,
      solids,
      stone,
      {
        x: Math.sin(i * 1.6) * 0.8,
        y: 0,
        z: 38.8 + i * 3.2,
        w: [23, 31, 36, 39, 36, 30, 24][i],
        h: 8,
        d: 3.2,
      },
      "Natural summit ledge",
    );
  // Rounded fitted shoulders bury the vertical edges, leaving the hunting ledge clear.
  for (const side of [-1, 1])
    for (let i = 0; i < 6; i++)
      terracedRock(
        root,
        solids,
        stone,
        {
          x: side * (12 + [0, 3, 6, 7, 5, 2][i]),
          y: 0,
          z: 38 + i * 4,
          w: 14,
          h: 7.7,
          d: 14,
        },
        "Rounded mountain escarpment",
      );
  for (let i = 0; i < 9; i++) {
    const hill = new T.Mesh(
      new T.ConeGeometry(1, 1, 7),
      mat(i % 2 ? 0xb09b7a : 0xc2aa85),
    );
    hill.position.set(-60 + i * 15, 10, 80);
    hill.scale.set(18, 20 + (i % 3) * 7, 14);
    hill.name = "Distant Arabian ridge";
    root.add(hill);
    markScenery(hill, {
      kind: "backdrop",
      reason: "Distant skyline beyond the playable mountain",
    });
  }
  for (const side of [-1, 1])
    for (let i = 0; i < 4; i++)
      terracedRock(
        root,
        solids,
        stone,
        {
          x: side * (13 + i * 7),
          y: 0,
          z: 13 + i * 5,
          w: 9,
          h: 3 + i * 1.3,
          d: 8,
        },
        "Weathered mountain shoulder",
      );
  const camp = p(0, -13),
    branch = p(-14, -5),
    stick = p(-18, 0),
    bench = p(7, -9),
    lehi = p(-5, -15),
    guide = p(1, -18),
    summit = p(0, 41, 8);
  sceneryBox(
    root,
    solids,
    wood,
    { x: 8, y: 0, z: -11, w: 3, h: 0.75, d: 1.4 },
    "Crafting bench",
  );
  for (const x of [-15, -20, 22]) {
    sceneryBox(
      root,
      solids,
      wood,
      { x, y: 0, z: 2, w: 0.55, h: 4, d: 0.55 },
      "Acacia trunk",
    );
    const crown = new T.Mesh(new T.IcosahedronGeometry(1, 1), green);
    crown.scale.set(3, 0.65, 2.5);
    crown.position.set(x, 4, 2);
    crown.name = "Acacia foliage";
    root.add(crown);
    markScenery(crown, {
      kind: "decoration",
      reason: "Flexible high foliage above solid trunk",
    });
  }
  const props = new T.Group();
  root.add(props);
  function prop(at: Point, color: number, scale: T.Vector3, name: string) {
    const m = new T.Mesh(new T.CylinderGeometry(0.08, 0.1, 1, 8), mat(color));
    m.position.set(at.x, at.y + 0.22, at.z);
    m.scale.copy(scale);
    m.rotation.z = 1.15;
    m.name = name;
    props.add(m);
    markScenery(m, {
      kind: "decoration",
      reason: "Small collectible lying below player foot clearance",
    });
    return m;
  }
  const branchMesh = prop(
    branch,
    0x977249,
    new T.Vector3(1, 2.5, 1),
    "Flexible bow wood",
  );
  const stickMesh = prop(
    stick,
    0xc8ad78,
    new T.Vector3(0.6, 2, 0.6),
    "Straight arrow stick",
  );
  const liahona = new T.Mesh(new T.SphereGeometry(0.28, 12, 8), mat(0xc6a452));
  liahona.position.set(guide.x, 0.4, guide.z);
  root.add(liahona);
  const people = [
    createCharacter("lehi"),
    createCharacter("laman"),
    createCharacter("lemuel"),
  ];
  people.forEach((a, i) => {
    a.group.position.set(lehi.x + i * 2, 0, lehi.z);
    root.add(a.group);
  });
  const animals = Array.from({ length: 3 }, (_, i) => {
    const model = createHuntingAnimal(i === 1 ? "gazelle" : "ibex");
    root.add(model.group);
    return {
      id: `animal-${i}`,
      model,
      position: new T.Vector3(-10 + i * 10, 8.9, 49 + i * 2),
      previous: new T.Vector3(),
      radius: 0.72,
      taken: false,
      alert: 0,
      escape: 0,
    };
  });
  const bow = createHuntingBow();
  root.add(bow.group);
  bow.group.visible = false;
  const nocked = createArrowModel();
  bow.group.add(nocked);
  nocked.visible = false;
  const steel = new T.Group();
  steel.name = "Steel bow breaking";
  root.add(steel);
  const steelMat = new T.MeshStandardMaterial({
    color: 0x7f8d98,
    metalness: 0.75,
    roughness: 0.3,
  });
  const steelHalves = [-1, 1].map((sign) => {
    const piece = new T.Mesh(
      new T.CylinderGeometry(0.04, 0.04, 0.7, 8),
      steelMat,
    );
    piece.position.y = sign * 0.35;
    piece.rotation.z = sign * 0.22;
    steel.add(piece);
    return piece;
  });
  const arrowModel = createArrowModel();
  root.add(arrowModel);
  arrowModel.visible = false;
  const marker = new T.Mesh(new T.ConeGeometry(0.25, 0.6, 7), mat(0x45bfff));
  marker.rotation.z = Math.PI;
  root.add(marker);
  const bundles = new T.Group();
  root.add(bundles);
  for (let i = 0; i < 3; i++) {
    const m = new T.Mesh(new T.SphereGeometry(0.28, 8, 6), mat(0xb68c60));
    m.scale.set(1.4, 0.7, 1);
    m.position.set(i * 0.6 - 0.6, 0.25, 0);
    bundles.add(m);
  }
  bundles.visible = false;
  const blockers = solids.map(
    (s) =>
      new T.Box3(
        new T.Vector3(s.x - s.w / 2, s.y, s.z - s.d / 2),
        new T.Vector3(s.x + s.w / 2, s.y + s.h, s.z + s.d / 2),
      ),
  );
  const aimDots = new T.InstancedMesh(
    new T.SphereGeometry(0.035, 6, 4),
    new T.MeshBasicMaterial({
      color: 0xd9f7ff,
      transparent: true,
      opacity: 0.75,
    }),
    12,
  );
  aimDots.name = "Bow trajectory sight";
  aimDots.visible = false;
  root.add(aimDots);
  const dotMatrix = new T.Matrix4();
  let disposed = false;
  return {
    name: "The Broken Bow",
    subtitle:
      "Provide for the family • 1 Nephi 16:18–32 • Imagined Arabian wildlife",
    initialObjective: "Meet the hungry family at camp",
    spawn: p(0, -22),
    solids,
    actorParent: root,
    bounds: { minX: -55, maxX: 55, minZ: -45, maxZ: 65 },
    goal: camp,
    landmarks: [
      { name: "Family camp", ...camp },
      { name: "Bow wood", ...branch },
      { name: "Straight stick", ...stick },
      { name: "Crafting bench", ...bench },
      { name: "Mountain trail", ...summit },
    ],
    adventure(hooks) {
      hooks.setAvatar("nephi");
      let phase = "camp",
        dialog = false,
        effort = 0,
        food = 0,
        aiming = false,
        charge = 0,
        yaw = 0,
        pitch = 0.03,
        time = 0,
        finished = false,
        breakTime = -1;
      let arrow: ReturnType<typeof createArrowState> | undefined;
      let aimCamera: { position: T.Vector3; focus: T.Vector3 } | undefined;
      const target = () =>
        phase === "camp" || phase === "return"
          ? camp
          : phase === "wood"
            ? branch
            : phase === "arrow"
              ? stick
              : phase === "craft"
                ? bench
                : phase === "counsel"
                  ? lehi
                  : phase === "guide"
                    ? guide
                    : summit;
      const say = (title: string, body: string, next: string) => {
        dialog = true;
        hooks.dialog(
          "1 Nephi 16:18–32",
          title,
          body,
          () => {
            phase = next;
            dialog = false;
            effort = 0;
          },
          {
            focus: target(),
            playerGesture: "talk",
            actors:
              phase === "camp" || phase === "counsel" || phase === "return"
                ? people.map((a, i) => ({
                    group: a.group,
                    speaker: i === 0,
                    gesture: "talk" as const,
                  }))
                : [],
          },
        );
      };
      const objective = () =>
        phase === "camp"
          ? "Meet the hungry family at camp"
          : phase === "wood"
            ? "Find a flexible branch for a wooden bow"
            : phase === "arrow"
              ? "Find a straight stick for an arrow"
              : phase === "craft"
                ? `Shape and string the wooden bow • ${effort}/3`
                : phase === "counsel"
                  ? "Ask Lehi where to find food"
                  : phase === "guide"
                    ? "Read the direction on the Liahona"
                    : phase === "hunt"
                      ? `Climb the mountain and provide food • ${food}/3`
                      : phase === "return"
                        ? "Carry the food back to your family"
                        : "The family has food for the journey";
      return {
        movementLocked: () => dialog || aiming,
        camera: () => (aiming ? aimCamera : undefined),
        snapshot: () => ({
          phase,
          effort,
          food,
          aiming,
          charge,
          yaw,
          pitch,
          target: target(),
          animals: animals.map((a) => ({
            id: a.id,
            position: a.position.clone(),
            taken: a.taken,
          })),
          arrow: arrow
            ? { position: arrow.position.clone(), active: arrow.active }
            : undefined,
        }),
        update(dt, player, input) {
          time += dt;
          if (breakTime >= 0) breakTime += dt;
          steel.visible =
            phase === "camp" || (breakTime < 1.8 && breakTime >= 0);
          steel.position.set(player.x + 0.4, player.y + 1.1, player.z + 0.25);
          steelHalves.forEach((piece, i) => {
            const sign = i ? 1 : -1;
            const fall = Math.max(0, breakTime);
            piece.position.set(
              sign * fall * 0.55,
              sign * 0.35 - fall * fall * 0.8,
              0,
            );
            piece.rotation.z = sign * (0.22 + fall * 1.7);
          });
          animals.forEach((a, i) => {
            a.previous.copy(a.position);
            if (!a.taken) {
              const nearby =
                Math.hypot(player.x - a.position.x, player.z - a.position.z) <
                  7 && Math.abs(player.y - 8) < 2;
              const missedNearby =
                arrow?.active && arrow.position.distanceTo(a.position) < 3;
              if (phase === "hunt" && (nearby || missedNearby)) a.alert = 2.4;
              else a.alert = Math.max(0, a.alert - dt);
              const escapeGoal = a.alert > 0 ? (i % 2 ? 3 : -3) : 0;
              a.escape += T.MathUtils.clamp(
                escapeGoal - a.escape,
                -dt * 2.5,
                dt * 2.5,
              );
              a.position.set(
                T.MathUtils.clamp(
                  -11 + i * 10 + Math.sin(time * 0.23 + i) * 2.8 + a.escape,
                  -14,
                  14,
                ),
                8.9,
                49 + i * 2 + Math.cos(time * 0.19 + i) * 1.3,
              );
              a.model.group.position.set(a.position.x, 8, a.position.z);
              a.model.group.rotation.y =
                Math.cos(time * 0.23 + i) > 0 ? Math.PI / 2 : -Math.PI / 2;
              a.model.animate(time, a.alert > 0 ? 2.8 : 0.65);
            }
            a.model.group.visible = !a.taken;
          });
          if (arrow?.active) {
            const hit = stepArrow(
              arrow,
              dt,
              blockers,
              animals.filter((a) => !a.taken),
            );
            if (hit?.kind === "animal") {
              const a = animals.find((a) => a.id === hit.targetId);
              if (a && !a.taken) {
                a.taken = true;
                food++;
                hooks.toast(`Food secured for the family • ${food}/3`);
                if (food === 3) {
                  phase = "return";
                  aiming = false;
                }
              }
            }
            arrowModel.visible = arrow.active;
            arrowModel.position.copy(arrow.position);
            arrowModel.quaternion.setFromUnitVectors(
              new T.Vector3(0, 0, 1),
              arrow.velocity.clone().normalize(),
            );
          }
          const t = target(),
            near =
              Math.hypot(player.x - t.x, player.z - t.z) < 3 &&
              Math.abs(player.y - t.y) < 2.5;
          marker.visible = !aiming && phase !== "done";
          marker.position.set(t.x, t.y + 2.8 + Math.sin(time * 2) * 0.12, t.z);
          bow.group.visible = phase === "hunt";
          bow.group.position.set(
            player.x + Math.cos(yaw) * 0.35,
            player.y + 1.15,
            player.z - Math.sin(yaw) * 0.35,
          );
          nocked.visible = aiming;
          nocked.position.set(0, 0, 0.69 - charge * 0.53);
          bow.group.rotation.set(-pitch, yaw, 0, "YXZ");
          bow.setDraw(charge);
          const shotOrigin = () =>
            new T.Vector3(
              player.x + Math.cos(yaw) * 0.35,
              player.y + 1.15,
              player.z - Math.sin(yaw) * 0.35,
            ).addScaledVector(aimDirection(yaw, pitch), 0.69 - charge * 0.53);
          const direction = aimDirection(yaw, pitch),
            eye = new T.Vector3(player.x, player.y + 1.55, player.z);
          const cameraPosition = eye
            .clone()
            .addScaledVector(direction, -2.3)
            .add(
              new T.Vector3(Math.cos(yaw) * 0.95, 0.45, -Math.sin(yaw) * 0.95),
            );
          // Short shoulder camera, recovered upward if a wall approaches from behind.
          for (
            let i = 0;
            i < 24 &&
            blockers.some((b) =>
              b.clone().expandByScalar(0.2).containsPoint(cameraPosition),
            );
            i++
          )
            cameraPosition.y += 0.3;
          aimDots.visible = aiming;
          if (aiming) {
            const preview = createArrowState(shotOrigin(), yaw, pitch, charge);
            for (let i = 0; i < 12; i++) {
              const t = (i + 1) * 0.025;
              const point = preview.position
                .clone()
                .addScaledVector(preview.velocity, t);
              point.y -= 4.905 * t * t;
              dotMatrix.makeTranslation(point.x, point.y, point.z);
              aimDots.setMatrixAt(i, dotMatrix);
            }
            aimDots.instanceMatrix.needsUpdate = true;
          }
          aimCamera = {
            position: cameraPosition,
            focus: shotOrigin().addScaledVector(direction, 30),
          };
          bundles.visible = phase === "return" || phase === "done";
          if (phase === "return")
            bundles.position.set(player.x, player.y + 1.1, player.z - 0.3);
          else bundles.position.set(camp.x, 0, camp.z);
          let prompt = near ? "Interact" : "";
          if (phase === "hunt") {
            prompt = aiming
              ? `Hold {action} to draw; release to fire • {move} aims • ${Math.round(charge * 100)}%`
              : "Hold {action} to aim and draw; release to fire";
            if (input.jump || input.crouch) {
              aiming = false;
              charge = 0;
            } else if (!dialog && input.interactHeld) {
              if (!aiming) {
                aiming = true;
                yaw = player.yaw;
                charge = 0;
              }
              yaw -= input.x * dt * 1.2;
              pitch = T.MathUtils.clamp(
                pitch + input.y * dt * 0.7,
                -0.25,
                0.65,
              );
              charge = Math.min(1, charge + dt / 1.1);
              player.yaw = yaw;
            }
            if (aiming && !input.interactHeld) {
              if (charge > 0.12) {
                arrow = createArrowState(shotOrigin(), yaw, pitch, charge);
                arrowModel.visible = true;
                arrowModel.position.copy(arrow.position);
                arrowModel.quaternion.setFromUnitVectors(
                  new T.Vector3(0, 0, 1),
                  arrow.velocity.clone().normalize(),
                );
              }
              aiming = false;
              charge = 0;
            }
          } else if (!dialog && near && input.interact) {
            if (phase === "camp") {
              breakTime = 0;
              say(
                "The steel bow breaks",
                "Nephi’s steel bow breaks, and his brothers’ bows have lost their spring. The family is hungry. Nephi chooses to act: make a wooden bow and a straight-stick arrow.",
                "wood",
              );
            } else if (phase === "wood") {
              branchMesh.visible = false;
              phase = "arrow";
              hooks.toast(
                "A flexible piece of wood. Now find a straight stick.",
              );
            } else if (phase === "arrow") {
              stickMesh.visible = false;
              phase = "craft";
              hooks.toast(
                "A straight arrow shaft. Shape your bow at the bench.",
              );
            } else if (phase === "craft") {
              effort++;
              hooks.toast(
                [
                  "Shape the wood along its grain.",
                  "Fit the string and prepare the arrow.",
                  "A wooden bow and straight-stick arrow are ready.",
                ][effort - 1],
              );
              if (effort === 3) phase = "counsel";
            } else if (phase === "counsel")
              say(
                "Where shall I go?",
                "Nephi asks his father where he should go to obtain food. Lehi humbles himself and inquires of the Lord.",
                "guide",
              );
            else if (phase === "guide")
              say(
                "Into the mountains",
                "The writing on the Liahona gives direction. Follow the trail into the mountain. Aim carefully and bring back enough food for the family. Wildlife and hunting details here are imagined; the scripture does not identify the species.",
                "hunt",
              );
            else if (phase === "return")
              say(
                "Food for the family",
                "Nephi returns with food. The family rejoices, humbles themselves, and gives thanks to the Lord.",
                "done",
              );
          }
          if (phase === "done" && !finished) {
            finished = true;
            hooks.complete();
          }
          return {
            objective: objective(),
            prompt,
            carrying: phase === "return",
            aiming,
            draw: charge,
          };
        },
        dispose() {
          aiming = false;
          bow.group.visible = false;
          arrowModel.visible = false;
        },
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      sun.dispose();
      people.forEach((a) => a.dispose());
      animals.forEach((a) => a.model.dispose());
      bow.dispose();
      const gs = new Set<T.BufferGeometry>(),
        ms = new Set<T.Material>();
      root.traverse((o) => {
        if (o instanceof T.InstancedMesh) o.dispose();
        if (o instanceof T.Mesh) {
          gs.add(o.geometry);
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
            ms.add(m),
          );
        }
      });
      gs.forEach((g) => g.dispose());
      ms.forEach((m) => m.dispose());
      root.removeFromParent();
    },
  };
}
