import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  capsule,
  ellipsoid,
  sculpt,
  smoothUnion,
} from "../../characters/sculpture";
import { markScenery, sceneryBox } from "../shared/scenery";
import type { Solid } from "../../runtime/worlds";

export const CHRISTUS_REFERENCE =
  "https://www.churchofjesuschrist.org/feature/templesquare/conference-center-exhibits?lang=eng";
/** A modeled interpretation of Thorvaldsen's public-domain Christus, not an exact scan. */
export function buildConferenceChristus(
  parent: T.Group,
  origin = { x: 0, y: 12, z: 27 },
) {
  const group = new T.Group();
  group.name = "Thorvaldsen Christus — second floor";
  group.position.set(origin.x, origin.y, origin.z);
  group.userData = {
    sourceUrl: CHRISTUS_REFERENCE,
    authorNote:
      "Stylized reconstruction of Bertel Thorvaldsen's public-domain Christus; not an exact scan.",
    facing: "+z",
    figureHeight: 4.6,
  };
  parent.add(group);
  const solids: Solid[] = [];
  const marble = new T.MeshStandardMaterial({
    color: 0xf5f3ed,
    roughness: 0.68,
  });
  const baseMaterial = new T.MeshStandardMaterial({
    color: 0xd5cdbd,
    roughness: 0.8,
  });
  // Pedestal dimensions own both the visible surface and its collision.
  const pedestal = { x: 0, y: 0, z: 0, w: 2.7, h: 0.7, d: 1.9 };
  sceneryBox(group, solids, baseMaterial, pedestal, "Christus stone pedestal");
  const pieces: T.BufferGeometry[] = [];
  const addSculpt = (
    bounds: [[number, number, number], [number, number, number]],
    resolution: number,
    field: (x: number, y: number, z: number) => number,
  ) => {
    const mesh = sculpt({ bounds, resolution, field, material: marble });
    pieces.push(mesh.geometry);
  };
  const E = ellipsoid,
    C = capsule,
    U = smoothUnion;
  addSculpt(
    [
      [-2.25, -0.06, -0.65],
      [2.25, 4.7, 0.85],
    ],
    86,
    (x, y, z) => {
      // Continuous robe: narrow waist, weight-bearing leg and asymmetrical gathered drapery.
      const t = T.MathUtils.clamp(y / 3.4, 0, 1);
      const radius =
        0.69 - 0.26 * t + 0.11 * Math.exp(-Math.pow((y - 3.12) / 0.36, 2));
      const angle = Math.atan2(z, x);
      const folds =
        (0.022 + 0.026 * (1 - t)) * Math.cos(12 * angle + y * 1.1) +
        0.018 * Math.cos(19 * angle - y * 1.4);
      let d = Math.max(
        Math.hypot(x / (radius + folds), (z + 0.035) / (0.34 + folds)) *
          (radius + folds) -
          (radius + folds),
        Math.max(0.12 - y, y - 3.36),
      );
      d = U(d, E(x, y, z, 0, 3.17, 0, 0.62, 0.43, 0.3), 0.13);
      d = U(d, E(x, y, z, 0, 3.65, 0.005, 0.19, 0.38, 0.19), 0.08);
      // Open, lowered arms and hanging sleeves, continuous with the shoulders.
      for (const s of [-1, 1]) {
        d = U(
          d,
          C(x, y, z, s * 0.43, 3.24, 0, s * 1.17, 2.92, 0.02, 0.235),
          0.11,
        );
        d = U(
          d,
          C(x, y, z, s * 1.13, 2.93, 0.02, s * 1.75, 2.62, 0.13, 0.14),
          0.07,
        );
        d = U(d, E(x, y, z, s * 0.91, 2.94, -0.03, 0.41, 0.29, 0.23), 0.06);
        // Bare feet emerge beneath the robe, one gently forward.
        d = U(
          d,
          E(x, y, z, s * 0.28, 0.115, s === 1 ? 0.35 : 0.27, 0.17, 0.115, 0.31),
          0.035,
        );
      }
      // Drapery lives on the continuous robe surface; no separate raised sash.
      return d;
    },
  );
  // Higher-resolution head preserves a gentle downward gaze and recognizable facial planes.
  addSculpt(
    [
      [-0.48, 3.55, -0.41],
      [0.48, 4.64, 0.54],
    ],
    64,
    (x, y, z) => {
      let d = E(x, y, z, 0, 4.12, 0.015, 0.266, 0.405, 0.245);
      d = U(d, E(x, y, z, 0, 3.9, 0.095, 0.205, 0.21, 0.2), 0.04);
      d = U(d, E(x, y, z, 0, 4.09, 0.254, 0.065, 0.14, 0.095), 0.025);
      d = U(d, E(x, y, z, 0, 3.987, 0.265, 0.105, 0.023, 0.027), 0.008);
      for (const s of [-1, 1]) {
        d = U(
          d,
          E(x, y, z, s * 0.115, 4.19, 0.218, 0.115, 0.036, 0.044),
          0.018,
        );
        d = Math.max(
          d,
          -E(x, y, z, s * 0.115, 4.145, 0.239, 0.071, 0.022, 0.028),
        );
        // Long wavy hair falls to the shoulders; carved channels retain the marble material.
        const wave = 0.009 * Math.sin((y - 3.6) * 14);
        d = U(
          d,
          E(x, y, z, s * (0.235 + wave), 3.99, -0.045, 0.095, 0.44, 0.22),
          0.035,
        );
      }
      d = U(d, E(x, y, z, 0, 4.4, -0.04, 0.285, 0.19, 0.235), 0.025);
      d = U(d, E(x, y, z, 0, 3.84, 0.18, 0.15, 0.19, 0.11), 0.025);
      // A center part and fine beard grooves are actual surface recesses.
      d = Math.max(d, -C(x, y, z, 0, 4.42, 0.17, 0, 4.57, 0.02, 0.016));
      for (const gx of [-0.07, 0, 0.07])
        d = Math.max(
          d,
          -C(x, y, z, gx, 3.77, 0.26, gx * 1.2, 3.94, 0.295, 0.011),
        );
      return d;
    },
  );
  for (const s of [-1, 1])
    addSculpt(
      [
        [s === 1 ? 1.62 : -2.18, 2.24, -0.04],
        [s === 1 ? 2.18 : -1.62, 2.8, 0.47],
      ],
      40,
      (x, y, z) => {
        let d = E(x, y, z, s * 1.9, 2.57, 0.22, 0.18, 0.105, 0.14);
        // Four individually rounded fingers and the outward thumb make the palms legible.
        for (let i = 0; i < 4; i++)
          d = U(
            d,
            C(
              x,
              y,
              z,
              s * (1.82 + i * 0.067),
              2.55,
              0.28,
              s * (1.85 + i * 0.067),
              2.37 + 0.02 * Math.abs(i - 1),
              0.33,
              0.027,
            ),
            0.013,
          );
        d = U(
          d,
          C(x, y, z, s * 1.78, 2.59, 0.22, s * 1.74, 2.49, 0.35, 0.043),
          0.02,
        );
        return d;
      },
    );
  const geometry = mergeGeometries(pieces);
  for (const piece of pieces) piece.dispose();
  const figure = new T.Mesh(geometry, marble);
  figure.position.y = 0.7;
  figure.name =
    "Christus white marble sculpture — open palms, draped robe, bare feet";
  figure.castShadow = true;
  figure.receiveShadow = true;
  group.add(figure);
  // Fitted body and arm volumes avoid a single enclosing box across open space.
  const local: Solid[] = [
    { x: 0, y: 0.7, z: 0, w: 1.4, h: 2.35, d: 0.9 },
    { x: 0, y: 3.05, z: 0, w: 1.15, h: 1.18, d: 0.7 },
    { x: 0, y: 4.23, z: 0.05, w: 0.72, h: 1.1, d: 0.66 },
    ...[-1, 1].flatMap((s) => [
      { x: s * 0.94, y: 3.38, z: 0.03, w: 0.92, h: 0.54, d: 0.5 },
      { x: s * 1.6, y: 3.12, z: 0.13, w: 0.67, h: 0.36, d: 0.38 },
      { x: s * 1.93, y: 3.04, z: 0.24, w: 0.44, h: 0.44, d: 0.36 },
    ]),
  ];
  solids.push(...local);
  markScenery(figure, { kind: "solid", solids: local });
  // Public solids are world-space; meshes remain in the movable local group.
  for (const solid of solids) {
    solid.x += origin.x;
    solid.y += origin.y;
    solid.z += origin.z;
  }
  return {
    group,
    solids,
    landmark: {
      name: "Christus statue",
      x: origin.x,
      y: origin.y + 0.7,
      z: origin.z + 2.8,
    },
    landmarks: [
      {
        name: "Christus statue",
        x: origin.x,
        y: origin.y + 0.7,
        z: origin.z + 2.8,
      },
    ],
  };
}
