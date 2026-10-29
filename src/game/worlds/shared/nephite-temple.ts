import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { markScenery, sceneryBox, sceneryColumn } from "./scenery";
import type { Solid } from "../../physics/physics";

/**
 * An explorable *interpretation* of Nephi's temple (2 Nephi 5:16).
 * 1 Kings 6:2–3, 16–17 gives Solomon's 60:20:30 house, 20:10 porch,
 * and 40:20 hall/inner-room lengths. Here one cubit is a gameplay scale
 * of 0.6 world units. No Nephite site, dimensions, Ark, ritual, or exact
 * inventory is attested by the Book of Mormon. Stone/cedar and restrained
 * bronze interpret Nephi's explicit note that it had fewer precious things.
 * 1 Kings 6:18,29–35 and 7:15–50 inspire the carvings and furnishings.
 */
export function buildNephiteTemple(parent: T.Group, solids: Solid[]) {
  const temple = new T.Group();
  temple.name = "Nephi's temple · Solomon-pattern interpretation";
  parent.add(temple);
  const stone = new T.MeshStandardMaterial({
    color: 0xbcb494,
    roughness: 0.92,
  });
  const cedar = new T.MeshStandardMaterial({
    color: 0x8b633f,
    roughness: 0.87,
  });
  const darkCedar = new T.MeshStandardMaterial({
    color: 0x60482f,
    roughness: 0.89,
  });
  const bronze = new T.MeshStandardMaterial({
    color: 0x9c7750,
    metalness: 0.34,
    roughness: 0.67,
  });
  const flame = new T.MeshBasicMaterial({ color: 0xf2c571 });
  const box = (shape: Solid, material: T.Material, name: string) =>
    sceneryBox(temple, solids, material, shape, name);
  const decor = (
    shape: Solid,
    material: T.Material,
    name: string,
    reason: string,
  ) => {
    const mesh = new T.Mesh(
      new T.BoxGeometry(shape.w, shape.h, shape.d),
      material,
    );
    mesh.position.set(shape.x, shape.y + shape.h / 2, shape.z);
    mesh.name = name;
    temple.add(mesh);
    markScenery(mesh, { kind: "decoration", reason });
    return mesh;
  };
  // South-facing approach; porch 12×6, house 12×36, height 18.
  // Every floor has one owner. Adjacent floors and stair treads meet at edges.
  box(
    { x: 0, y: 0, z: -63, w: 12, h: 0.6, d: 36 },
    stone,
    "Temple hall and inner-room floor",
  );
  box({ x: 0, y: 0, z: -42, w: 12, h: 0.6, d: 6 }, stone, "Temple porch floor");
  box(
    { x: 0, y: 0, z: -36.9, w: 4.8, h: 0.2, d: 1.2 },
    stone,
    "Temple approach first step",
  );
  box(
    { x: 0, y: 0, z: -38.1, w: 4.8, h: 0.4, d: 1.2 },
    stone,
    "Temple approach second step",
  );
  for (const x of [-5.75, 5.75])
    box(
      { x, y: 0.6, z: -63, w: 0.5, h: 18, d: 36 },
      stone,
      "Temple solid side wall",
    );
  box(
    { x: 0, y: 0.6, z: -80.75, w: 11.5, h: 18, d: 0.5 },
    stone,
    "Temple solid rear wall",
  );
  for (const x of [-4, 4]) {
    box(
      { x, y: 0.6, z: -45.25, w: 3.5, h: 18, d: 0.5 },
      stone,
      "Temple entrance pier",
    );
    box(
      { x, y: 0.6, z: -69, w: 3.5, h: 18, d: 0.5 },
      cedar,
      "Inner sanctuary doorway pier",
    );
  }
  // Raised lintels keep the doorways genuinely open at player/camera height.
  box(
    { x: 0, y: 11.5, z: -45.25, w: 4.5, h: 7.1, d: 0.5 },
    cedar,
    "Temple entrance lintel",
  );
  box(
    { x: 0, y: 11.5, z: -69, w: 4.5, h: 7.1, d: 0.5 },
    cedar,
    "Inner sanctuary lintel",
  );
  box(
    { x: 0, y: 18.6, z: -63, w: 12, h: 0.55, d: 36 },
    cedar,
    "Temple cedar roof",
  );
  box(
    { x: 0, y: 18.6, z: -42, w: 12, h: 0.55, d: 6 },
    cedar,
    "Temple porch roof",
  );
  // Freestanding porch columns named in Solomon's account; their presence
  // here is visual interpretation, not a claim of Nephite pillar names.
  for (const [x, label] of [
    [-3.7, "Boaz"],
    [3.7, "Jachin"],
  ] as const) {
    sceneryColumn(
      temple,
      solids,
      bronze,
      { x, y: 0.6, z: -40.2, diameter: 1.1, height: 14.6 },
      `Porch bronze pillar · ${label} (Solomon pattern)`,
    );
    decor(
      { x, y: 15.2, z: -40.2, w: 1.7, h: 1.2, d: 1.7 },
      bronze,
      `${label} lily capital`,
      "Decorative capital high above the solid pillar shaft.",
    );
  }
  // Narrow lights set above eye height; no full wall AABB spans the entrance.
  for (const x of [-5.46, 5.46])
    for (const z of [-51, -57, -63, -75])
      decor(
        { x, y: 11.8, z, w: 0.11, h: 2.4, d: 0.7 },
        darkCedar,
        "Narrow cedar window frame",
        "Shallow wall carving outside the walking volume.",
      );
  // Batched cedar reliefs: palms, opened flowers, and wing-like cherubim motifs
  // follow 1 Kings 6; none represents a historical Nephite artifact.
  const reliefPart = (
    w: number,
    h: number,
    x: number,
    y: number,
    angle = 0,
  ) => {
    const shape = new T.BoxGeometry(w, h, 0.08);
    shape.rotateZ(angle);
    shape.translate(x, y, 0);
    return shape;
  };
  const motifParts = [
    [
      reliefPart(0.12, 1.05, 0, -0.18),
      ...[-2, -1, 0, 1, 2].map((i) =>
        reliefPart(0.12, 0.75, i * 0.19, 0.37, -i * 0.35),
      ),
    ],
    [
      reliefPart(0.18, 0.18, 0, 0),
      ...Array.from({ length: 6 }, (_, i) => {
        const a = (i * Math.PI) / 3;
        return reliefPart(
          0.18,
          0.38,
          Math.cos(a) * 0.25,
          Math.sin(a) * 0.25,
          a - Math.PI / 2,
        );
      }),
    ],
    [
      reliefPart(0.26, 0.75, 0, -0.12),
      reliefPart(0.24, 0.24, 0, 0.4),
      reliefPart(0.8, 0.2, -0.48, 0.15, -0.3),
      reliefPart(0.8, 0.2, 0.48, 0.15, 0.3),
    ],
  ];
  const dummy = new T.Object3D();
  for (const [motif, parts] of motifParts.entries()) {
    const geometry = mergeGeometries(parts)!;
    parts.forEach((part) => part.dispose());
    const reliefs = new T.InstancedMesh(geometry, darkCedar, 24);
    reliefs.name = [
      "Batched carved palms",
      "Batched carved open flowers",
      "Batched carved cherubim wings",
    ][motif];
    for (let i = 0; i < 24; i++) {
      const wall = i < 12 ? -1 : 1;
      const slot = i % 12;
      dummy.position.set(wall * 5.43, 5.2, -48 - slot * 2.55 - motif * 0.65);
      dummy.rotation.set(0, wall < 0 ? Math.PI / 2 : -Math.PI / 2, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      reliefs.setMatrixAt(i, dummy.matrix);
    }
    temple.add(reliefs);
    markScenery(reliefs, {
      kind: "decoration",
      reason: "Very shallow carved cedar reliefs attached to the solid walls.",
    });
  }
  // Courtyard furnishings leave a broad route into the porch.
  box(
    { x: -4.2, y: 0, z: -31.5, w: 2.2, h: 1.2, d: 2.2 },
    stone,
    "Interpretive courtyard altar",
  );
  box(
    { x: 4.2, y: 0, z: -31.5, w: 2.4, h: 0.85, d: 2.4 },
    bronze,
    "Interpretive courtyard laver base",
  );
  decor(
    { x: 4.2, y: 0.85, z: -31.5, w: 1.9, h: 0.32, d: 1.9 },
    bronze,
    "Courtyard laver basin",
    "Basin sits over its solid pedestal; no separate floor support.",
  );
  box(
    { x: -3.4, y: 0.6, z: -55, w: 2.3, h: 0.8, d: 1.25 },
    cedar,
    "Interpretive showbread table",
  );
  for (const x of [-3.3, 3.3])
    for (const z of [-51, -57, -63]) {
      sceneryColumn(
        temple,
        solids,
        bronze,
        { x, y: 0.6, z, diameter: 0.34, height: 1.7 },
        "Interpretive lampstand shaft",
      );
      decor(
        { x, y: 2.3, z, w: 0.5, h: 0.14, d: 0.5 },
        flame,
        "Lampstand light",
        "Small flame above a solid lampstand shaft.",
      );
    }
  // The inner sanctuary intentionally has no Ark or invented relic.
  decor(
    { x: 0, y: 5.2, z: -80.4, w: 5, h: 3, d: 0.12 },
    darkCedar,
    "Inner sanctuary cedar wall panel",
    "Thin wall ornament high above the single supporting floor.",
  );
  return {
    group: temple,
    entrance: { x: 0, y: 0.6, z: -41 },
    hall: { x: 0, y: 0.6, z: -58 },
    inner: { x: 0, y: 0.6, z: -75 },
  };
}
