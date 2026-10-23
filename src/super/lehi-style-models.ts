import * as T from "three";
import { createCharacter } from "./character";

export type LehiVariant = { group: T.Group; dispose: () => void };

const C = {
  skin: 0xac7654,
  robe: 0xd1b58e,
  linen: 0xe2cfaa,
  mantle: 0x826448,
  mantleLight: 0x99775a,
  belt: 0x886642,
  hair: 0x99918a,
  beard: 0xb5ada3,
  eyes: 0x2c2927,
  sandal: 0x493626,
};

function normalize(group: T.Group) {
  group.updateMatrixWorld(true);
  const bounds = new T.Box3().setFromObject(group);
  const height = bounds.max.y - bounds.min.y;
  const scale = 2 / height;
  group.scale.setScalar(scale);
  group.position.y = -bounds.min.y * scale;
  group.updateMatrixWorld(true);
}

function smoothGameLehi(): LehiVariant {
  const source = createCharacter("lehi");
  source.update(0, {
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    yaw: 0,
    grounded: true,
    runSpeed: 0,
    move: "idle",
  });
  const group = source.group.clone(true);
  const geometries: T.BufferGeometry[] = [];
  const materials: T.Material[] = [];
  group.traverse((object) => {
    if (!(object instanceof T.Mesh)) return;
    const old = object.geometry;
    let geometry: T.BufferGeometry;
    if (old instanceof T.SphereGeometry) {
      geometry = new T.SphereGeometry(old.parameters.radius, 24, 16);
    } else if (old instanceof T.CylinderGeometry) {
      const p = old.parameters;
      geometry = new T.CylinderGeometry(
        p.radiusTop,
        p.radiusBottom,
        p.height,
        24,
        p.heightSegments,
        p.openEnded,
        p.thetaStart,
        p.thetaLength,
      );
    } else if (old instanceof T.TorusGeometry) {
      const p = old.parameters;
      geometry = new T.TorusGeometry(p.radius, p.tube, 10, 32, p.arc);
    } else {
      geometry = old.clone();
    }
    object.geometry = geometry;
    geometries.push(geometry);
    const material = (object.material as T.MeshStandardMaterial).clone();
    material.flatShading = false;
    material.needsUpdate = true;
    object.material = material;
    materials.push(material);
  });
  source.dispose();
  normalize(group);
  return {
    group,
    dispose: () => {
      group.parent?.remove(group);
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
      group.clear();
    },
  };
}

type Shape = "playful" | "storybook" | "clay" | "natural";
type ShapeSpec = {
  head: number;
  headY: number;
  headStretch: number;
  shoulder: number;
  robeTop: number;
  robeBottom: number;
  robeHeight: number;
  faceZ: number;
  cloakLength: number;
  sides: number;
};

const SPECS: Record<Shape, ShapeSpec> = {
  playful: {
    head: 0.345,
    headY: 1.62,
    headStretch: 1.02,
    shoulder: 0.35,
    robeTop: 0.31,
    robeBottom: 0.53,
    robeHeight: 0.87,
    faceZ: 0.04,
    cloakLength: 0.83,
    sides: 20,
  },
  storybook: {
    head: 0.27,
    headY: 1.68,
    headStretch: 1.12,
    shoulder: 0.37,
    robeTop: 0.32,
    robeBottom: 0.47,
    robeHeight: 1.06,
    faceZ: 0.045,
    cloakLength: 1.08,
    sides: 18,
  },
  clay: {
    head: 0.3,
    headY: 1.65,
    headStretch: 1.04,
    shoulder: 0.4,
    robeTop: 0.35,
    robeBottom: 0.49,
    robeHeight: 0.98,
    faceZ: 0.04,
    cloakLength: 0.97,
    sides: 32,
  },
  natural: {
    head: 0.235,
    headY: 1.71,
    headStretch: 1.12,
    shoulder: 0.4,
    robeTop: 0.34,
    robeBottom: 0.43,
    robeHeight: 1.12,
    faceZ: 0.035,
    cloakLength: 1.15,
    sides: 28,
  },
};

