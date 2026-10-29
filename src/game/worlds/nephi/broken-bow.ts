import * as T from "three";
import type { WorldData, Point } from "../../runtime/worlds";
import {
  sceneryBox,
  sceneryCanvasTent,
  terracedRock,
  markScenery,
} from "../shared/scenery";
import { createCharacter } from "../../characters/character";
import {
  aimDirection,
  createArrowState,
  stepArrow,
} from "../../physics/hunting-physics";
import {
  createHuntingAnimal,
  createHuntingBow,
  createArrowModel,
} from "../../rendering/hunting-models";

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
  const canvas = new T.MeshStandardMaterial({
    color: 0xbfa77e,
    roughness: 0.98,
    side: T.DoubleSide,
  });
  sceneryBox(
    root,
    solids,
    sand,
    { x: 0, y: -1, z: 7, w: 140, h: 1, d: 140 },
    "Wilderness ground",
  );
  // Distinct landings leave short crevices. The first rise requires a normal
  // jump, and each later rise remains within the ordinary jump envelope.
  const trail = [
    { x: 0, z: 14, top: 0.85, w: 5, d: 3.4 },
    { x: -1, z: 18, top: 1.7, w: 4.5, d: 3.1 },
    { x: 0.8, z: 22, top: 2.6, w: 5.1, d: 3.1 },
    { x: 1.3, z: 26, top: 3.5, w: 4.8, d: 3.1 },
    { x: -0.7, z: 30, top: 4.45, w: 5.2, d: 3.1 },
    { x: -1.2, z: 34, top: 5.4, w: 4.8, d: 3.1 },
    { x: 0.6, z: 38, top: 6.35, w: 5, d: 3.1 },
    { x: 0.2, z: 42, top: 7.3, w: 5.5, d: 3.3 },
  ];
  for (const [i, ledge] of trail.entries())
    sceneryBox(
      root,
      solids,
      i % 2 ? stone : sand,
      {
        x: ledge.x,
        y: 0,
        z: ledge.z,
        w: ledge.w,
        h: ledge.top,
        d: ledge.d,
      },
      "Weathered trail boulder",
    );
  // Three touching ledges share no area. Staggered fronts and backs break the
  // tabletop outline while preserving the central practice/hunting route.
  for (const ledge of [
    { x: -8.25, z: 48.5, w: 6.5, d: 7 },
    { x: 0, z: 48, w: 10, d: 8 },
    { x: 8.25, z: 48.3, w: 6.5, d: 8 },
  ])
    sceneryBox(
      root,
      solids,
      stone,
      { ...ledge, y: 0, h: 8 },
      "Practice and hunting summit ledge",
    );
  // A fitted, lower rock apron masks the tall front face while keeping the
  // broad hunting surface owned by the summit itself. Its top is 0.9m lower,
  // so the overlap cannot introduce a coplanar walk surface.
  terracedRock(
    root,
    solids,
    stone,
    { x: 0, y: 0, z: 43, w: 12, h: 7.1, d: 9 },
    "Fitted summit apron",
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
          z: 46 + i * 4,
          w: 14,
          h: 7.2,
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
    branch = p(-18, -4),
    stick = p(19, 2),
    lehi = p(-5, -15),
    guide = p(7, -19),
    summit = p(0, 46, 8);
  for (const [x, z, width, depth] of [
    [-13, -23, 5.8, 5.4],
    [10, -24, 6.2, 5.8],
    [17, -17, 5.3, 5],
  ])
    sceneryCanvasTent(
      root,
      solids,
      { canvas, wood },
      {
        x,
        y: 0,
        z,
        width,
        depth,
        eaveHeight: 1.4,
        ridgeHeight: 3.15,
        doorWidth: 1.8,
      },
      "Family canvas shelter",
    );
  // A sheltered side path reaches a small view terrace west of the ascent.
  for (const [x, z, w, h, d] of [
    [-23, 6, 3.2, 1.3, 3],
    [-28, 12, 4.8, 1.6, 4],
    [-26, 19, 6.4, 1.8, 5],
  ])
    sceneryBox(
      root,
      solids,
      stone,
      { x, y: 0, z, w, h, d },
      "Foothill lookout rock",
    );
  for (const [x, z] of [
    [-8, -17],
    [13, -14],
    [19, -20],
  ]) {
    const jar = new T.Mesh(
      new T.CylinderGeometry(0.24, 0.2, 0.52, 9),
      mat(0x987c5b),
    );
    jar.position.set(x, 0.27, z);
    jar.name = "Household water jar";
    root.add(jar);
    markScenery(jar, {
      kind: "decoration",
      reason: "Small household vessel below foot clearance",
    });
  }
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
  steel.name = "Steel bow";
  root.add(steel);
  const steelMat = new T.MeshStandardMaterial({
    color: 0x7f8d98,
    metalness: 0.75,
    roughness: 0.3,
  });
  const steelHalves = [-1, 1].map((sign) => {
    const piece = new T.Mesh(
      new T.TubeGeometry(
        new T.CatmullRomCurve3([
          new T.Vector3(0, 0, -0.03),
          new T.Vector3(0, sign * 0.28, -0.11),
          new T.Vector3(0, sign * 0.52, -0.05),
          new T.Vector3(0, sign * 0.72, 0.15),
        ]),
        12,
        0.036,
        6,
        false,
      ),
      steelMat,
    );
    steel.add(piece);
    return piece;
  });
  const steelString = new T.Line(
    new T.BufferGeometry().setFromPoints([
      new T.Vector3(0, -0.72, 0.15),
      new T.Vector3(0, 0, 0.15),
      new T.Vector3(0, 0.72, 0.15),
    ]),
    new T.LineBasicMaterial({ color: 0xdad9cf }),
  );
  steel.add(steelString);
  const steelNocked = createArrowModel();
  steel.add(steelNocked);
  steelNocked.visible = false;
  const arrowModel = createArrowModel();
  root.add(arrowModel);
  arrowModel.visible = false;
  const marker = new T.Mesh(new T.ConeGeometry(0.25, 0.6, 7), mat(0x45bfff));
  marker.rotation.z = Math.PI;
  root.add(marker);
  const bundles = new T.Group();
  bundles.name = "Secured hunted animals";
  root.add(bundles);
  for (let i = 0; i < 3; i++) {
    const animal = new T.Group();
    animal.name = `Carried ibex silhouette ${i + 1}`;
    animal.position.set((i - 1) * 0.24, -0.18 - i * 0.05, -0.14);
    animal.rotation.x = Math.PI / 2;
    animal.rotation.z = (i - 1) * 0.18;
    const coat = mat(i === 1 ? 0xb79b70 : 0x927252);
    const body = new T.Mesh(new T.SphereGeometry(1, 9, 7), coat);
    body.scale.set(0.15, 0.12, 0.34);
    animal.add(body);
    const head = new T.Mesh(new T.SphereGeometry(1, 8, 6), coat);
    head.position.z = 0.37;
    head.scale.set(0.11, 0.1, 0.14);
    animal.add(head);
    for (const side of [-1, 1]) {
      const horn = new T.Mesh(new T.ConeGeometry(0.025, 0.18, 5), wood);
      horn.position.set(side * 0.07, 0.12, 0.36);
      horn.rotation.z = side * 0.35;
      animal.add(horn);
      for (const z of [-0.16, 0.18]) {
        const leg = new T.Mesh(
          new T.CylinderGeometry(0.025, 0.018, 0.26, 5),
          coat,
        );
        leg.position.set(side * 0.1, -0.17, z);
        animal.add(leg);
      }
    }
    bundles.add(animal);
  }
  const carrierTie = new T.Mesh(new T.BoxGeometry(0.82, 0.045, 0.045), wood);
  carrierTie.name = "Carrier tie across provisions";
  carrierTie.position.set(0, -0.19, -0.27);
  bundles.add(carrierTie);
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
    initialObjective: "Climb the mountain for target practice",
    spawn: p(0, -22),
    solids,
    actorParent: root,
    bounds: { minX: -55, maxX: 55, minZ: -45, maxZ: 65 },
    goal: camp,
    landmarks: [
      { name: "Family camp", ...camp },
      { name: "Bow wood", ...branch },
      { name: "Straight stick", ...stick },
      { name: "Mountain trail", ...summit },
    ],
    adventure(hooks) {
      hooks.setAvatar("nephi");
      hooks.attachEquipment?.("leftHand", steel);
      hooks.attachEquipment?.("back", bundles);
      let phase = "practice",
        dialog = false,
        practiceShots = 0,
        food = 0,
        aiming = false,
        charge = 0,
        yaw = 0,
        pitch = 0.03,
        time = 0,
        finished = false,
        optionalTalked = false,
        breakTime = -1;
      let arrow: ReturnType<typeof createArrowState> | undefined;
      let aimCamera: { position: T.Vector3; focus: T.Vector3 } | undefined;
      const target = () =>
        phase === "return"
          ? camp
          : phase === "wood"
            ? branch
            : phase === "arrow"
              ? stick
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
          },
          {
            focus: target(),
            cutaway: phase === "snapped",
            playerGesture: phase === "snapped" ? undefined : "talk",
            actors:
              phase === "snapped" || phase === "counsel" || phase === "return"
                ? people.map((a, i) => ({
                    group: a.group,
                    speaker: phase === "snapped" ? i === 1 : i === 0,
                    gesture:
                      phase === "snapped" && i === 0
                        ? ("recoil" as const)
                        : ("talk" as const),
                  }))
                : [],
          },
        );
      };
      const objective = () =>
        phase === "practice"
          ? `Climb the mountain for target practice • ${practiceShots}/3 shots`
          : phase === "snapped"
            ? "The steel bow has broken"
            : phase === "wood"
              ? "Find a flexible branch for a wooden bow"
              : phase === "arrow"
                ? "Find a straight stick for an arrow"
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
        movementLocked: () => dialog || aiming || phase === "snapped",
        camera: () => (aiming ? aimCamera : undefined),
        snapshot: () => ({
          phase,
          practiceShots,
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
          if (phase === "snapped" && breakTime > 0.8 && !dialog)
            say(
              "The family is hungry",
              "After the steel bow breaks, Laman and Lemuel lament that their bows have lost their spring and the family has no food. Nephi resolves to make a wooden bow and a straight-stick arrow.",
              "wood",
            );
          steel.visible =
            phase === "practice" || (breakTime < 1.8 && breakTime >= 0);
          if (!hooks.attachEquipment)
            steel.position.set(player.x + 0.4, player.y + 1.1, player.z + 0.25);
          const orientHeld = (group: T.Group) => {
            const desired = new T.Quaternion().setFromEuler(
              new T.Euler(-pitch, yaw, 0, "YXZ"),
            );
            if (hooks.attachEquipment && group.parent) {
              group.parent.updateWorldMatrix(true, false);
              const parentRotation = group.parent.getWorldQuaternion(
                new T.Quaternion(),
              );
              group.quaternion.copy(parentRotation.invert().multiply(desired));
            } else group.quaternion.copy(desired);
          };
          orientHeld(steel);
          steelNocked.visible = phase === "practice" && aiming;
          steelNocked.position.z = 0.69 - charge * 0.53;
          steelHalves.forEach((piece, i) => {
            const sign = i ? 1 : -1;
            const fall = Math.max(0, breakTime);
            piece.position.set(sign * fall * 0.55, -fall * fall * 0.8, 0);
            piece.rotation.z = sign * fall * 1.7;
          });
          steelString.visible = breakTime < 0;
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
              phase === "hunt" ? animals.filter((a) => !a.taken) : [],
            );
            if (phase === "hunt" && hit?.kind === "animal") {
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
          bow.group.visible =
            phase === "hunt" ||
            phase === "return" ||
            phase === "counsel" ||
            phase === "guide" ||
            phase === "arrow";
          if (!hooks.attachEquipment)
            bow.group.position.set(
              player.x + Math.cos(yaw) * 0.35,
              player.y + 1.15,
              player.z - Math.sin(yaw) * 0.35,
            );
          nocked.visible = phase === "hunt" && aiming;
          nocked.position.set(0, 0, 0.69 - charge * 0.53);
          orientHeld(bow.group);
          bow.setDraw(charge);
          const syncNock = () => {
            const offset = 0.69 - charge * 0.53;
            nocked.position.z = offset;
            steelNocked.position.z = offset;
            nocked.visible = phase === "hunt" && aiming;
            steelNocked.visible = phase === "practice" && aiming;
            bow.setDraw(charge);
            const steelLine = steelString.geometry.getAttribute(
              "position",
            ) as T.BufferAttribute;
            steelLine.setZ(1, 0.15 - charge * 0.53);
            steelLine.needsUpdate = true;
            steelString.geometry.computeBoundingSphere();
            if (hooks.attachEquipment)
              heldNock().updateWorldMatrix(true, false);
          };
          const heldNock = () => (phase === "practice" ? steelNocked : nocked);
          const shotOrigin = () => {
            if (hooks.attachEquipment) {
              const nock = heldNock();
              nock.updateWorldMatrix(true, false);
              return nock.getWorldPosition(new T.Vector3());
            }
            return new T.Vector3(
              player.x + Math.cos(yaw) * 0.35,
              player.y + 1.15,
              player.z - Math.sin(yaw) * 0.35,
            ).addScaledVector(aimDirection(yaw, pitch), 0.69 - charge * 0.53);
          };
          const direction = hooks.attachEquipment
              ? new T.Vector3(0, 0, 1).applyQuaternion(
                  heldNock().getWorldQuaternion(new T.Quaternion()),
                )
              : aimDirection(yaw, pitch),
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
            const preview = createArrowState(
              shotOrigin(),
              Math.atan2(direction.x, direction.z),
              Math.asin(direction.y),
              charge,
            );
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
          bundles.visible = food > 0 && phase !== "done";
          bundles.children.forEach(
            (animal, i) => (animal.visible = i < 3 ? i < food : true),
          );
          if (!hooks.attachEquipment)
            bundles.position.set(player.x, player.y + 1.15, player.z - 0.42);
          let prompt = near ? "Interact" : "";
          const optionalNear =
            !optionalTalked &&
            (phase === "practice" || phase === "wood" || phase === "arrow") &&
            Math.hypot(player.x - (lehi.x + 4), player.z - lehi.z) < 2.4 &&
            Math.abs(player.y) < 1;
          if (optionalNear) prompt = "Speak with Lemuel";
          if (phase === "hunt" || phase === "practice") {
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
              orientHeld(phase === "practice" ? steel : bow.group);
              syncNock();
              player.yaw = yaw;
            }
            if (aiming && !input.interactHeld) {
              if (charge > 0.12) {
                syncNock();
                arrow = createArrowState(
                  shotOrigin(),
                  Math.atan2(direction.x, direction.z),
                  Math.asin(direction.y),
                  charge,
                );
                arrowModel.visible = true;
                arrowModel.position.copy(arrow.position);
                arrowModel.quaternion.setFromUnitVectors(
                  new T.Vector3(0, 0, 1),
                  arrow.velocity.clone().normalize(),
                );
                if (
                  phase === "practice" &&
                  Math.hypot(player.x - summit.x, player.z - summit.z) < 9 &&
                  Math.abs(player.y - summit.y) < 1.5
                ) {
                  practiceShots++;
                  if (practiceShots === 3) {
                    breakTime = 0;
                    phase = "snapped";
                    arrow.active = false;
                    arrow = undefined;
                    arrowModel.visible = false;
                    hooks.toast("The steel bow snaps in Nephi's hand.");
                  }
                }
              }
              aiming = false;
              charge = 0;
              syncNock();
            }
          } else if (!dialog && optionalNear && input.interact) {
            optionalTalked = true;
            dialog = true;
            hooks.dialog(
              "Camp conversation",
              "A long journey",
              "Lemuel: The journey has worn us down. I hope we find food soon.",
              () => {
                dialog = false;
              },
              {
                focus: people[2].group,
                actors: [
                  { group: people[2].group, speaker: true, gesture: "talk" },
                ],
              },
            );
          } else if (!dialog && near && input.interact) {
            if (phase === "wood") {
              branchMesh.visible = false;
              phase = "arrow";
              hooks.toast(
                "A flexible piece of wood. Now find a straight stick.",
              );
            } else if (phase === "arrow") {
              stickMesh.visible = false;
              phase = "counsel";
              hooks.attachEquipment?.("leftHand", bow.group);
              hooks.toast(
                "Nephi shapes the wooden bow and straight-stick arrow. Ask Lehi for counsel.",
              );
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
          }
          if (
            phase === "return" &&
            !dialog &&
            player.grounded &&
            Math.abs(player.y - camp.y) < 0.6 &&
            Math.hypot(player.x - camp.x, player.z - camp.z) < 3
          )
            say(
              "Food for the family",
              "Nephi returns with food. The family rejoices, humbles themselves, and gives thanks to the Lord.",
              "done",
            );
          if (phase === "done" && !finished) {
            finished = true;
            hooks.complete();
          }
          return {
            objective: objective(),
            prompt,
            carrying: false,
            aiming,
            draw: charge,
            holdingBow:
              phase === "practice" ||
              phase === "hunt" ||
              phase === "return" ||
              phase === "counsel" ||
              phase === "guide",
          };
        },
        dispose() {
          aiming = false;
          bow.group.visible = false;
          arrowModel.visible = false;
          // Runtime sockets belong to the avatar, which the host disposes before
          // the world. Return equipment to the world for its resource pass.
          root.add(steel, bow.group, bundles);
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
        if (o instanceof T.Mesh || o instanceof T.Line) {
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
