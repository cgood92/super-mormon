import * as T from "three";
import { createClothNormalUpdater } from "./cloth-normals";
import type { CharacterState, CharacterRole } from "./character-types";
import { createMotionDriver } from "./character-motion";
import { acquireCharacterModel } from "./character-model-cache";

const damp = (rate: number, dt: number) =>
  1 - Math.exp(-rate * Math.min(0.1, Math.max(0, dt)));
const angleDiff = (a: number, b: number) =>
  Math.atan2(Math.sin(a - b), Math.cos(a - b));

export function createSculptedCharacterRig(
  role: CharacterRole,
  options: { quality?: "hero" | "npc" | "crowd" } = {},
): {
  group: T.Group;
  update(dt: number, state: CharacterState): void;
  dispose(): void;
} {
  const driver = createMotionDriver(role);
  const model = acquireCharacterModel(role, options.quality ?? "npc");
  const group = new T.Group();
  group.name = `${role}-character`;
  group.userData = { ...model.group.userData };
  const actorScale = role === "child" ? 1.15 / 2 : 0.825;
  const body = new T.Group();
  body.name = "body";
  group.add(body);
  body.add(model.group);

  const driverBody = driver.group.getObjectByName("body")!;
  const driverHead = driver.group.getObjectByName("head")!;
  const driverArms = [
    driver.group.getObjectByName("left-arm")!,
    driver.group.getObjectByName("right-arm")!,
  ];
  const driverLegs = [
    driver.group.getObjectByName("left-leg")!,
    driver.group.getObjectByName("right-leg")!,
  ];
  const driverKnees = [
    driver.group.getObjectByName("left-knee")!,
    driver.group.getObjectByName("right-knee")!,
  ];
  const driverFeet = [
    driver.group.getObjectByName("left-foot")!,
    driver.group.getObjectByName("right-foot")!,
  ];

  // The broad sculpted shirt is skinned at the sleeve roots. The fused
  // shoulder/torso mesh remains continuous as the arms swing or reach.
  const shirt = model.group.getObjectByName(
    "continuous-robe-and-sleeves",
  ) as T.Mesh;
  const rootBone = new T.Bone();
  rootBone.name = "torso-bone";
  const armBones = [-1, 1].map((side) => {
    const bone = new T.Bone();
    bone.name = side < 0 ? "left-arm" : "right-arm";
    bone.position.set(side * 0.385, 1.3, 0);
    rootBone.add(bone);
    return bone;
  });
  model.group.add(rootBone);
  const skeleton = new T.Skeleton([rootBone, ...armBones]);
  const skinnedGarments: T.SkinnedMesh[] = [];
  const bindGarment = (mesh: T.Mesh) => {
    const positions = mesh.geometry.getAttribute(
      "position",
    ) as T.BufferAttribute;
    const indices = new Uint16Array(positions.count * 4);
    const weights = new Float32Array(positions.count * 4);
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i),
        y = positions.getY(i);
      const armWeight =
        T.MathUtils.smoothstep(Math.abs(x), 0.22, 0.58) *
        (1 - T.MathUtils.smoothstep(y, 1.45, 1.61)) *
        T.MathUtils.smoothstep(y, 0.88, 1.12);
      indices[i * 4] = 0;
      weights[i * 4] = 1 - armWeight;
      indices[i * 4 + 1] = x < 0 ? 1 : 2;
      weights[i * 4 + 1] = armWeight;
    }
    mesh.geometry.setAttribute(
      "skinIndex",
      new T.Uint16BufferAttribute(indices, 4),
    );
    mesh.geometry.setAttribute(
      "skinWeight",
      new T.Float32BufferAttribute(weights, 4),
    );
    const skinned = new T.SkinnedMesh(mesh.geometry, mesh.material);
    skinned.name = mesh.name;
    skinned.castShadow = skinned.receiveShadow = true;
    model.group.remove(mesh);
    model.group.add(skinned);
    model.group.updateMatrixWorld(true);
    skinned.bind(skeleton);
    skinned.boundingSphere = new T.Sphere(new T.Vector3(0, 1, 0), 2.3);
    skinnedGarments.push(skinned);
    return skinned;
  };
  bindGarment(shirt);
  const mantle = model.group.getObjectByName("flowing-mantle") as
    T.Mesh | undefined;
  if (mantle) bindGarment(mantle);
  for (const name of ["left-regal-embroidery", "right-regal-embroidery"]) {
    const trim = model.group.getObjectByName(name) as T.Mesh | undefined;
    if (trim) bindGarment(trim);
  }

  const head = new T.Group();
  head.name = "head";
  head.position.set(0, 1.49, 0);
  model.group.add(head);
  const armPivots = armBones;
  const legPivots = [-1, 1].map((side) => {
    const leg = new T.Group();
    leg.name = side < 0 ? "left-leg" : "right-leg";
    leg.position.set(side * 0.205, 0.72, 0);
    model.group.add(leg);
    return leg;
  });
  const kneePivots = legPivots.map((leg, i) => {
    const knee = new T.Group();
    knee.name = i === 0 ? "left-knee" : "right-knee";
    knee.position.y = -0.35;
    leg.add(knee);
    return knee;
  });
  const footPivots = kneePivots.map((knee, i) => {
    const foot = new T.Group();
    foot.name = i === 0 ? "left-foot" : "right-foot";
    foot.position.y = -0.27;
    knee.add(foot);
    return foot;
  });

  const attach = (name: string, parent: T.Object3D) => {
    const mesh = model.group.getObjectByName(name);
    if (mesh) parent.attach(mesh);
  };
  for (const name of [
    "sculpted-face-neck-nose",
    "single-sculpted-hair-cap",
    "one-piece-sculpted-beard",
    "left-eye",
    "right-eye",
    "left-iris",
    "right-iris",
    "left-brow",
    "right-brow",
    "lehi-headband",
    "character-headwear",
    "character-ear-left",
    "character-ear-right",
    "character-mouth",
  ])
    attach(name, head);
  attach("left-hand", armPivots[0]);
  attach("right-hand", armPivots[1]);
  attach("left-trouser", legPivots[0]);
  attach("right-trouser", legPivots[1]);
  attach("left-sandal", footPivots[0]);
  attach("right-sandal", footPivots[1]);

  const cloth = [
    "flowing-mantle",
    "mantle-edge",
    "left-regal-embroidery",
    "right-regal-embroidery",
  ]
    .map((name) => model.group.getObjectByName(name) as T.Mesh | undefined)
    .filter((mesh): mesh is T.Mesh => !!mesh)
    .map((mesh) => ({
      mesh,
      updateNormals: createClothNormalUpdater(mesh.geometry),
      attribute: mesh.geometry.getAttribute("position") as T.BufferAttribute,
      rest: Float32Array.from(
        (mesh.geometry.getAttribute("position") as T.BufferAttribute).array,
      ),
    }));
  const tunic = ["continuous-robe-and-sleeves"]
    .map((name) => model.group.getObjectByName(name) as T.Mesh | undefined)
    .filter((mesh): mesh is T.Mesh => !!mesh)
    .map((mesh) => ({
      geometry: mesh.geometry,
      updateNormals: createClothNormalUpdater(mesh.geometry),
      attribute: mesh.geometry.getAttribute("position") as T.BufferAttribute,
      rest: Float32Array.from(
        (mesh.geometry.getAttribute("position") as T.BufferAttribute).array,
      ),
    }));
  const clothPoint = new T.Vector3();
  const worldGaze = new T.Vector3();
  const gazeParentInverse = new T.Matrix4();
  const headForward = new T.Vector3(0, 0, 1);

  const footBounds = [new T.Box3(), new T.Box3()];
  const footMeshes = ["left-sandal", "right-sandal"].map(
    (name) => model.group.getObjectByName(name) as T.Mesh,
  );
  footMeshes.forEach((mesh) => mesh.geometry.computeBoundingBox());
  const intoModel = new T.Matrix4();
  const footMatrix = new T.Matrix4();
  const clearFeet = (x: number, y: number, z: number) => {
    if (!walkingCloth) return z;
    // Both sandals can influence the same hem vertex. Use their union rather
    // than adding two bulges, which inflated the robe during side views.
    let clearance = 0;
    for (const box of footBounds) {
      const centerX = (box.min.x + box.max.x) / 2;
      const influence =
        Math.exp(-Math.pow((x - centerX) / 0.24, 2)) *
        (1 - T.MathUtils.smoothstep(y, box.min.y + 0.1, box.max.y + 0.04));
      const reach =
        z > 0
          ? Math.max(0, box.max.z + 0.035 - 0.3)
          : Math.max(0, -0.3 - box.min.z + 0.035);
      clearance = Math.max(clearance, reach * influence);
    }
    z +=
      Math.sign(z) * clearance * T.MathUtils.smoothstep(Math.abs(z), 0, 0.22);
    return z;
  };
  let walkingCloth = false;
  const worldFootBox = new T.Box3();
  let clothX = 0;
  let clothZ = 0;
  let lastYaw = 0;
  let lastX = 0;
  let lastZ = 0;
  let gaitPhase = 0;
  let clothWasMoving = true;
  let first = true;
  body.scale.setScalar(actorScale);
  return {
    group,
    update(dt, state) {
      dt = Math.min(0.1, Math.max(0, dt));
      driver.update(dt, state);
      group.position.set(state.x, state.y, state.z);
      body.rotation.copy(driverBody.rotation);
      body.position.y = driverBody.position.y;
      const crouchScale = state.crouching
        ? Math.min(
            state.move === "crawl" ? 0.49 : 0.525,
            driverBody.scale.y / 0.84,
          )
        : driverBody.scale.y / 0.84;
      body.scale.set(
        actorScale * driverBody.scale.x,
        actorScale * crouchScale,
        actorScale * driverBody.scale.z,
      );
      head.rotation.copy(driverHead.rotation);
      for (let i = 0; i < 2; i++) {
        armPivots[i].rotation.copy(driverArms[i].rotation);
        legPivots[i].rotation.copy(driverLegs[i].rotation);
        kneePivots[i].rotation.copy(driverKnees[i].rotation);
        footPivots[i].rotation.copy(driverFeet[i].rotation);
        footPivots[i].position.y = -0.27 + (driverFeet[i].position.y + 0.28);
      }
      // Plant the actual sculpted sole, rather than assuming the old primitive
      // sandal's thickness. This preserves the motion driver's horizontal anchor.
      const groundedWalk =
        state.grounded &&
        !state.crouching &&
        (!state.move || state.move === "run" || state.move === "idle");
      if (groundedWalk) {
        model.group.updateWorldMatrix(true, true);
        for (let i = 0; i < 2; i++)
          if (driverKnees[i].rotation.x < 0.08) {
            worldFootBox
              .copy(footMeshes[i].geometry.boundingBox!)
              .applyMatrix4(footMeshes[i].matrixWorld);
            const worldYPerLocalY =
              footPivots[i].parent!.matrixWorld.elements[5];
            if (Math.abs(worldYPerLocalY) > 0.1)
              footPivots[i].position.y +=
                (state.y - worldFootBox.min.y) / worldYPerLocalY;
          }
      }
      walkingCloth =
        state.grounded && !state.crouching && state.runSpeed > 0.25;
      if (walkingCloth) {
        model.group.updateWorldMatrix(true, true);
        intoModel.copy(model.group.matrixWorld).invert();
        footMeshes.forEach((mesh, i) => {
          footMatrix.multiplyMatrices(intoModel, mesh.matrixWorld);
          footBounds[i]
            .copy(mesh.geometry.boundingBox!)
            .applyMatrix4(footMatrix);
        });
      }
      const yaw = driverBody.rotation.y;
      if (first) {
        lastYaw = yaw;
        lastX = state.x;
        lastZ = state.z;
        first = false;
      }
      const travel = Math.min(
        Math.hypot(state.x - lastX, state.z - lastZ),
        state.runSpeed * dt * 1.5,
      );
      lastX = state.x;
      lastZ = state.z;
      if (state.grounded) gaitPhase += travel * 5;
      const yawRate = dt > 0 ? angleDiff(yaw, lastYaw) / dt : 0;
      lastYaw = yaw;
      const localLateral = Math.cos(yaw) * state.vx - Math.sin(yaw) * state.vz;
      clothX +=
        (T.MathUtils.clamp(
          -localLateral * 0.012 - yawRate * 0.018,
          -0.11,
          0.11,
        ) -
          clothX) *
        damp(5, dt);
      clothZ += (Math.min(0.07, state.runSpeed * 0.009) - clothZ) * damp(4, dt);
      const clothMoving =
        state.runSpeed > 0.05 ||
        Math.abs(clothX) > 0.0001 ||
        Math.abs(clothZ) > 0.0001;
      if (!clothMoving) {
        clothX = 0;
        clothZ = 0;
      }
      if (clothMoving || clothWasMoving) {
        for (const { attribute, rest, updateNormals } of cloth) {
          for (let i = 0; i < attribute.count; i++) {
            const j = i * 3;
            const w = Math.pow(
              T.MathUtils.clamp((1.1 - rest[j + 1]) / 0.9, 0, 1),
              1.5,
            );
            clothPoint.set(rest[j], rest[j + 1], rest[j + 2]);
            const panelSway =
              Math.sin(gaitPhase - rest[j] * 2) *
              Math.min(1, state.runSpeed / 5);
            clothPoint.x += clothX * w + panelSway * 0.025 * w;
            clothPoint.z -= clothZ * w;
            attribute.setXYZ(
              i,
              clothPoint.x,
              clothPoint.y,
              clearFeet(clothPoint.x, clothPoint.y, clothPoint.z),
            );
          }
          attribute.needsUpdate = true;
          updateNormals();
        }
        const stepWeight = Math.min(1, state.runSpeed / 5);
        for (const { attribute, rest, updateNormals } of tunic) {
          for (let i = 0; i < attribute.count; i++) {
            const j = i * 3;
            const w = Math.pow(
              T.MathUtils.clamp((1.1 - rest[j + 1]) / 0.9, 0, 1),
              1.5,
            );
            const panelSway = Math.sin(gaitPhase - rest[j] * 2) * stepWeight;
            attribute.setXYZ(
              i,
              rest[j] + clothX * w + panelSway * 0.025 * w,
              rest[j + 1],
              clearFeet(
                rest[j] + clothX * w + panelSway * 0.025 * w,
                rest[j + 1],
                rest[j + 2] - clothZ * w,
              ),
            );
          }
          attribute.needsUpdate = true;
          updateNormals();
        }
      }
      clothWasMoving = clothMoving;
      if (state.lookYaw !== undefined) {
        // Compensate the complete parent transform, including turn lean and
        // nonuniform scale, so the rendered face matches world-space sight tests.
        const pitch = state.lookPitch ?? 0;
        worldGaze.set(
          Math.sin(state.lookYaw) * Math.cos(pitch),
          Math.sin(pitch),
          Math.cos(state.lookYaw) * Math.cos(pitch),
        );
        head.parent!.updateWorldMatrix(true, false);
        gazeParentInverse.copy(head.parent!.matrixWorld).invert();
        worldGaze.transformDirection(gazeParentInverse);
        head.quaternion.setFromUnitVectors(headForward, worldGaze);
      }
      // Keep inverse bind transforms in step with actors placed above ground or
      // translated during play; callers can inspect posed bounds before render.
      group.updateMatrixWorld(true);
      skinnedGarments.forEach((mesh) => Reflect.set(mesh, "boundingBox", null));
    },
    dispose() {
      group.parent?.remove(group);
      skeleton.dispose();
      model.dispose();
      driver.dispose();
      group.clear();
    },
  };
}

/** The style playground uses exactly the same Lehi as the full game. */
export function createPlayableLehi() {
  return createSculptedCharacterRig("lehi", { quality: "hero" });
}
