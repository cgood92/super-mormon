import * as T from "three";
import { createClothNormalUpdater } from "./cloth-normals";
import type { CharacterState, CharacterRole } from "./character-types";
import { createMotionDriver } from "./character-motion";
import { acquireCharacterModel } from "./character-model-cache";

export function createSculptedCharacterRig(
  role: CharacterRole,
  options: { quality?: "hero" | "npc" | "crowd" } = {},
): {
  group: T.Group;
  sockets: { leftHand: T.Group; rightHand: T.Group; back: T.Group };
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
    const parent = mesh.parent ?? model.group;
    parent.remove(mesh);
    parent.add(skinned);
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
    "moroni-helmet-rim",
    "character-ear-left",
    "character-ear-right",
    "character-mouth",
  ])
    attach(name, head);
  attach("left-hand", armPivots[0]);
  attach("right-hand", armPivots[1]);
  for (let side = 0; side < 2; side++) {
    const label = side === 0 ? "left" : "right";
    attach(`moroni-${label}-pauldron`, armPivots[side]);
    attach(`moroni-${label}-bracer`, armPivots[side]);
    attach(`moroni-${label}-greave`, kneePivots[side]);
    attach(`moroni-${label}-greave-trim`, kneePivots[side]);
    attach(`moroni-${label}-hip-lame`, legPivots[side]);
  }
  const handSocket = (side: "left" | "right") => {
    const hand = model.group.getObjectByName(`${side}-hand`) as T.Mesh;
    hand.geometry.computeBoundingBox();
    const socket = new T.Group();
    socket.name = `${side}-hand-socket`;
    socket.position.copy(hand.geometry.boundingBox!.getCenter(new T.Vector3()));
    hand.add(socket);
    return socket;
  };
  const sockets = {
    leftHand: handSocket("left"),
    rightHand: handSocket("right"),
    back: new T.Group(),
  };
  sockets.back.name = "back-socket";
  sockets.back.position.set(0, 1.16, -0.29);
  model.group.add(sockets.back);
  attach("left-trouser", legPivots[0]);
  attach("right-trouser", legPivots[1]);
  attach("left-sandal", footPivots[0]);
  attach("right-sandal", footPivots[1]);

  // Split the sculpted trouser at its knee using the same transform hierarchy
  // as the sandals. A rigid full-length trouser cannot bend into a crawl.
  for (let side = 0; side < 2; side++) {
    const mesh = model.group.getObjectByName(
      side ? "right-trouser" : "left-trouser",
    ) as T.Mesh | undefined;
    if (!mesh) continue;
    const attribute = mesh.geometry.getAttribute(
      "position",
    ) as T.BufferAttribute;
    const rest = Float32Array.from(attribute.array);
    mesh.userData.crawlRest = rest;
  }
  const trousers = ["left-trouser", "right-trouser"].map(
    (name) => model.group.getObjectByName(name) as T.Mesh | undefined,
  );
  const trouserNormals = trousers.map((mesh) =>
    mesh ? createClothNormalUpdater(mesh.geometry) : undefined,
  );
  const trouserPoint = new T.Vector3();

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
  const tunic = ["continuous-robe-and-sleeves", "visible-front-tunic"]
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
  let wasCrawling = false;
  const drape = (point: T.Vector3, crawling: boolean) => {
    if (!crawling) return;
    // With the spine horizontal, gravity is local +Z. Gather the skirt around
    // the hips and let its hem hang below the back, clear of the trailing feet.
    const weight = 1 - T.MathUtils.smoothstep(point.y, 0.45, 1.16);
    const backDrape = T.MathUtils.lerp(
      0.05,
      -0.2,
      T.MathUtils.smoothstep(point.y, 0.18, 0.65),
    );
    // The trailing shoes reach local Y ~= 0.61 in a crawl. Lift the low hem
    // past them, while mapping its authored height into a curved sweep.
    const hem = 1 - T.MathUtils.smoothstep(point.y, 0.18, 0.48);
    const gatheredY = 0.67 + (point.y - 0.122) * 0.55;
    point.y += (gatheredY - point.y) * weight;
    point.z *= 1 - 0.32 * weight;
    // Preserve the authored front-to-back arc at the hem. Interpolating the
    // entire low ring to one Z coordinate makes a flat cut face in rear views.
    const rear = 1 - T.MathUtils.smoothstep(point.z, -0.03, 0.06);
    const center = 1 - T.MathUtils.smoothstep(Math.abs(point.x), 0.04, 0.34);
    const hemDepth = backDrape + point.z * 0.5 - 0.13 * rear * center * hem;
    point.z += (hemDepth - point.z) * weight;
  };
  const worldGaze = new T.Vector3();
  const gazeParentInverse = new T.Matrix4();
  const headForward = new T.Vector3(0, 0, 1);

  const footMeshes = ["left-sandal", "right-sandal"].map(
    (name) => model.group.getObjectByName(name) as T.Mesh,
  );
  footMeshes.forEach((mesh) => mesh.geometry.computeBoundingBox());
  const worldFootBox = new T.Box3();
  let clothWasMoving = true;
  body.scale.setScalar(actorScale);
  return {
    group,
    sockets,
    update(dt, state) {
      dt = Math.min(0.1, Math.max(0, dt));
      driver.update(dt, state);
      group.position.set(state.x, state.y, state.z);
      group.rotation.y = driver.group.rotation.y;
      body.rotation.copy(driverBody.rotation);
      body.position.y = driverBody.position.y;
      const crawling =
        state.grounded &&
        (state.move === "crawl" ||
          (!state.move && !!state.crouching && state.runSpeed > 0.25));
      const crouchScale =
        state.crouching && !crawling
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
      head.position.z = crawling ? 0.13 : 0;
      body.position.z = crawling ? (-0.77 * actorScale) / 0.825 : 0;
      if (crawling) body.position.y *= actorScale / 0.825;
      if (crawling) body.scale.setScalar(actorScale);
      for (let i = 0; i < 2; i++) {
        legPivots[i].scale.y = crawling ? 1.4 : 1;
        legPivots[i].position.z = crawling ? -0.02 : 0;
        armPivots[i].scale.y = 1;
      }
      for (let i = 0; i < 2; i++) {
        armPivots[i].rotation.copy(driverArms[i].rotation);
        legPivots[i].rotation.copy(driverLegs[i].rotation);
        kneePivots[i].rotation.copy(driverKnees[i].rotation);
        footPivots[i].rotation.copy(driverFeet[i].rotation);
        footPivots[i].scale.setScalar(crawling ? 0.65 : 1);
        footPivots[i].position.z = crawling ? -0.14 : 0;
        footPivots[i].position.y = -0.27 + (driverFeet[i].position.y + 0.28);
      }
      if (crawling || wasCrawling) {
        for (let side = 0; side < 2; side++) {
          const mesh = trousers[side];
          if (!mesh) continue;
          const attribute = mesh.geometry.getAttribute(
            "position",
          ) as T.BufferAttribute;
          const rest = mesh.userData.crawlRest as Float32Array;
          for (let i = 0; i < attribute.count; i++) {
            const j = i * 3;
            trouserPoint.set(rest[j], rest[j + 1], rest[j + 2]);
            if (crawling) {
              trouserPoint.y = Math.min(trouserPoint.y, 0.6);
              const weight =
                1 - T.MathUtils.smoothstep(trouserPoint.y - 0.72, -0.4, -0.29);
              const y = trouserPoint.y - 0.72 + 0.35;
              const z = trouserPoint.z;
              const angle = kneePivots[side].rotation.x * weight;
              trouserPoint.y =
                0.72 - 0.35 + y * Math.cos(angle) - z * Math.sin(angle);
              trouserPoint.z = y * Math.sin(angle) + z * Math.cos(angle);
            }
            attribute.setXYZ(i, trouserPoint.x, trouserPoint.y, trouserPoint.z);
          }
          attribute.needsUpdate = true;
          trouserNormals[side]?.();
          mesh.geometry.computeBoundingBox();
          mesh.geometry.computeBoundingSphere();
        }
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
      // Only the outer coat gathers for a crawl. Ordinary walking keeps its
      // authored geometry; no independently lagging inner/outer cloth fields.
      const clothMoving = crawling;
      if (clothMoving || clothWasMoving || crawling || wasCrawling) {
        for (const { mesh, attribute, rest, updateNormals } of cloth) {
          for (let i = 0; i < attribute.count; i++) {
            const j = i * 3;
            clothPoint.set(rest[j], rest[j + 1], rest[j + 2]);
            drape(clothPoint, crawling);
            attribute.setXYZ(i, clothPoint.x, clothPoint.y, clothPoint.z);
          }
          attribute.needsUpdate = true;
          updateNormals();
          mesh.geometry.computeBoundingSphere();
        }
        for (const { geometry, attribute, rest, updateNormals } of tunic) {
          for (let i = 0; i < attribute.count; i++) {
            const j = i * 3;
            clothPoint.set(rest[j], rest[j + 1], rest[j + 2]);
            drape(clothPoint, crawling);
            attribute.setXYZ(i, clothPoint.x, clothPoint.y, clothPoint.z);
          }
          attribute.needsUpdate = true;
          updateNormals();
          geometry.computeBoundingSphere();
        }
      }
      clothWasMoving = clothMoving;
      wasCrawling = crawling;
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
