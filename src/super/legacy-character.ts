import * as T from "three";

export type CharacterRole =
  | "nephi"
  | "nephi-disguised"
  | "sam"
  | "lehi"
  | "laman"
  | "guard"
  | "laban"
  | "laban-undressed"
  | "sariah";
export type CharacterMove =
  | "idle"
  | "run"
  | "crouch"
  | "crawl"
  | "jump"
  | "doubleJump"
  | "tripleJump"
  | "longJump"
  | "backflip"
  | "sideflip"
  | "wallKick"
  | "ledgeHang"
  | "climb";
export type CharacterState = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  grounded: boolean;
  runSpeed: number;
  crouching?: boolean;
  move?: CharacterMove;
  moveTime?: number;
  jumpStage?: number;
  carrying?: boolean;
  wave?: boolean;
  pointing?: boolean;
};

const PALETTE: Record<
  CharacterRole,
  {
    tunic: number;
    mantle: number;
    trim: number;
    hair: number;
    skin: number;
    beard: boolean;
  }
> = {
  nephi: {
    tunic: 0xdbc4a2,
    mantle: 0x406d74,
    trim: 0x7b5638,
    hair: 0x38281f,
    skin: 0xb98560,
    beard: false,
  },
  "nephi-disguised": {
    tunic: 0x373039,
    mantle: 0x514038,
    trim: 0x392b25,
    hair: 0x38281f,
    skin: 0xb98560,
    beard: false,
  },
  sam: {
    tunic: 0xbba87f,
    mantle: 0x6e7964,
    trim: 0x795d40,
    hair: 0x4b3327,
    skin: 0xbc8861,
    beard: false,
  },
  lehi: {
    tunic: 0xd1b58e,
    mantle: 0x826448,
    trim: 0xb39468,
    hair: 0x99918a,
    skin: 0xac7654,
    beard: true,
  },
  laman: {
    tunic: 0xa88163,
    mantle: 0x6b473e,
    trim: 0x45352b,
    hair: 0x2e221e,
    skin: 0xa97450,
    beard: true,
  },
  sariah: {
    tunic: 0xb5a78a,
    mantle: 0x7e8b83,
    trim: 0x897253,
    hair: 0x4b392d,
    skin: 0xb98560,
    beard: false,
  },
  laban: {
    tunic: 0x373039,
    mantle: 0x514038,
    trim: 0x392b25,
    hair: 0x2e221e,
    skin: 0xa97450,
    beard: true,
  },
  "laban-undressed": {
    tunic: 0xddd2b7,
    mantle: 0xddd2b7,
    trim: 0xddd2b7,
    hair: 0x2e221e,
    skin: 0xa97450,
    beard: true,
  },
  guard: {
    tunic: 0x373039,
    mantle: 0x514038,
    trim: 0x392b25,
    hair: 0x30251f,
    skin: 0xb27a54,
    beard: false,
  },
};

const damp = (speed: number, dt: number) =>
  1 - Math.exp(-speed * Math.min(Math.max(dt, 0), 0.1));
const angleDiff = (a: number, b: number) =>
  Math.atan2(Math.sin(a - b), Math.cos(a - b));

