import * as T from "three";
import type { WorldData, Point } from "./worlds";
import { sceneryBox, terracedRock, markScenery } from "./scenery";
import { createCharacter } from "./character";
import { cameraSegmentClear } from "./camera";
import { aimDirection } from "./hunting-physics";
import {
  createSlingSpinState,
  stepSlingSpin,
  slingCharge,
  releaseSlingStone,
  requestSlingRelease,
  stepStone,
} from "./sling-physics";
import { createSlingModel, createStoneModel } from "./sling-models";

const point = (x: number, z: number): Point => ({ x, y: 0, z });
/** Alma 17:19–39; the landscape and sheep-like appearance are imagined. */
export function buildAmmonFlocks(scene: T.Scene): WorldData {
  scene.background = new T.Color(0xc5dfdd);
  scene.fog = new T.Fog(0xc5dfdd, 65, 140);
  const root = new T.Group();
  root.name = "Ammon and the flocks at Sebus";
  scene.add(root);
  root.add(new T.HemisphereLight(0xf0fbff, 0x687e40, 2.5));
  const sun = new T.DirectionalLight(0xffe4b5, 2.4);
  sun.position.set(-20, 45, -15);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {
    left: -42,
    right: 42,
    top: 46,
    bottom: -42,
    near: 1,
    far: 120,
  });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.03;
  root.add(sun);
  const solids: WorldData["solids"] = [];
  const material = (color: number) =>
    new T.MeshStandardMaterial({ color, roughness: 0.95 });
  const grass = material(0x9ca764),
    rock = material(0xa29676),
    timber = material(0x79563b);
  const ground = sceneryBox(
    root,
    solids,
    grass,
    { x: 0, y: -1, z: 6, w: 96, h: 1, d: 110 },
    "Pasture ground",
  );
  // Color the single owning ground mesh; the worn path adds no duplicate floor.
  ground.geometry = new T.BoxGeometry(1, 1, 1, 48, 1, 55);
  const groundPositions = ground.geometry.attributes.position;
  const colors = new Float32Array(groundPositions.count * 3);
  const grassColor = new T.Color(0xa3ad6f),
    dirtColor = new T.Color(0xc5ac7c);
  for (let i = 0; i < groundPositions.count; i++) {
    const x = groundPositions.getX(i) * 96,
      z = groundPositions.getZ(i) * 110 + 6;
    const pathX = Math.sin(z * 0.09) * 1.4;
    const worn = Math.exp(-Math.pow((x - pathX) / 3.2, 2)) * 0.85;
    const variation =
      0.94 +
      0.055 * Math.sin(x * 0.43 + z * 0.23) +
      0.035 * Math.cos(z * 0.61 - x * 0.17);
    const color = grassColor
      .clone()
      .lerp(dirtColor, worn)
      .multiplyScalar(variation);
    colors.set([color.r, color.g, color.b], i * 3);
  }
  ground.geometry.setAttribute("color", new T.BufferAttribute(colors, 3));
  grass.color.set(0xffffff);
  grass.vertexColors = true;
  const shrubGeometry = new T.IcosahedronGeometry(1, 0),
    shrubMaterial = material(0x72874b);
  const shrubs = new T.InstancedMesh(shrubGeometry, shrubMaterial, 16);
  shrubs.name = "Distant scrub border";
  const transform = new T.Object3D();
  for (let i = 0; i < 16; i++) {
    transform.position.set(
      (i % 2 ? -1 : 1) * (39 + (i % 3) * 2),
      0.65,
      -32 + Math.floor(i / 2) * 10,
    );
    transform.scale.set(1.6, 0.8, 1.3);
    transform.rotation.y = i * 1.7;
    transform.updateMatrix();
    shrubs.setMatrixAt(i, transform.matrix);
  }
  shrubs.instanceMatrix.needsUpdate = true;
  root.add(shrubs);
  markScenery(shrubs, {
    kind: "backdrop",
    reason:
      "Scrub beyond the playable bounds; keeps the herding corridor clear",
  });
  for (let i = 0; i < 7; i++) {
    const hill = new T.Mesh(
      new T.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      material(i % 2 ? 0x85905f : 0x9aa16e),
    );
    hill.name = "Distant pastoral hill";
    hill.position.set(-75 + i * 25, -0.2, 70 + Math.sin(i) * 8);
    hill.scale.set(22, 9 + (i % 3) * 4, 15);
    root.add(hill);
    markScenery(hill, {
      kind: "backdrop",
      reason: "Rounded skyline beyond the playable pasture",
    });
  }
  // Buildings and terraces stay outside the wide route between the royal yard and Sebus.
  sceneryBox(
    root,
    solids,
    material(0xc5ae81),
    { x: -13, y: 0, z: -29, w: 10, h: 5, d: 7 },
    "Lamoni's house",
  );
  for (const x of [-27, 27])
    for (let i = 0; i < 3; i++)
      terracedRock(
        root,
        solids,
        rock,
        { x, y: 0, z: i * 17 - 5, w: 7, h: 2 + i, d: 8 },
        "Pasture rock terrace",
      );
  for (const x of [-18, 19]) {
    sceneryBox(
      root,
      solids,
      timber,
      { x, y: 0, z: 9, w: 0.7, h: 4.2, d: 0.7 },
      "Shade tree trunk",
    );
    const crown = new T.Mesh(
      new T.IcosahedronGeometry(1, 1),
      material(0x64824b),
    );
    crown.position.set(x, 4.7, 9);
    crown.scale.set(3.1, 1.2, 3.1);
    root.add(crown);
    markScenery(crown, {
      kind: "decoration",
      reason: "High flexible canopy over the solid trunk",
    });
  }
  // Animals reach the shallow southern edge of the visible water to drink.
  const water = new T.Mesh(new T.CircleGeometry(5, 32), material(0x78b9bf));
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0.015, 37);
  root.add(water);
  markScenery(water, {
    kind: "decoration",
    reason: "Shallow drinking water over the single owning pasture ground",
  });
  const court = point(0, -25),
    sebus = point(0, 34);
  const king = createCharacter("lamoni"),
    servant = createCharacter("sam");
  king.group.position.set(-3, 0, -25);
  servant.group.position.set(3, 0, -24);
  root.add(king.group, servant.group);
  const wool = material(0xe6dfc5),
    face = material(0x78624c);
  const flock = Array.from({ length: 6 }, (_, i) => {
    const group = new T.Group();
    group.name = `Imagined flock animal ${i + 1}`;
    const body = new T.Mesh(new T.IcosahedronGeometry(0.6, 1), wool);
    body.scale.set(0.8, 0.8, 1.25);
    body.position.y = 0.8;
    group.add(body);
    const head = new T.Mesh(new T.SphereGeometry(0.25, 8, 6), face);
    head.name = "Flock drinking head";
    head.position.set(0, 0.95, 0.75);
    group.add(head);
    for (const x of [-0.26, 0.26])
      for (const z of [-0.4, 0.4]) {
        const leg = new T.Mesh(
          new T.CylinderGeometry(0.07, 0.07, 0.55, 6),
          face,
        );
        leg.position.set(x, 0.28, z);
        group.add(leg);
      }
    root.add(group);
    markScenery(group, {
      kind: "decoration",
      reason:
        "Moving flock actors; player pressure steers animals without static blocking boxes",
    });
    const indicator = new T.Mesh(
      new T.ConeGeometry(0.18, 0.45, 6),
      material(0xffd771),
    );
    indicator.name = "Stray flock indicator";
    indicator.rotation.z = Math.PI;
    indicator.position.y = 2;
    indicator.visible = false;
    group.add(indicator);
    return {
      group,
      indicator,
      settled: false,
      position: new T.Vector3(
        ((i % 3) - 1) * 1.8,
        0,
        -18 + Math.floor(i / 3) * 2,
      ),
      velocity: new T.Vector3(),
    };
  });
  flock.forEach((a) => a.group.position.copy(a.position));
  const raiders = Array.from({ length: 3 }, (_, i) => {
    const model = createCharacter("laman", { quality: "crowd" });
    // Costume communicates the role; ancestry and skin tone never identify enemies.
    model.group.name = `Masked flock raider ${i + 1}`;
    model.group.traverse((object) => {
      if (!(object instanceof T.Mesh)) return;
      if (object.name.includes("beard")) object.visible = false;
      if (/robe|coat|mantle|tunic|trouser|sleeve|sash/.test(object.name)) {
        for (const mat of Array.isArray(object.material)
          ? object.material
          : [object.material])
          if (mat instanceof T.MeshStandardMaterial) mat.color.set(0x242933);
      }
    });
    const mask = new T.Mesh(new T.SphereGeometry(1, 12, 8), material(0x171c25));
    mask.name = "Imagined dark cloth face covering";
    mask.position.set(0, 0.075, 0.33);
    mask.scale.set(0.23, 0.115, 0.105);
    model.group.getObjectByName("head")!.add(mask);
    root.add(model.group);
    model.group.visible = false;
    return {
      id: `raider-${i}`,
      model,
      mask,
      position: new T.Vector3(-13 + i * 13, 1, 29),
      previous: new T.Vector3(),
      radius: 0.85,
      retreat: false,
      attackClock: i * 0.8,
      projectile: undefined as
        { position: T.Vector3; velocity: T.Vector3; age: number } | undefined,
      missile: createStoneModel(),
    };
  });
  raiders.forEach((r) => {
    r.missile.name = "Raider thrown stone";
    r.missile.visible = false;
    root.add(r.missile);
  });
  const sling = createSlingModel();
  root.add(sling.group);
  sling.group.visible = false;
  const stoneModel = createStoneModel();
  root.add(stoneModel);
  stoneModel.visible = false;
  const marker = new T.Mesh(
    new T.ConeGeometry(0.3, 0.7, 7),
    material(0xffd771),
  );
  marker.rotation.z = Math.PI;
  root.add(marker);
  const blockers = solids.map(
    (s) =>
      new T.Box3(
        new T.Vector3(s.x - s.w / 2, s.y, s.z - s.d / 2),
        new T.Vector3(s.x + s.w / 2, s.y + s.h, s.z + s.d / 2),
      ),
  );
  root.traverse((object) => {
    if (
      object instanceof T.Mesh &&
      object !== ground &&
      object !== water &&
      object !== marker
    ) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  let disposed = false;
  return {
    name: "Ammon and the King's Flocks",
    subtitle:
      "Serve and protect • Alma 17:19–39 • Imagined landscape and flock species",
    initialObjective: "Guide the flock to the water’s edge at Sebus",
    spawn: { ...point(0, -31), yaw: 0 },
    solids,
    actorParent: root,
    bounds: { minX: -35, maxX: 35, minZ: -40, maxZ: 43 },
    goal: court,
    landmarks: [
      { name: "King's yard", ...court },
      { name: "Waters of Sebus", ...sebus },
    ],
    adventure(hooks) {
      hooks.setAvatar("ammon");
      let phase = "drive",
        time = 0,
        aiming = false,
        yaw = 0,
        pitch = 0.02,
        recovered = false;
      let scatterTime = 0,
        drinkingTime = 0,
        attackCount = 0;
      const scatterStarts = flock.map((a) => a.position.clone());
      let cinematicCamera:
        { position: T.Vector3; focus: T.Vector3; cut: boolean } | undefined;
      let spin = createSlingSpinState();
      let stone: ReturnType<typeof releaseSlingStone> | undefined;
      let camera: { position: T.Vector3; focus: T.Vector3 } | undefined;
      const target = () =>
        phase === "return" || phase === "done" ? court : sebus;
      const countAt = (at: Point, radius: number) =>
        flock.filter(
          (a) => Math.hypot(a.position.x - at.x, a.position.z - at.z) < radius,
        ).length;
      return {
        movementLocked: () => aiming || phase === "scatter",
        camera: () =>
          phase === "scatter" ? cinematicCamera : aiming ? camera : undefined,
        snapshot: () => ({
          phase,
          aiming,
          yaw,
          pitch,
          charge: slingCharge(spin),
          attackCount,
          drinkingTime,
          flockMarkers: flock.filter((a) => a.indicator.visible).length,
          recovered,
          target: target(),
          flock: flock.map((a) => ({ position: a.position.clone() })),
          raiders: raiders.map((r) => ({
            id: r.id,
            position: r.position.clone(),
            retreat: r.retreat,
          })),
          stone: stone
            ? { position: stone.position.clone(), active: stone.active }
            : undefined,
        }),
        update(dt, player, input) {
          dt = Math.min(dt, 0.05);
          time += dt;
          raiders.forEach((r) => r.previous.copy(r.position));
          const at = target();
          let prompt = "";
          const near = Math.hypot(player.x - at.x, player.z - at.z) < 4;
          if (["drive", "recover", "return"].includes(phase))
            flock.forEach((a, i) => {
              if (a.settled && phase !== "return") return;
              const dx = a.position.x - player.x,
                dz = a.position.z - player.z,
                distance = Math.hypot(dx, dz);
              const destination = phase === "return" ? court : sebus;
              const force =
                distance < 5 && distance > 0.05 ? (5 - distance) * 0.65 : 0;
              let vx = Math.sin(time * 0.6 + i * 2) * 0.16,
                vz = Math.cos(time * 0.5 + i) * 0.16;
              if (force) {
                vx += (dx / distance) * force;
                vz += (dz / distance) * force;
              }
              // Gentle cohesion keeps the flock manageable; progress still requires shepherd pressure.
              if (distance < 8) {
                vx += (destination.x - a.position.x) * 0.035;
                vz += (destination.z - a.position.z) * 0.035;
              }
              a.velocity.set(vx, 0, vz);
              a.position.x = T.MathUtils.clamp(a.position.x + vx * dt, -20, 20);
              a.position.z = T.MathUtils.clamp(a.position.z + vz * dt, -29, 38);
              // Slide animal centers out of solid trunks and walls with body clearance.
              for (const solid of solids) {
                if (solid.y + solid.h < 0.3) continue;
                const minX = solid.x - solid.w / 2 - 0.65,
                  maxX = solid.x + solid.w / 2 + 0.65;
                const minZ = solid.z - solid.d / 2 - 0.8,
                  maxZ = solid.z + solid.d / 2 + 0.8;
                if (
                  a.position.x > minX &&
                  a.position.x < maxX &&
                  a.position.z > minZ &&
                  a.position.z < maxZ
                ) {
                  const edges = [
                    { d: a.position.x - minX, k: "x" as const, v: minX },
                    { d: maxX - a.position.x, k: "x" as const, v: maxX },
                    { d: a.position.z - minZ, k: "z" as const, v: minZ },
                    { d: maxZ - a.position.z, k: "z" as const, v: maxZ },
                  ];
                  edges.sort((a, b) => a.d - b.d);
                  a.position[edges[0].k] = edges[0].v;
                }
              }
              a.group.position.copy(a.position);
              if (Math.hypot(vx, vz) > 0.2)
                a.group.rotation.y = Math.atan2(vx, vz);
              a.group.position.y =
                Math.sin(time * 10 + i) *
                Math.min(0.045, a.velocity.length() * 0.02);
            });
          // Park animals that arrive, so recovering one stray cannot undo five successes.
          if (phase === "drive" || phase === "recover") {
            flock.forEach((a, i) => {
              if (
                !a.settled &&
                Math.hypot(a.position.x - sebus.x, a.position.z - sebus.z) < 2.1
              ) {
                a.settled = true;
                a.position.set(
                  ((i % 3) - 1) * 1.15,
                  0,
                  33.5 + Math.floor(i / 3) * 1.2,
                );
                a.group.position.copy(a.position);
              }
            });
          }
          if (phase === "drive" && flock.every((a) => a.settled)) {
            drinkingTime += dt;
            if (drinkingTime >= 1.5) {
              phase = "scatter";
              scatterTime = 0;
              flock.forEach((a, i) => scatterStarts[i].copy(a.position));
              hooks.toast(
                "At the waters of Sebus, men approach the drinking flock…",
              );
            }
          }
          if (phase === "scatter") {
            scatterTime += dt;
            const rush = T.MathUtils.smoothstep(scatterTime, 1.6, 4.2);
            const flee = T.MathUtils.smoothstep(scatterTime, 3.6, 7.2);
            raiders.forEach((r, i) => {
              r.position.set(
                T.MathUtils.lerp(-15 + i * 15, -5 + i * 5, rush),
                1,
                T.MathUtils.lerp(41, 35, rush),
              );
            });
            flock.forEach((a, i) => {
              const angle = (i * Math.PI) / 3;
              const destination = new T.Vector3(
                Math.sin(angle) * 12,
                0,
                25 + Math.cos(angle) * 6,
              );
              a.position.lerpVectors(scatterStarts[i], destination, flee);
              a.group.position.copy(a.position);
              a.group.position.y =
                Math.sin(scatterTime * 16 + i) *
                0.065 *
                Math.sin(flee * Math.PI);
              a.group.rotation.y = Math.atan2(
                destination.x - scatterStarts[i].x,
                destination.z - scatterStarts[i].z,
              );
            });
            // Fit the entire acted encounter to the narrower screen dimension.
            const subjects = [
              new T.Vector3(player.x, player.y + 1, player.z),
              ...flock.map((a) =>
                a.position.clone().add(new T.Vector3(0, 0.8, 0)),
              ),
              ...raiders.map((r) => r.position.clone()),
            ];
            const focus = new T.Box3()
              .setFromPoints(subjects)
              .getCenter(new T.Vector3());
            const radius = Math.max(
              8,
              ...subjects.map((p) => p.distanceTo(focus) + 1.5),
            );
            const aspect = Math.max(0.2, hooks.viewAspect?.() ?? 16 / 9);
            const halfAngle = Math.atan(
              Math.tan(T.MathUtils.degToRad(29)) * Math.min(1, aspect),
            );
            const distance = (radius / Math.sin(halfAngle)) * 1.08;
            cinematicCamera = {
              position: focus
                .clone()
                .addScaledVector(
                  new T.Vector3(
                    scatterTime < 3.6 ? 1 : -1,
                    0.9,
                    -1.3,
                  ).normalize(),
                  distance,
                ),
              focus,
              cut: true,
            };
            // Cut endpoints and sightline must clear trunks, rocks and opaque canopies.
            const opaque = [
              ...solids,
              ...[-18, 19].map((x) => ({
                x,
                y: 3.4,
                z: 9,
                w: 6.2,
                h: 2.6,
                d: 6.2,
              })),
            ];
            for (
              let attempt = 0;
              attempt < 60 &&
              !cameraSegmentClear(
                cinematicCamera.position,
                focus,
                opaque,
                0.25,
              );
              attempt++
            )
              cinematicCamera.position.y += 1;
            if (scatterTime >= 8.5) {
              phase = "recover";
              flock.forEach((a) => (a.settled = false));
              hooks.toast(
                "Circle behind the gold-marked strays. Each animal stays gathered once it reaches the water.",
              );
            }
          }
          if (phase === "recover" && flock.every((a) => a.settled)) {
            phase = "protect";
            recovered = true;
            servant.group.position.set(-3, 0, 33);
            hooks.toast(
              "The servants hold the flock safely. Face the masked raiders; hold {action} to spin, aim with {move}, release to cast.",
            );
          }
          flock.forEach((a) => {
            a.indicator.visible = phase === "recover" && !a.settled;
            const head = a.group.getObjectByName("Flock drinking head")!;
            const drinking =
              a.settled && phase !== "scatter" && phase !== "return";
            head.position.y = drinking
              ? 0.43 + Math.sin(time * 3) * 0.025
              : 0.95;
            head.rotation.x = drinking ? 0.6 : 0;
            if (drinking)
              a.group.rotation.y = Math.atan2(-a.position.x, 37 - a.position.z);
          });
          raiders.forEach((r, i) => {
            r.model.group.visible =
              phase === "scatter" ||
              phase === "recover" ||
              phase === "protect" ||
              (phase === "return" && r.position.z < 43);
            if (r.retreat) r.position.z += dt * 5;
            else if (phase === "protect") {
              r.position.x = -7 + i * 7 + Math.sin(time * 0.4 + i * 2) * 0.5;
              r.position.z = 39;
              r.attackClock += dt;
              if (r.attackClock >= 4.5) {
                r.attackClock = 0;
                attackCount++;
                const start = r.position.clone().add(new T.Vector3(0, 0.25, 0));
                // Alma 17:36: their stones fail to hit Ammon. Aim beside his current feet.
                const flight = 1.1;
                const destination = new T.Vector3(
                  player.x + (i % 2 ? -1.4 : 1.4),
                  player.y,
                  player.z,
                );
                r.projectile = {
                  position: start,
                  velocity: destination
                    .sub(start)
                    .divideScalar(flight)
                    .add(new T.Vector3(0, (9.8 * flight) / 2, 0)),
                  age: 0,
                };
              }
            }
            r.model.group.position.set(r.position.x, 0, r.position.z);
            r.model.group.rotation.y = r.retreat
              ? 0
              : phase === "scatter"
                ? Math.atan2(-r.position.x, 34 - r.position.z)
                : Math.atan2(player.x - r.position.x, player.z - r.position.z);
            if (r.projectile) {
              r.projectile.age += dt;
              r.projectile.position.addScaledVector(r.projectile.velocity, dt);
              r.projectile.velocity.y -= 9.8 * dt;
              r.missile.position.copy(r.projectile.position);
              if (r.projectile.position.y <= 0 || r.projectile.age > 2)
                r.projectile = undefined;
            }
            r.missile.visible = !!r.projectile && phase === "protect";
            if (
              r.model.group.visible &&
              Math.floor(time * 10) !== Math.floor((time - dt) * 10)
            )
              r.model.update(0.1, {
                x: r.position.x,
                y: 0,
                z: r.position.z,
                vx: (r.position.x - r.previous.x) / dt,
                vy: 0,
                vz: (r.position.z - r.previous.z) / dt,
                yaw: r.model.group.rotation.y,
                grounded: true,
                runSpeed:
                  r.position.distanceTo(r.previous) / Math.max(dt, 0.001),
                move:
                  r.position.distanceTo(r.previous) > 0.001 ? "run" : "idle",
                pointing:
                  phase === "protect" && !r.retreat && r.attackClock > 3.7,
              });
          });
          const origin = () =>
            new T.Vector3(
              player.x + Math.cos(yaw) * 0.38,
              player.y + 1.3,
              player.z - Math.sin(yaw) * 0.38,
            ).addScaledVector(aimDirection(yaw, pitch), 0.55);
          if (phase === "protect") {
            prompt = aiming
              ? `Release {action} to cast • {move} aims • ${Math.round(slingCharge(spin) * 100)}% • {jump} / {crouch} cancel`
              : "Hold {action} to spin and aim the sling";
            if (input.jump || input.crouch) {
              aiming = false;
              spin = createSlingSpinState();
            } else if (input.interactHeld) {
              if (!aiming) {
                aiming = true;
                yaw = player.yaw;
                spin = createSlingSpinState();
              }
              yaw -= input.x * dt * 1.2;
              pitch = T.MathUtils.clamp(pitch + input.y * dt * 0.7, -0.25, 0.6);
              player.yaw = yaw;
              stepSlingSpin(spin, dt, true);
            } else if (aiming) {
              if (slingCharge(spin) > 0.12 && !spin.pendingRelease)
                requestSlingRelease(spin);
              if (spin.pendingRelease && stepSlingSpin(spin, dt, false)) {
                stone = releaseSlingStone(origin(), yaw, pitch, spin);
                aiming = false;
                spin = createSlingSpinState();
              } else if (!spin.pendingRelease) {
                aiming = false;
                spin = createSlingSpinState();
              }
            }
          }
          if (stone?.active) {
            const hit = stepStone(
              stone,
              dt,
              blockers,
              raiders.filter((r) => !r.retreat && phase === "protect"),
            );
            if (hit?.kind === "target") {
              const r = raiders.find((r) => r.id === hit.targetId);
              if (r) {
                r.retreat = true;
                hooks.toast(
                  "A masked raider withdraws. The servants are keeping the flock safe.",
                );
              }
            }
          }
          stoneModel.visible = !!stone?.active;
          if (stone) stoneModel.position.copy(stone.position);
          if (phase === "protect" && raiders.every((r) => r.retreat)) {
            phase = "return";
            flock.forEach((a) => (a.settled = false));
            aiming = false;
            hooks.toast(
              "The flock is safe. Guide all six back to the king’s yard.",
            );
          }
          sling.group.visible = phase === "protect";
          sling.group.position.copy(origin());
          sling.group.rotation.set(-pitch, yaw, 0, "YXZ");
          sling.setSpin(spin.phase, aiming);
          const eye = new T.Vector3(player.x, player.y + 1.6, player.z),
            direction = aimDirection(yaw, pitch);
          // Align the reticle with the pouch at its forward release tangent.
          const releasePoint = origin().add(
            new T.Vector3(-Math.cos(yaw) * 0.8, 0, Math.sin(yaw) * 0.8),
          );
          const cameraPosition = releasePoint
            .clone()
            .addScaledVector(direction, -2);
          const cameraSolids = [
            ...solids,
            ...[-18, 19].map((x) => ({
              x,
              y: 3.4,
              z: 9,
              w: 6.2,
              h: 2.6,
              d: 6.2,
            })),
          ];
          // Recover a blocked shoulder view toward the player before raising it.
          for (
            let i = 0;
            i < 20 &&
            !cameraSegmentClear(eye, cameraPosition, cameraSolids, 0.2);
            i++
          )
            cameraPosition.lerp(eye, 0.18);
          for (
            let i = 0;
            i < 28 &&
            !cameraSegmentClear(
              cameraPosition,
              cameraPosition,
              cameraSolids,
              0.2,
            );
            i++
          )
            cameraPosition.y += 0.3;
          camera = {
            position: cameraPosition,
            focus: releasePoint.clone().addScaledVector(direction, 24),
          };
          marker.visible = !aiming && phase !== "done";
          marker.position.set(at.x, 2.8 + Math.sin(time * 2) * 0.15, at.z);
          if (phase === "return" && near && countAt(court, 9) === 6) {
            phase = "done";
            hooks.toast(
              "The flock is home. The servants report Ammon’s faithful service to Lamoni. Adapted from Alma 17:19–39.",
            );
          }
          if (phase === "done" && recovered) {
            recovered = false;
            hooks.complete();
          }
          const objective =
            phase === "drive"
              ? `Guide the flock to the water’s edge • ${flock.filter((a) => a.settled).length}/6 drinking`
              : phase === "scatter"
                ? "At Sebus • the flock is scattered"
                : phase === "recover"
                  ? `Gather the gold-marked strays at the water • ${flock.filter((a) => a.settled).length}/6`
                  : phase === "protect"
                    ? `Protect the gathered flock • ${raiders.filter((r) => r.retreat).length}/3 raiders withdrawn`
                    : phase === "return"
                      ? `Return the flock to the king’s yard • ${countAt(court, 9)}/6`
                      : "Ammon served faithfully";
          if (!prompt)
            prompt =
              phase === "drive" || phase === "recover" || phase === "return"
                ? "Walk behind animals to guide them; circle around strays"
                : "";
          return { objective, prompt, aiming, draw: slingCharge(spin) };
        },
        dispose() {
          aiming = false;
          stone = undefined;
        },
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      scene.remove(root);
      sun.shadow.map?.dispose();
      sun.shadow.mapPass?.dispose();
      shrubs.dispose();
      king.dispose();
      servant.dispose();
      raiders.forEach((r) => {
        // Added after the cached character clone, so the actor cache does not own these.
        r.mask.geometry.dispose();
        (r.mask.material as T.Material).dispose();
        r.model.dispose();
      });
      const geometries = new Set<T.BufferGeometry>(),
        materials = new Set<T.Material>();
      root.traverse((o) => {
        if (o instanceof T.Mesh) {
          geometries.add(o.geometry);
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
            materials.add(m),
          );
        }
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
