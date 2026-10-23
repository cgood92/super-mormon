import * as T from "three";
import { createCharacter, type CharacterState } from "./character";
import { buildSculptedLehi } from "./lehi-sculpted-models";

const damp = (rate: number, dt: number) =>
  1 - Math.exp(-rate * Math.min(0.1, Math.max(0, dt)));
const angleDiff = (a: number, b: number) =>
  Math.atan2(Math.sin(a - b), Math.cos(a - b));

export function createPlayableLehi(): {
  group: T.Group;
  update(dt: number, state: CharacterState): void;
  dispose(): void;
} {
  const driver = createCharacter("lehi");
  const model = buildSculptedLehi(2);
  const group = new T.Group();
  group.name = "playable-sculpted-lehi";
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
  const skinGeometry = shirt.geometry;
  const positions = skinGeometry.getAttribute("position") as T.BufferAttribute;
  const indices = new Uint16Array(positions.count * 4);
  const weights = new Float32Array(positions.count * 4);
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const shoulder = T.MathUtils.smoothstep(Math.abs(x), 0.22, 0.58);
    const sleeve = 1 - T.MathUtils.smoothstep(y, 1.45, 1.61);
    const armWeight = shoulder * sleeve;
    indices[i * 4] = 0;
    weights[i * 4] = 1 - armWeight;
    indices[i * 4 + 1] = x < 0 ? 1 : 2;
    weights[i * 4 + 1] = armWeight;
  }
  skinGeometry.setAttribute(
    "skinIndex",
    new T.Uint16BufferAttribute(indices, 4),
  );
  skinGeometry.setAttribute(
    "skinWeight",
    new T.Float32BufferAttribute(weights, 4),
  );
  const rootBone = new T.Bone();
  rootBone.name = "torso-bone";
  const armBones = [-1, 1].map((side) => {
    const bone = new T.Bone();
    bone.name = side < 0 ? "left-arm-bone" : "right-arm-bone";
    bone.position.set(side * 0.385, 1.3, 0);
    rootBone.add(bone);
    return bone;
  });
  model.group.add(rootBone);
  const skeleton = new T.Skeleton([rootBone, ...armBones]);
  const skinnedShirt = new T.SkinnedMesh(skinGeometry, shirt.material);
  skinnedShirt.name = "continuous-robe-and-sleeves";
  skinnedShirt.castShadow = skinnedShirt.receiveShadow = true;
  model.group.remove(shirt);
  model.group.add(skinnedShirt);
  model.group.updateMatrixWorld(true);
  skinnedShirt.bind(skeleton);

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
  ])
    attach(name, head);
  attach("left-hand", armPivots[0]);
  attach("right-hand", armPivots[1]);
  attach("left-trouser", legPivots[0]);
  attach("right-trouser", legPivots[1]);
  attach("left-sandal", footPivots[0]);
  attach("right-sandal", footPivots[1]);

  const cloth = ["flowing-mantle", "mantle-edge"]
    .map((name) => model.group.getObjectByName(name) as T.Mesh | undefined)
    .filter((mesh): mesh is T.Mesh => !!mesh)
    .map((mesh) => ({
      mesh,
      attribute: mesh.geometry.getAttribute("position") as T.BufferAttribute,
      rest: Float32Array.from(
        (mesh.geometry.getAttribute("position") as T.BufferAttribute).array,
      ),
    }));
  const tunic = ["continuous-folded-robe", "robe-hem-thickness"]
    .map((name) => model.group.getObjectByName(name) as T.Mesh | undefined)
    .filter((mesh): mesh is T.Mesh => !!mesh)
    .map((mesh) => ({
      geometry: mesh.geometry,
      attribute: mesh.geometry.getAttribute("position") as T.BufferAttribute,
      rest: Float32Array.from(
        (mesh.geometry.getAttribute("position") as T.BufferAttribute).array,
      ),
    }));
  let clothX = 0;
  let clothZ = 0;
  let lastYaw = 0;
  let lastX = 0;
  let lastZ = 0;
  let gaitPhase = 0;
  let time = 0;
  let first = true;
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
        0.825 * driverBody.scale.x,
        0.825 * crouchScale,
        0.825 * driverBody.scale.z,
      );
      head.rotation.copy(driverHead.rotation);
      for (let i = 0; i < 2; i++) {
        armPivots[i].rotation.copy(driverArms[i].rotation);
        legPivots[i].rotation.copy(driverLegs[i].rotation);
        kneePivots[i].rotation.copy(driverKnees[i].rotation);
        footPivots[i].rotation.copy(driverFeet[i].rotation);
        footPivots[i].position.y = -0.27 + (driverFeet[i].position.y + 0.28);
      }
      time += dt;
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
      for (const { attribute, rest } of cloth) {
        for (let i = 0; i < attribute.count; i++) {
          const j = i * 3;
          const w = Math.pow(
            T.MathUtils.clamp((1.49 - rest[j + 1]) / 0.63, 0, 1),
            1.5,
          );
          attribute.setXYZ(
            i,
            rest[j] +
              clothX * w +
              Math.sin(time * 3 + rest[j + 1] * 5) * 0.007 * w,
            rest[j + 1],
            rest[j + 2] - clothZ * w,
          );
        }
        attribute.needsUpdate = true;
      }
      const stepWeight = Math.min(1, state.runSpeed / 5);
      for (const { geometry, attribute, rest } of tunic) {
        for (let i = 0; i < attribute.count; i++) {
          const j = i * 3;
          const w = Math.pow(
            T.MathUtils.clamp((1.15 - rest[j + 1]) / 0.64, 0, 1),
            1.4,
          );
          attribute.setXYZ(
            i,
            rest[j] +
              w * (Math.sin(gaitPhase) * 0.02 * stepWeight + clothX * 0.25),
            rest[j + 1],
            rest[j + 2] +
              w *
                (Math.cos(gaitPhase + rest[j] * 3) * 0.024 * stepWeight -
                  clothZ * 0.2),
          );
        }
        attribute.needsUpdate = true;
        geometry.computeVertexNormals();
      }
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