export function createCharacter(role: CharacterRole): {
  group: T.Group;
  update(dt: number, state: CharacterState): void;
  dispose(): void;
} {
  const colors = PALETTE[role];
  const armored =
    role === "guard" || role === "nephi-disguised" || role === "laban";
  const youngFace =
    role === "nephi" || role === "nephi-disguised" || role === "sam";
  const group = new T.Group();
  group.name = `${role}-character`;
  const body = new T.Group();
  body.name = "body";
  body.scale.y = 0.84;
  group.add(body);
  const geometries: T.BufferGeometry[] = [];
  const materials: T.Material[] = [];
  const mat = (color: number, roughness = 0.95) => {
    const material = new T.MeshStandardMaterial({
      color,
      roughness,
      flatShading: true,
    });
    materials.push(material);
    return material;
  };
  const skin = mat(colors.skin);
  const hair = mat(colors.hair);
  const tunic = mat(colors.tunic);
  const mantle = mat(colors.mantle);
  const trim = mat(colors.trim);
  const sandal = mat(0x493626);
  const white = mat(0xf6e8cc);
  const iris = mat(0x251c19);
  const lip = mat(0x71473b);
  const guardLeather = armored ? mat(0x684633) : null;
  const guardBronze = armored ? mat(0x9b7850, 0.7) : null;
  const guardRed = armored ? mat(0x9b3e35) : null;
  const mesh = (
    parent: T.Object3D,
    geometry: T.BufferGeometry,
    material: T.Material,
    x: number,
    y: number,
    z: number,
    name?: string,
  ) => {
    geometries.push(geometry);
    const object = new T.Mesh(geometry, material);
    object.position.set(x, y, z);
    object.castShadow = true;
    object.receiveShadow = true;
    if (name) object.name = name;
    parent.add(object);
    return object;
  };
  const box = (
    parent: T.Object3D,
    w: number,
    h: number,
    d: number,
    material: T.Material,
    x: number,
    y: number,
    z: number,
    name?: string,
  ) => mesh(parent, new T.BoxGeometry(w, h, d), material, x, y, z, name);
  const cylinder = (
    parent: T.Object3D,
    top: number,
    bottom: number,
    height: number,
    sides: number,
    material: T.Material,
    x: number,
    y: number,
    z: number,
    name?: string,
  ) =>
    mesh(
      parent,
      new T.CylinderGeometry(top, bottom, height, sides),
      material,
      x,
      y,
      z,
      name,
    );
  const sphere = (
    parent: T.Object3D,
    r: number,
    material: T.Material,
    x: number,
    y: number,
    z: number,
    sx = 1,
    sy = 1,
    sz = 1,
  ) => {
    const object = mesh(
      parent,
      new T.SphereGeometry(r, 8, 6),
      material,
      x,
      y,
      z,
    );
    object.scale.set(sx, sy, sz);
    return object;
  };

  const undressed = role === "laban-undressed";
  // Short walking tunic, open cloak, and visible shins keep the stride readable.
  cylinder(
    body,
    0.28,
    0.4,
    0.66,
    12,
    undressed ? skin : tunic,
    0,
    1.1,
    0,
    undressed ? "bare-torso" : "tunic",
  );
  sphere(body, 0.34, undressed ? skin : tunic, 0, 1.19, 0, 1.02, 0.94, 0.88);
  cylinder(
    body,
    0.39,
    0.49,
    role === "sariah" ? 0.91 : undressed ? 0.65 : 0.48,
    12,
    tunic,
    0,
    role === "sariah" ? 0.51 : 0.72,
    0,
    role === "sariah"
      ? "long-robe"
      : undressed
        ? "modesty-linen"
        : "tunic-skirt",
  );
  if (!undressed) {
    cylinder(body, 0.397, 0.4, 0.065, 12, trim, 0, 0.96, 0);
    sphere(body, 0.08, mat(0xc4a774, 0.65), 0, 0.96, 0.4, 0.85, 0.75, 0.35);
    const frontSash = box(
      body,
      0.105,
      0.51,
      0.055,
      guardRed ?? trim,
      -0.17,
      0.69,
      0.31,
    );
    frontSash.rotation.z = -0.11;
  }
  if (armored) {
    // A broad leather cuirass and diagonal red sash read clearly at game scale.
    const chest = sphere(
      body,
      0.36,
      guardLeather!,
      0,
      1.23,
      0.285,
      0.96,
      0.72,
      0.3,
    );
    chest.name = "guard-cuirass";
    chest.rotation.x = -0.07;
    const sash = box(body, 0.13, 0.55, 0.055, guardRed!, -0.015, 1.23, 0.37);
    sash.rotation.z = 0.48;
    box(body, 0.53, 0.055, 0.065, guardBronze!, 0, 1.04, 0.37);
    for (const side of [-1, 1]) {
      const plate = sphere(
        body,
        0.18,
        guardLeather!,
        side * 0.4,
        1.26,
        0.04,
        0.6,
        1,
        0.6,
      );
      plate.rotation.z = side * -0.35;
      box(body, 0.15, 0.045, 0.11, guardBronze!, side * 0.43, 1.39, 0.07);
    }
  }
  const cloak = new T.Group();
  cloak.name = "cloak";
  cloak.position.set(0, 1.37, -0.11);
  body.add(cloak);
  cloak.visible = !undressed;
  const back = mesh(
    cloak,
    new T.CylinderGeometry(0.36, 0.46, 1.01, 12, 2, true, Math.PI / 2, Math.PI),
    mantle,
    0,
    -0.43,
    -0.08,
  );
  back.rotation.x = -0.16;
  for (const side of [-1, 1]) {
    const panel = cylinder(
      cloak,
      0.075,
      0.11,
      0.64,
      7,
      mantle,
      side * 0.35,
      -0.23,
      0.03,
    );
    panel.scale.z = 0.65;
    panel.rotation.z = side * 0.1;
  }
  if (!undressed)
    mesh(
      body,
      new T.TorusGeometry(0.29, 0.055, 5, 12),
      mantle,
      0,
      1.39,
      0,
    ).rotation.x = Math.PI / 2;
  cylinder(body, 0.18, 0.17, 0.11, 8, skin, 0, 1.46, 0);

  const legs: T.Group[] = [];
  const knees: T.Group[] = [];
  const feet: T.Group[] = [];
  const arms: T.Group[] = [];
  for (const side of [-1, 1]) {
    const leg = new T.Group();
    leg.name = side < 0 ? "left-leg" : "right-leg";
    leg.position.set(side * 0.21, 0.66, 0);
    body.add(leg);
    legs.push(leg);
    cylinder(leg, 0.13, 0.105, 0.34, 7, skin, 0, -0.17, 0);
    const knee = new T.Group();
    knee.name = side < 0 ? "left-knee" : "right-knee";
    knee.position.y = -0.35;
    leg.add(knee);
    knees.push(knee);
    sphere(knee, 0.105, skin, 0, 0, 0, 1, 0.8, 1);
    cylinder(knee, 0.098, 0.075, 0.27, 7, skin, 0, -0.135, 0);
    const foot = new T.Group();
    foot.name = side < 0 ? "left-foot" : "right-foot";
    foot.position.y = -0.28;
    knee.add(foot);
    feet.push(foot);
    sphere(foot, 0.15, sandal, 0, 0, 0.09, 0.72, 0.29, 1.26);
    box(foot, 0.19, 0.035, 0.055, trim, 0, 0.07, 0.18);
    box(foot, 0.055, 0.16, 0.04, sandal, 0, 0.05, -0.07);

    const arm = new T.Group();
    arm.name = side < 0 ? "left-arm" : "right-arm";
    arm.position.set(side * 0.39, 1.32, 0);
    arm.rotation.z = side * (armored ? 0.2 : -0.12);
    body.add(arm);
    arms.push(arm);
    cylinder(
      arm,
      0.155,
      0.12,
      0.37,
      7,
      undressed ? skin : tunic,
      side * 0.025,
      -0.17,
      0,
    );
    cylinder(arm, 0.098, 0.078, 0.31, 7, skin, side * 0.035, -0.48, 0.015);
    sphere(arm, 0.09, skin, side * 0.04, -0.65, 0.028, 0.95, 1.15, 0.85);
  }

  const head = new T.Group();
  head.name = "head";
  head.position.set(0, 1.64, 0.025);
  body.add(head);
  const face = sphere(
    head,
    0.255,
    skin,
    0,
    0,
    0,
    role === "sariah" ? 0.83 : 0.88,
    1.1,
    role === "sariah" ? 0.82 : 0.86,
  );
  face.name = "face";
  sphere(head, 0.15, skin, 0, -0.13, 0.075, 1.15, 0.68, 0.86);
  for (const side of [-1, 1]) {
    sphere(head, 0.055, skin, side * 0.225, 0.005, -0.005, 0.55, 1, 0.6);
    sphere(head, 0.067, skin, side * 0.14, -0.09, 0.11, 0.8, 0.55, 0.55);
    const eye = sphere(
      head,
      0.038,
      white,
      side * 0.095,
      0.035,
      0.19,
      1,
      role === "guard" ? 0.5 : 0.7,
      0.45,
    );
    eye.name = side < 0 ? "left-eye" : "right-eye";
    const pupil = sphere(
      head,
      0.018,
      iris,
      side * 0.095,
      0.032,
      0.202,
      0.8,
      1,
      0.55,
    );
    pupil.name = side < 0 ? "left-iris" : "right-iris";
    const brow = sphere(
      head,
      0.067,
      hair,
      side * 0.096,
      role === "guard" ? 0.085 : 0.098,
      0.178,
      1,
      0.22,
      0.24,
    );
    brow.rotation.z = side * (role === "guard" ? 0.3 : -0.1);
    brow.name = side < 0 ? "left-brow" : "right-brow";
  }
  sphere(
    head,
    role === "sariah" ? 0.062 : youngFace ? 0.06 : 0.075,
    skin,
    0,
    -0.055,
    0.229,
    0.64,
    0.9,
    0.75,
  );
  sphere(head, 0.065, lip, 0, -0.15, 0.21, 0.9, 0.16, 0.28);
  sphere(head, 0.225, hair, 0, 0.19, -0.025, 0.98, 0.48, 0.98);
  for (const side of [-1, 1])
    sphere(head, 0.105, hair, side * 0.183, 0.09, -0.055, 0.65, 1.05, 0.65);
  if (youngFace) {
    const fringe = sphere(head, 0.14, hair, -0.07, 0.205, 0.135, 1, 0.28, 0.48);
    fringe.rotation.z = -0.13;
  }
  if (colors.beard) {
    const beard = sphere(
      head,
      role === "lehi" ? 0.17 : 0.13,
      hair,
      0,
      -0.18,
      0.13,
      1.05,
      role === "lehi" ? 1.42 : 0.82,
      0.72,
    );
    beard.name = "beard";
    beard.rotation.x = -0.13;
    for (const side of [-1, 1])
      sphere(head, 0.075, hair, side * 0.125, -0.125, 0.16, 0.7, 1, 0.65);
  }
  if (armored) {
    // Faceted bronze helmet with cheek guards, without a modern visor or gear.
    cylinder(head, 0.12, 0.26, 0.18, 8, guardBronze!, 0, 0.2, -0.015);
    cylinder(head, 0.255, 0.255, 0.045, 8, guardLeather!, 0, 0.105, 0);
    for (const side of [-1, 1]) {
      const cheek = sphere(
        head,
        0.11,
        guardBronze!,
        side * 0.225,
        0.015,
        0.02,
        0.4,
        1,
        0.7,
      );
      cheek.rotation.z = side * -0.14;
    }
    box(head, 0.07, 0.13, 0.065, guardBronze!, 0, 0.075, 0.248);
  } else if (role === "sariah") {
    const linen = mat(0xe8dfcb);
    const veil = new T.Group();
    veil.name = "linen-head-covering";
    head.add(veil);
    sphere(veil, 0.29, linen, 0, 0.235, -0.025, 0.92, 0.2, 0.75);
    mesh(
      veil,
      new T.CylinderGeometry(
        0.27,
        0.31,
        0.6,
        10,
        1,
        true,
        Math.PI / 2,
        Math.PI,
      ),
      linen,
      0,
      -0.035,
      -0.07,
    );
    for (const side of [-1, 1]) {
      const fold = cylinder(
        veil,
        0.055,
        0.085,
        0.56,
        7,
        linen,
        side * 0.25,
        -0.015,
        -0.045,
      );
      fold.scale.z = 0.7;
      fold.rotation.z = side * -0.08;
    }
  } else if (role === "lehi") {
    cylinder(head, 0.245, 0.245, 0.07, 10, mantle, 0, 0.225, 0.03);
  }

  let phase = Math.PI / 2;
  let idlePhase = 0;
  let airTime = 0;
  let landing = 0;
  let wasGrounded = true;
  let renderedYaw = 0;
  let firstUpdate = true;
  let gaitBlend = 0;
  let previousX = 0;
  let previousZ = 0;
  let previousForwardSpeed = 0;
  let forwardLean = 0;
  let turnBank = 0;
  let lastAirVy = 0;
  let wasLocomoting = false;
  const stanceAnchors: ({ x: number; z: number; yaw: number } | null)[] = [
    null,
    null,
  ];
  return {
    group,
    update(dt, state) {
      dt = Math.min(Math.max(dt, 0), 0.1);
      group.position.set(state.x, state.y, state.z);
      if (firstUpdate) {
        renderedYaw = state.yaw;
        previousX = state.x - state.vx * dt;
        previousZ = state.z - state.vz * dt;
        previousForwardSpeed =
          Math.sin(state.yaw) * state.vx + Math.cos(state.yaw) * state.vz;
        firstUpdate = false;
      }
      renderedYaw += angleDiff(state.yaw, renderedYaw) * damp(14, dt);
      body.rotation.y = renderedYaw;
      const speed = Math.min(1, state.runSpeed / 6.5);
      gaitBlend += ((state.grounded ? speed : 0) - gaitBlend) * damp(10, dt);
      const localForward =
        Math.sin(renderedYaw) * state.vx + Math.cos(renderedYaw) * state.vz;
      const localLateral =
        Math.cos(renderedYaw) * state.vx - Math.sin(renderedYaw) * state.vz;
      const headingError = angleDiff(state.yaw, renderedYaw);
      const bankTarget = Math.max(
        -0.16,
        Math.min(0.16, -localLateral * 0.022 - headingError * 0.08),
      );
      turnBank += (bankTarget - turnBank) * damp(11, dt);
      const forwardAcceleration =
        dt > 0
          ? Math.max(
              -35,
              Math.min(35, (localForward - previousForwardSpeed) / dt),
            )
          : 0;
      previousForwardSpeed = localForward;
      const leanTarget = Math.max(
        -0.075,
        Math.min(0.13, localForward * 0.016 + forwardAcceleration * 0.003),
      );
      forwardLean += (leanTarget - forwardLean) * damp(8, dt);
      const strideAmplitude =
        (0.38 + speed * 0.24) * Math.min(1, gaitBlend * 3);
      if (state.grounded) {
        const traveled = Math.hypot(state.x - previousX, state.z - previousZ);
        const locomoting = state.runSpeed > 0.25;
        if (locomoting && !wasLocomoting) phase = Math.PI / 2;
        wasLocomoting = locomoting;
        // A planted foot moves from front to back over the distance covered
        // during one stance. Short walking steps therefore have a faster cycle.
        const halfStep = 0.63 * Math.sin(0.38 + speed * 0.24);
        phase +=
          (Math.min(traveled, state.runSpeed * dt * 1.5) * Math.PI) /
          (2 * halfStep);
        idlePhase += dt;
        if (!wasGrounded)
          landing = Math.min(1, 0.28 + Math.abs(lastAirVy) * 0.075);
        airTime = 0;
      } else {
        airTime += dt;
        lastAirVy = state.vy;
      }
      previousX = state.x;
      previousZ = state.z;
      wasGrounded = state.grounded;
      landing = Math.max(0, landing - dt * 3.2);
      const stride = Math.sin(phase) * strideAmplitude;
      for (let i = 0; i < 2; i++) {
        const legPhase =
          (((phase + i * Math.PI) % (2 * Math.PI)) + 2 * Math.PI) %
          (2 * Math.PI);
        const stance = legPhase < Math.PI;
        const progress = stance
          ? legPhase / Math.PI
          : (legPhase - Math.PI) / Math.PI;
        const swing = stance ? 0 : Math.sin(progress * Math.PI);
        if (state.grounded) {
          const returnStep = progress * progress * (3 - 2 * progress);
          legs[i].rotation.x = stance
            ? strideAmplitude * (2 * progress - 1)
            : strideAmplitude * (1 - 2 * returnStep);
          knees[i].rotation.x = 0.025 * gaitBlend + swing * 0.68 * gaitBlend;
        } else {
          legs[i].rotation.x =
            i === 0
              ? -0.28 + Math.min(0.25, airTime * 0.6)
              : 0.33 - Math.min(0.22, airTime * 0.5);
          knees[i].rotation.x = 0.42;
        }
        feet[i].rotation.x = -legs[i].rotation.x - knees[i].rotation.x * 0.9;
        feet[i].position.y =
          -0.28 + (state.grounded ? gaitBlend * (0.045 + swing * 0.11) : 0);
        if (state.grounded && stance && !state.crouching) {
          const legLength = 0.35 - feet[i].position.y;
          const anchor = stanceAnchors[i];
          if (anchor && Math.abs(angleDiff(renderedYaw, anchor.yaw)) < 0.55) {
            const localZ =
              Math.sin(renderedYaw) * (anchor.x - state.x) +
              Math.cos(renderedYaw) * (anchor.z - state.z);
            if (Math.abs(localZ) < legLength * 0.85) {
              legs[i].rotation.x = -Math.asin(localZ / legLength);
            } else {
              stanceAnchors[i] = null;
            }
          }
          if (!stanceAnchors[i]) {
            const localZ = -legLength * Math.sin(legs[i].rotation.x);
            stanceAnchors[i] = {
              x: state.x + Math.sin(renderedYaw) * localZ,
              z: state.z + Math.cos(renderedYaw) * localZ,
              yaw: renderedYaw,
            };
          }
          feet[i].rotation.x = -legs[i].rotation.x - knees[i].rotation.x * 0.9;
        } else {
          stanceAnchors[i] = null;
        }
      }
      arms[0].rotation.x = state.grounded ? -stride * 0.78 - 0.08 : -0.42;
      arms[1].rotation.x = state.grounded ? stride * 0.78 - 0.08 : -0.26;
      legs[0].rotation.z = 0;
      legs[1].rotation.z = 0;
      arms[0].rotation.z = armored ? -0.2 : 0.12;
      arms[1].rotation.z = armored ? 0.2 : -0.12;
      body.position.y =
        (1 - Math.cos(phase * 2)) * 0.015 * gaitBlend +
        Math.sin(idlePhase * 0.55) * 0.009 -
        landing * 0.075;
      // The model's unscaled head reaches 1.94; physics reserves 1.65.
      body.scale.y = 0.84 * (1 - landing * 0.09);
      body.scale.x = 1 + landing * 0.045;
      body.scale.z = 1 + landing * 0.045;
      body.rotation.z = turnBank;
      body.rotation.x = (armored ? 0.055 : 0) + forwardLean;
      cloak.rotation.x =
        -0.08 - gaitBlend * 0.18 + Math.sin(phase * 1.3) * gaitBlend * 0.035;
      head.rotation.y = Math.sin(idlePhase * 0.4) * 0.055;
      head.rotation.x = state.grounded
        ? armored
          ? 0.07
          : 0
        : Math.max(-0.12, Math.min(0.15, -state.vy * 0.018));

      const move =
        state.crouching && !state.grounded
          ? "crouch"
          : (state.move ??
            (state.crouching
              ? state.runSpeed > 0.25
                ? "crawl"
                : "crouch"
              : state.grounded
                ? state.runSpeed > 0.25
                  ? "run"
                  : "idle"
                : (state.jumpStage ?? 1) >= 3
                  ? "tripleJump"
                  : state.jumpStage === 2
                    ? "doubleJump"
                    : "jump"));
      const moveTime = Math.max(0, state.moveTime ?? 0);
      if (move === "crouch" || move === "crawl") {
        // Scale around the feet; even the head and cloak fit under a 0.9 opening.
        body.scale.y = move === "crawl" ? 0.43 : 0.4599;
        body.scale.z = move === "crawl" ? 1.16 : 1;
        body.position.y = move === "crawl" ? 0.04 : 0;
        body.rotation.x = move === "crawl" ? 0.16 : 0;
        legs[0].rotation.x = move === "crawl" ? Math.sin(phase) * 0.4 : -0.85;
        legs[1].rotation.x = move === "crawl" ? -Math.sin(phase) * 0.4 : -0.85;
        knees[0].rotation.x = knees[1].rotation.x = 1.1;
        feet[0].rotation.x = feet[1].rotation.x = -0.25;
        arms[0].rotation.x =
          move === "crawl" ? -0.7 - Math.sin(phase) * 0.3 : -0.55;
        arms[1].rotation.x =
          move === "crawl" ? -0.7 + Math.sin(phase) * 0.3 : -0.55;
        head.rotation.x = -0.1;
      } else if (
        move === "backflip" ||
        move === "tripleJump" ||
        move === "sideflip"
      ) {
        const progress = Math.min(1, moveTime / 0.7);
        const angle = Math.PI * 2 * progress;
        // A raised center pivot keeps the inverted head above the ground.
        body.position.y = 0.83 * (1 - Math.cos(angle));
        body.rotation.x =
          move === "sideflip" ? 0 : move === "backflip" ? -angle : angle;
        body.rotation.z = move === "sideflip" ? angle : 0;
        legs[0].rotation.x = -0.45;
        legs[1].rotation.x = 0.55;
        arms[0].rotation.x = -1.1;
        arms[1].rotation.x = -1.1;
      } else if (move === "longJump") {
        body.rotation.x = 0.28;
        body.scale.z = 1.2;
        body.position.y = Math.max(body.position.y, 0.1);
        arms[0].rotation.x = -1.15;
        arms[1].rotation.x = -1.15;
        legs[0].rotation.x = 0.45;
        legs[1].rotation.x = 0.45;
      } else if (move === "wallKick") {
        body.rotation.x = -0.22;
        arms[0].rotation.x = -1.55;
        arms[1].rotation.x = -0.75;
        legs[0].rotation.x = -0.85;
        legs[1].rotation.x = 0.7;
      } else if (move === "ledgeHang") {
        body.position.y = 0;
        arms[0].rotation.x = -2.7;
        arms[1].rotation.x = -2.7;
        legs[0].rotation.x = 0.2;
        legs[1].rotation.x = -0.2;
      } else if (move === "climb") {
        const cycle = Math.sin(moveTime * 11);
        arms[0].rotation.x = -2.5 + cycle * 0.35;
        arms[1].rotation.x = -2.5 - cycle * 0.35;
        legs[0].rotation.x = -0.3 - cycle * 0.4;
        legs[1].rotation.x = -0.3 + cycle * 0.4;
      } else if (move === "doubleJump") {
        arms[0].rotation.x = -1.25;
        arms[1].rotation.x = -1.25;
        legs[0].rotation.x = -0.55;
        legs[1].rotation.x = -0.55;
      }
      if (state.carrying && move !== "ledgeHang" && move !== "climb") {
        arms[0].rotation.x = -1.1;
        arms[1].rotation.x = -1.1;
        arms[0].rotation.z = -0.28;
        arms[1].rotation.z = 0.28;
      }
      if (state.wave && move === "idle" && !state.carrying) {
        arms[1].rotation.z = 2.55 + Math.sin(idlePhase * 3.1) * 0.13;
        arms[1].rotation.x = -0.25 + Math.sin(idlePhase * 5.4) * 0.15;
      }
      if (state.pointing && move === "idle") {
        arms[1].rotation.x = -1.45 + Math.sin(idlePhase * 2) * 0.08;
        arms[1].rotation.z = 0.12;
        body.rotation.x = 0.1;
        head.rotation.x = 0.12;
      }
    },
    dispose() {
      group.parent?.remove(group);
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
      group.clear();
    },
  };
}