function shapedLehi(style: Shape): LehiVariant {
  const spec = SPECS[style];
  const group = new T.Group();
  group.name = `lehi-${style}`;
  const geometries: T.BufferGeometry[] = [];
  const materials: T.Material[] = [];
  const mat = (color: number, roughness = 0.86) => {
    const material = new T.MeshStandardMaterial({ color, roughness });
    materials.push(material);
    return material;
  };
  const skin = mat(C.skin);
  const robe = mat(C.robe);
  const linen = mat(C.linen);
  const mantle = mat(C.mantle);
  const mantleLight = mat(C.mantleLight);
  const belt = mat(C.belt);
  const hair = mat(C.hair);
  const beard = mat(C.beard);
  const eyes = mat(C.eyes, 0.45);
  const sandal = mat(C.sandal);
  const add = (
    parent: T.Object3D,
    geometry: T.BufferGeometry,
    material: T.Material,
    x: number,
    y: number,
    z: number,
  ) => {
    geometries.push(geometry);
    const mesh = new T.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const orb = (
    parent: T.Object3D,
    material: T.Material,
    x: number,
    y: number,
    z: number,
    rx: number,
    ry: number,
    rz: number,
  ) => {
    const mesh = add(
      parent,
      new T.SphereGeometry(1, spec.sides, 16),
      material,
      x,
      y,
      z,
    );
    mesh.scale.set(rx, ry, rz);
    return mesh;
  };
  const tube = (
    parent: T.Object3D,
    material: T.Material,
    x: number,
    y: number,
    z: number,
    top: number,
    bottom: number,
    length: number,
  ) =>
    add(
      parent,
      new T.CylinderGeometry(top, bottom, length, spec.sides),
      material,
      x,
      y,
      z,
    );

  // Sandals, legs, and the robe share a continuous grounded silhouette.
  for (const side of [-1, 1]) {
    tube(group, skin, side * 0.205, 0.22, 0, 0.095, 0.077, 0.38);
    orb(group, sandal, side * 0.205, 0.067, 0.115, 0.145, 0.065, 0.22);
    orb(group, belt, side * 0.205, 0.125, 0.115, 0.098, 0.035, 0.11);
  }
  const robeCenter =
    style === "playful" ? 0.71 : style === "natural" ? 0.65 : 0.68;
  if (style === "clay") {
    const points = [
      [0.43, 0.16],
      [0.47, 0.27],
      [0.49, 0.5],
      [0.43, 0.86],
      [0.34, 1.15],
      [0.29, 1.32],
    ].map(([radius, y]) => new T.Vector2(radius, y));
    add(group, new T.LatheGeometry(points, 32), robe, 0, 0, 0);
  } else {
    tube(
      group,
      robe,
      0,
      robeCenter,
      0,
      spec.robeTop,
      spec.robeBottom,
      spec.robeHeight,
    );
  }
  orb(group, robe, 0, 1.22, 0, spec.shoulder, 0.35, 0.285);
  if (style === "playful") orb(group, linen, 0, 1.08, 0.252, 0.27, 0.24, 0.055);
  const sash = add(
    group,
    new T.TorusGeometry(spec.robeTop + 0.055, 0.035, 10, 36),
    belt,
    0,
    1.01,
    0,
  );
  sash.rotation.x = Math.PI / 2;
  orb(group, belt, 0, 1.01, spec.robeTop + 0.065, 0.065, 0.055, 0.025);

  // The mantle is a curved, open-front shell; it remains dimensional in profile.
  const cloak = add(
    group,
    new T.CylinderGeometry(
      spec.shoulder + 0.05,
      spec.robeBottom + (style === "storybook" ? 0.13 : 0.07),
      spec.cloakLength,
      spec.sides,
      3,
      true,
      0.46,
      Math.PI * 2 - 0.92,
    ),
    mantle,
    0,
    1.27 - spec.cloakLength / 2,
    -0.085,
  );
  cloak.rotation.x = style === "storybook" ? -0.07 : -0.045;
  for (const side of [-1, 1]) {
    const panel = orb(
      group,
      mantleLight,
      side * (spec.shoulder + 0.005),
      0.94,
      0.095,
      style === "natural" ? 0.09 : 0.115,
      spec.cloakLength * 0.49,
      0.085,
    );
    panel.rotation.z = side * (style === "storybook" ? 0.13 : 0.08);
  }
  if (style === "storybook") {
    for (const side of [-1, 1])
      orb(group, mantle, side * 0.42, 0.53, -0.27, 0.13, 0.38, 0.1);
  }

  // Sleeves and exposed hands keep the proportions readable in rotation.
  for (const side of [-1, 1]) {
    const sleeve = orb(
      group,
      style === "clay" ? mantleLight : robe,
      side * (spec.shoulder + 0.08),
      1.16,
      0,
      style === "playful" ? 0.175 : 0.14,
      0.29,
      0.145,
    );
    sleeve.rotation.z = side * -0.17;
    orb(
      group,
      skin,
      side * (spec.shoulder + 0.14),
      0.88,
      0.06,
      0.105,
      0.12,
      0.09,
    );
  }

  // All details grow from the face rather than floating as frontal decals.
  const head = new T.Group();
  head.position.set(0, spec.headY, spec.faceZ);
  group.add(head);
  const face = orb(
    head,
    skin,
    0,
    0,
    0,
    spec.head * 0.91,
    spec.head * spec.headStretch,
    spec.head * 0.84,
  );
  face.name = "face";
  orb(
    head,
    skin,
    0,
    -spec.head * 0.49,
    spec.head * 0.19,
    spec.head * 0.72,
    spec.head * 0.42,
    spec.head * 0.6,
  );
  orb(
    head,
    hair,
    0,
    spec.head * 0.73,
    -spec.head * 0.12,
    spec.head * 0.96,
    spec.head * 0.35,
    spec.head * 0.82,
  );
  for (const side of [-1, 1]) {
    orb(
      head,
      hair,
      side * spec.head * 0.81,
      spec.head * 0.18,
      -spec.head * 0.13,
      spec.head * 0.22,
      spec.head * 0.64,
      spec.head * 0.4,
    );
    orb(
      head,
      skin,
      side * spec.head * 0.92,
      -spec.head * 0.06,
      -spec.head * 0.03,
      spec.head * 0.15,
      spec.head * 0.23,
      spec.head * 0.17,
    );
    const eyeX = side * spec.head * 0.35;
    const eyeY = spec.head * 0.1;
    const eyeZ = spec.head * 0.76;
    orb(
      head,
      eyes,
      eyeX,
      eyeY,
      eyeZ,
      spec.head * 0.068,
      spec.head * 0.085,
      spec.head * 0.04,
    );
    const brow = orb(
      head,
      hair,
      eyeX,
      eyeY + spec.head * 0.155,
      eyeZ - spec.head * 0.025,
      spec.head * 0.2,
      spec.head * 0.043,
      spec.head * 0.055,
    );
    brow.rotation.z = side * -0.11;
  }
  orb(
    head,
    skin,
    0,
    -spec.head * 0.19,
    spec.head * 0.87,
    spec.head * 0.19,
    spec.head * 0.29,
    spec.head * 0.19,
  );
  const band = add(
    head,
    new T.TorusGeometry(
      spec.head * 0.925,
      style === "natural" ? 0.018 : 0.026,
      10,
      40,
    ),
    mantle,
    0,
    spec.head * 0.52,
    0,
  );
  band.rotation.x = Math.PI / 2;

  // Beard treatment carries most of the style variation while retaining Lehi.
  if (style === "playful") {
    orb(
      head,
      beard,
      0,
      -spec.head * 0.65,
      spec.head * 0.43,
      spec.head * 0.7,
      spec.head * 0.55,
      spec.head * 0.34,
    );
    for (const side of [-1, 0, 1])
      orb(
        head,
        beard,
        side * spec.head * 0.3,
        -spec.head * (side === 0 ? 1.02 : 0.87),
        spec.head * 0.42,
        spec.head * 0.31,
        spec.head * 0.39,
        spec.head * 0.31,
      );
  } else if (style === "storybook") {
    orb(
      head,
      beard,
      0,
      -spec.head * 0.82,
      spec.head * 0.34,
      spec.head * 0.65,
      spec.head * 0.82,
      spec.head * 0.36,
    );
    tube(
      head,
      beard,
      0,
      -spec.head * 1.29,
      spec.head * 0.38,
      spec.head * 0.44,
      spec.head * 0.11,
      spec.head * 0.68,
    );
    for (const side of [-1, 1])
      orb(
        head,
        beard,
        side * spec.head * 0.54,
        -spec.head * 0.45,
        spec.head * 0.43,
        spec.head * 0.25,
        spec.head * 0.48,
        spec.head * 0.27,
      );
  } else if (style === "clay") {
    for (const side of [-1, 0, 1])
      orb(
        head,
        beard,
        side * spec.head * 0.3,
        -spec.head * (side === 0 ? 0.93 : 0.68),
        spec.head * 0.43,
        spec.head * 0.37,
        spec.head * 0.59,
        spec.head * 0.32,
      );
    for (const side of [-1, 1])
      orb(
        head,
        beard,
        side * spec.head * 0.56,
        -spec.head * 0.26,
        spec.head * 0.57,
        spec.head * 0.27,
        spec.head * 0.25,
        spec.head * 0.24,
      );
  } else {
    orb(
      head,
      beard,
      0,
      -spec.head * 0.74,
      spec.head * 0.43,
      spec.head * 0.69,
      spec.head * 0.72,
      spec.head * 0.3,
    );
    for (const side of [-1, 1])
      orb(
        head,
        beard,
        side * spec.head * 0.62,
        -spec.head * 0.37,
        spec.head * 0.36,
        spec.head * 0.19,
        spec.head * 0.43,
        spec.head * 0.26,
      );
  }
  normalize(group);
  return {
    group,
    dispose: () => {
      group.parent?.remove(group);
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
      group.clear();
    },
  };
}

export function buildLehiVariant(index: number): LehiVariant {
  if (index === 0) {
    const character = createCharacter("lehi");
    character.update(0, {
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      yaw: 0,
      grounded: true,
      runSpeed: 0,
      move: "idle",
    });
    normalize(character.group);
    return { group: character.group, dispose: character.dispose };
  }
  if (index === 1) return smoothGameLehi();
  const style = (["playful", "storybook", "clay", "natural"] as const)[
    index - 2
  ];
  if (!style) throw new RangeError(`Unknown Lehi variant ${index}`);
  return shapedLehi(style);
}
