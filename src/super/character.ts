import * as T from "three";

export type CharacterRole =
  "nephi" | "nephi-disguised" | "sam" | "lehi" | "laman" | "guard";
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
  const armored = role === "guard" || role === "nephi-disguised";
  const youngFace =
    role === "nephi" || role === "nephi-disguised" || role === "sam";
  const group = new T.Group();
  group.name = `${role}-character`;
  const body = new T.Group();
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

  // Short walking tunic, open cloak, and visible shins keep the stride readable.
  cylinder(body, 0.32, 0.43, 0.66, 8, tunic, 0, 1.1, 0);
  cylinder(body, 0.39, 0.49, 0.48, 8, tunic, 0, 0.72, 0);
  box(body, 0.78, 0.095, 0.12, trim, 0, 0.96, 0.08); // leather belt
  box(body, 0.12, 0.13, 0.075, mat(0xc4a774, 0.65), 0, 0.96, 0.16); // buckle
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
  if (armored) {
    // A broad leather cuirass and diagonal red sash read clearly at game scale.
    const chest = box(body, 0.67, 0.43, 0.12, guardLeather!, 0, 1.23, 0.295);
    chest.name = "guard-cuirass";
    chest.rotation.x = -0.07;
    const sash = box(body, 0.13, 0.55, 0.055, guardRed!, -0.015, 1.23, 0.37);
    sash.rotation.z = 0.48;
    box(body, 0.53, 0.055, 0.065, guardBronze!, 0, 1.04, 0.37);
    for (const side of [-1, 1]) {
      const plate = box(
        body,
        0.18,
        0.32,
        0.085,
        guardLeather!,
        side * 0.4,
        1.26,
        0.04,
      );
      plate.rotation.z = side * -0.35;
      box(body, 0.15, 0.045, 0.11, guardBronze!, side * 0.43, 1.39, 0.07);
    }
  }
  const cloak = new T.Group();
  cloak.name = "cloak";
  cloak.position.set(0, 1.37, -0.11);
  body.add(cloak);
  const back = box(cloak, 0.82, 1.01, 0.105, mantle, 0, -0.43, -0.35);
  back.rotation.x = -0.16;
  for (const side of [-1, 1]) {
    const panel = box(
      cloak,
      0.18,
      0.64,
      0.12,
      mantle,
      side * 0.35,
      -0.23,
      0.03,
    );
    panel.rotation.z = side * 0.1;
  }
  cylinder(body, 0.39, 0.41, 0.15, 8, mantle, 0, 1.39, 0); // draped collar
  cylinder(body, 0.18, 0.17, 0.11, 8, skin, 0, 1.46, 0);

  const legs: T.Group[] = [];
  const arms: T.Group[] = [];
  for (const side of [-1, 1]) {
    const leg = new T.Group();
    leg.name = side < 0 ? "left-leg" : "right-leg";
    leg.position.set(side * 0.21, 0.66, 0);
    body.add(leg);
    legs.push(leg);
    cylinder(leg, 0.125, 0.1, 0.44, 7, skin, 0, -0.21, 0);
    sphere(leg, 0.11, skin, 0, -0.43, 0, 1, 0.75, 1);
    box(leg, 0.205, 0.09, 0.37, sandal, 0, -0.58, 0.09);
    box(leg, 0.19, 0.035, 0.055, trim, 0, -0.5, 0.18);
    box(leg, 0.055, 0.16, 0.04, sandal, 0, -0.52, -0.07);

    const arm = new T.Group();
    arm.name = side < 0 ? "left-arm" : "right-arm";
    arm.position.set(side * 0.39, 1.32, 0);
    arm.rotation.z = side * (armored ? 0.2 : -0.12);
    body.add(arm);
    arms.push(arm);
    cylinder(arm, 0.155, 0.12, 0.37, 7, tunic, side * 0.025, -0.17, 0);
    cylinder(arm, 0.098, 0.078, 0.31, 7, skin, side * 0.035, -0.48, 0.015);
    sphere(arm, 0.09, skin, side * 0.04, -0.65, 0.028, 0.95, 1.15, 0.85);
  }

  const head = new T.Group();
  head.position.set(0, 1.64, 0.025);
  body.add(head);
  sphere(head, 0.255, skin, 0, 0, 0, 0.88, 1.1, 0.86);
  for (const side of [-1, 1]) {
    sphere(head, 0.055, skin, side * 0.225, 0.005, -0.005, 0.55, 1, 0.6);
    sphere(
      head,
      0.047,
      white,
      side * 0.095,
      0.035,
      0.205,
      1,
      role === "guard" ? 0.5 : 0.7,
      0.45,
    );
    sphere(head, 0.025, iris, side * 0.095, 0.032, 0.226, 0.7, 1, 0.5);
    const brow = box(
      head,
      role === "guard" ? 0.13 : 0.095,
      role === "guard" ? 0.035 : 0.025,
      0.04,
      hair,
      side * 0.096,
      role === "guard" ? 0.085 : 0.098,
      0.22,
    );
    brow.rotation.z = side * (role === "guard" ? 0.3 : -0.1);
  }
  mesh(
    head,
    new T.ConeGeometry(youngFace ? 0.052 : 0.067, 0.14, 5),
    skin,
    0,
    -0.055,
    0.245,
  ).rotation.x = Math.PI / 2;
  box(head, 0.105, 0.018, 0.021, lip, 0, -0.15, 0.212);
  sphere(head, 0.225, hair, 0, 0.19, -0.025, 0.98, 0.48, 0.98);
  for (const side of [-1, 1])
    box(head, 0.076, 0.16, 0.12, hair, side * 0.183, 0.09, -0.055);
  if (youngFace) {
    const fringe = box(head, 0.21, 0.065, 0.085, hair, -0.07, 0.205, 0.165);
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
      const cheek = box(
        head,
        0.075,
        0.19,
        0.13,
        guardBronze!,
        side * 0.225,
        0.015,
        0.02,
      );
      cheek.rotation.z = side * -0.14;
    }
    box(head, 0.07, 0.13, 0.065, guardBronze!, 0, 0.075, 0.248);
  } else if (role === "lehi") {
    box(head, 0.47, 0.085, 0.26, mantle, 0, 0.225, 0.03);
  }

  let phase = 0;
  let airTime = 0;
  let landing = 0;
  let wasGrounded = true;
  let renderedYaw = 0;
  let firstUpdate = true;
  return {
    group,
    update(dt, state) {
      dt = Math.min(Math.max(dt, 0), 0.1);
      group.position.set(state.x, state.y, state.z);
      if (firstUpdate) {
        renderedYaw = state.yaw;
        firstUpdate = false;
      }
      renderedYaw += angleDiff(state.yaw, renderedYaw) * damp(14, dt);
      body.rotation.y = renderedYaw;
      const speed = Math.min(1, state.runSpeed / 6.5);
      if (state.grounded) {
        phase += dt * (4.3 + state.runSpeed * 1.55);
        if (!wasGrounded)
          landing = Math.min(1, 0.35 + Math.abs(state.vy) * 0.08);
        airTime = 0;
      } else airTime += dt;
      wasGrounded = state.grounded;
      landing = Math.max(0, landing - dt * 3.2);
      const stride = Math.sin(phase) * 0.64 * speed;
      legs[0].rotation.x = state.grounded
        ? stride
        : -0.28 + Math.min(0.25, airTime * 0.6);
      legs[1].rotation.x = state.grounded
        ? -stride
        : 0.33 - Math.min(0.22, airTime * 0.5);
      arms[0].rotation.x = state.grounded ? -stride * 0.78 - 0.08 : -0.42;
      arms[1].rotation.x = state.grounded ? stride * 0.78 - 0.08 : -0.26;
      legs[0].rotation.z = 0;
      legs[1].rotation.z = 0;
      arms[0].rotation.z = armored ? -0.2 : 0.12;
      arms[1].rotation.z = armored ? 0.2 : -0.12;
      body.position.y =
        Math.sin(phase * 2) * 0.035 * speed +
        Math.sin(phase * 0.35) * 0.009 -
        landing * 0.075;
      // The model's unscaled head reaches 1.94; physics reserves 1.65.
      body.scale.y = 0.84 * (1 - landing * 0.09);
      body.scale.x = 1 + landing * 0.045;
      body.scale.z = 1 + landing * 0.045;
      body.rotation.z = Math.max(-0.1, Math.min(0.1, -state.vx * 0.012));
      body.rotation.x = armored ? 0.055 : 0;
      cloak.rotation.x =
        -0.08 - speed * 0.18 + Math.sin(phase * 1.3) * speed * 0.035;
      head.rotation.y = Math.sin(phase * 0.27) * 0.055;
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
        body.scale.y = move === "crawl" ? 0.43 : 0.46;
        body.scale.z = move === "crawl" ? 1.16 : 1;
        body.position.y = move === "crawl" ? 0.04 : 0;
        body.rotation.x = move === "crawl" ? 0.16 : 0;
        legs[0].rotation.x = move === "crawl" ? Math.sin(phase) * 0.4 : -0.85;
        legs[1].rotation.x = move === "crawl" ? -Math.sin(phase) * 0.4 : -0.85;
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
        arms[1].rotation.z = 2.55 + Math.sin(phase * 3.1) * 0.13;
        arms[1].rotation.x = -0.25 + Math.sin(phase * 5.4) * 0.15;
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
