import * as T from "three";
import type { Solid } from "../../physics/physics";

function supportFloorHeight(
  x: number,
  z: number,
  solids: readonly Solid[],
  maxTopY: number,
): number {
  let highest = -Infinity;
  for (const s of solids) {
    if (
      x >= s.x - s.w / 2 &&
      x <= s.x + s.w / 2 &&
      z >= s.z - s.d / 2 &&
      z <= s.z + s.d / 2
    ) {
      const top = s.y + s.h;
      if (top <= maxTopY) highest = Math.max(highest, top);
    }
  }
  return highest;
}

export type SurfaceMismatch = {
  x: number;
  z: number;
  supportY: number;
  visualY: number;
  delta: number;
  meshName: string;
};

export type CoplanarBleedIssue = {
  kind: "coplanar-same-face" | "micro-gap-bleed" | "misaligned-overlay";
  message: string;
  point: { x: number; y: number; z: number };
};

type ExtractedBox = {
  label: string;
  color: number;
  box: T.Box3;
  isSolid: boolean;
};

function materialColorHex(mat: T.Material | T.Material[]): number | null {
  const m = Array.isArray(mat) ? mat[0] : mat;
  if (!m || m.transparent || m.opacity < 0.95) return null;
  const color = (m as T.MeshStandardMaterial).color;
  return color instanceof T.Color ? color.getHex() : null;
}

function isVisibleWorldObject(obj: T.Object3D): boolean {
  for (let a: T.Object3D | null = obj; a; a = a.parent) {
    if (!a.visible) return false;
    if (a.userData?.isCharacterRig) return false;
    if (
      /animal|gazelle|ibex|goat|sheep|flock|crowd|family|soldier|guard|sentry|messenger|sleeper|prisoner/i.test(
        a.name,
      )
    )
      return false;
  }
  return true;
}

/**
 * Audit walkable sample points in a world to verify that the physical support
 * surface (`solids`) matches the visible rendered floor/roof/deck mesh height
 * (no sinking into roofs or floating above floors).
 */
export function auditWalkSurfaceAlignment(
  root: T.Object3D,
  solids: readonly Solid[],
  points: readonly { x: number; y?: number; z: number; label?: string }[],
  maxSink = 0.08,
): SurfaceMismatch[] {
  root.updateMatrixWorld(true);
  const floorMeshes: T.Object3D[] = [];
  root.traverse((obj) => {
    if (!isVisibleWorldObject(obj)) return;
    if (obj instanceof T.Mesh || obj instanceof T.InstancedMesh) {
      const scenery = obj.userData.scenery;
      if (scenery?.kind === "backdrop") return;
      if (
        /water|ocean|cloud|canopy|leaf|leaves|frond|sail|flame|fire|smoke|halo|wedge|cue|beacon|marker|character|head|torso|leg|arm|coat|tunic|hem|hair|beard|stand|vessel|lamp|pottery|earthenware|foliage|thicket|dune/i.test(
          obj.name,
        )
      )
        return;
      if (obj instanceof T.Mesh && !(obj instanceof T.InstancedMesh)) {
        obj.geometry.computeBoundingBox();
        const bb = obj.geometry.boundingBox;
        if (bb) {
          const sx = (bb.max.x - bb.min.x) * Math.abs(obj.scale.x);
          const sz = (bb.max.z - bb.min.z) * Math.abs(obj.scale.z);
          if (Math.max(sx, sz) < 0.75) return;
        }
      }
      const hex = materialColorHex(obj.material);
      if (hex === null) return;
      floorMeshes.push(obj);
    }
  });

  const raycaster = new T.Raycaster();
  const down = new T.Vector3(0, -1, 0);
  const issues: SurfaceMismatch[] = [];

  for (const pt of points) {
    const refY = pt.y ?? 0;
    const supportY = supportFloorHeight(pt.x, pt.z, solids, refY + 0.5);
    if (!Number.isFinite(supportY) || supportY < -50) continue;

    // Cast downward from slightly above knee/waist height at the supported position
    // so roofs/ceilings overhead are not mistaken for the floor beneath the feet.
    const rayStartY = supportY + 0.55;
    raycaster.set(new T.Vector3(pt.x, rayStartY, pt.z), down);
    const hits = raycaster
      .intersectObjects(floorMeshes, false)
      .filter(
        (hit) =>
          hit.point.y <= supportY + 0.45 &&
          hit.point.y >= supportY - 0.45 &&
          (!hit.face || hit.face.normal.y > 0.5),
      );
    if (hits.length === 0) continue;

    // Highest upward-facing visible surface near the player's feet
    const topHit = hits[0];
    const delta = topHit.point.y - supportY;
    const hitScenery = topHit.object.userData?.scenery;
    const multiSolidRock =
      hitScenery?.kind === "solid" &&
      Array.isArray(hitScenery.solids) &&
      hitScenery.solids.length > 1;
    const isLowGroundTrim = hitScenery?.kind === "decoration" && delta <= 0.115;
    const allowedSink = multiSolidRock
      ? Math.max(maxSink, 0.34)
      : isLowGroundTrim
        ? Math.max(maxSink, 0.115)
        : maxSink;
    // Positive delta > allowedSink means the visible mesh is above the physics floor (player sinks into it!)
    if (delta > allowedSink) {
      issues.push({
        x: pt.x,
        z: pt.z,
        supportY,
        visualY: topHit.point.y,
        delta,
        meshName: topHit.object.name || pt.label || "unnamed mesh",
      });
    }
  }
  return issues;
}

/**
 * Extract axis-aligned world boxes of horizontal box-like meshes and instances
 * to detect coplanar Z-fighting, micro-gap depth bleed, and misaligned bedding.
 */
export function auditCoplanarMaterialBleed(
  root: T.Object3D,
  solids: readonly Solid[] = [],
): CoplanarBleedIssue[] {
  root.updateMatrixWorld(true);
  const boxes: ExtractedBox[] = [];
  const tempMatrix = new T.Matrix4();
  const worldMatrix = new T.Matrix4();

  const matchesSolid = (b: T.Box3) => {
    const cx = (b.min.x + b.max.x) / 2;
    const cz = (b.min.z + b.max.z) / 2;
    const w = b.max.x - b.min.x;
    const h = b.max.y - b.min.y;
    const d = b.max.z - b.min.z;
    return solids.some(
      (s) =>
        Math.abs(s.x - cx) < 0.05 &&
        Math.abs(s.y - b.min.y) < 0.05 &&
        Math.abs(s.z - cz) < 0.05 &&
        Math.abs(s.w - w) < 0.05 &&
        Math.abs(s.h - h) < 0.05 &&
        Math.abs(s.d - d) < 0.05,
    );
  };

  root.traverse((obj) => {
    if (!isVisibleWorldObject(obj)) return;
    if (
      /sculpted|hair|beard|tunic|trouser|sandal|boot|bracer|mantle|robe|headwear|sleeve|coat|hem/i.test(
        obj.name,
      )
    )
      return;
    if (obj instanceof T.InstancedMesh) {
      const hex = materialColorHex(obj.material);
      if (hex === null) return;
      obj.geometry.computeBoundingBox();
      const geomBox = obj.geometry.boundingBox;
      if (!geomBox) return;
      for (let i = 0; i < obj.count; i++) {
        obj.getMatrixAt(i, tempMatrix);
        worldMatrix.multiplyMatrices(obj.matrixWorld, tempMatrix);
        const b = geomBox.clone().applyMatrix4(worldMatrix);
        boxes.push({
          label: `${obj.name || "InstancedMesh"}#${i}`,
          color: hex,
          box: b,
          isSolid: matchesSolid(b),
        });
      }
    } else if (obj instanceof T.Mesh) {
      const hex = materialColorHex(obj.material);
      if (hex === null) return;
      obj.geometry.computeBoundingBox();
      const geomBox = obj.geometry.boundingBox;
      if (!geomBox) return;
      const b = geomBox.clone().applyMatrix4(obj.matrixWorld);
      boxes.push({
        label: obj.name || "Mesh",
        color: hex,
        box: b,
        isSolid: matchesSolid(b),
      });
    }
  });

  const issues: CoplanarBleedIssue[] = [];
  for (let i = 0; i < boxes.length; i++) {
    const a = boxes[i];
    const ah = a.box.max.y - a.box.min.y;
    if (ah > 1.2 || ah < 0.01) continue;

    for (let j = i + 1; j < boxes.length; j++) {
      const b = boxes[j];
      if (a.color === b.color) continue;
      const bh = b.box.max.y - b.box.min.y;
      if (bh > 1.2 || bh < 0.01) continue;

      const ox =
        Math.min(a.box.max.x, b.box.max.x) - Math.max(a.box.min.x, b.box.min.x);
      const oz =
        Math.min(a.box.max.z, b.box.max.z) - Math.max(a.box.min.z, b.box.min.z);
      if (ox <= 0.08 || oz <= 0.08) continue;

      const midX =
        (Math.max(a.box.min.x, b.box.min.x) +
          Math.min(a.box.max.x, b.box.max.x)) /
        2;
      const midZ =
        (Math.max(a.box.min.z, b.box.min.z) +
          Math.min(a.box.max.z, b.box.max.z)) /
        2;

      // 1. Coplanar top faces of two overlapping boxes with different colors
      if (
        Math.abs(a.box.max.y - b.box.max.y) < 0.004 &&
        Math.min(a.box.max.y, b.box.max.y) -
          Math.max(a.box.min.y, b.box.min.y) >
          0.02
      ) {
        issues.push({
          kind: "coplanar-same-face",
          message: `Coplanar top surfaces at y=${a.box.max.y.toFixed(3)} between ${a.label} and ${b.label}`,
          point: { x: midX, y: a.box.max.y, z: midZ },
        });
      }

      // 2. Micro-gap (0.5mm - 5mm) between stacked thin layers or thin blanket over full mattress
      const upper = a.box.min.y >= b.box.min.y ? a : b;
      const lower = upper === a ? b : a;
      const upperH = upper.box.max.y - upper.box.min.y;
      const lowerH = lower.box.max.y - lower.box.min.y;
      const gap = upper.box.min.y - lower.box.max.y;

      if (gap > 0.0005 && gap < 0.006 && upperH <= 0.15) {
        issues.push({
          kind: "micro-gap-bleed",
          message: `Micro-gap (${(gap * 1000).toFixed(1)}mm) between ${upper.label} and underlying ${lower.label} causes depth-buffer bleed`,
          point: { x: midX, y: upper.box.min.y, z: midZ },
        });
      }

      // 3. Misaligned thin bedding/pad resting on a solid bunk frame but overhanging > 0.35m into mid-air
      if (
        Math.abs(gap) < 0.006 &&
        !upper.isSolid &&
        lower.isSolid &&
        upperH <= 0.16 &&
        lowerH >= 0.35 &&
        lowerH <= 0.65
      ) {
        const upperW = upper.box.max.x - upper.box.min.x;
        const upperD = upper.box.max.z - upper.box.min.z;
        const lowerW = lower.box.max.x - lower.box.min.x;
        const lowerD = lower.box.max.z - lower.box.min.z;
        if (
          upperW <= 4.0 &&
          upperD <= 4.0 &&
          lowerW <= 4.0 &&
          lowerD <= 4.0 &&
          (ox < upperW - 0.35 || oz < upperD - 0.35)
        ) {
          issues.push({
            kind: "misaligned-overlay",
            message: `Overlay ${upper.label} overhangs supporting frame ${lower.label} (overlap ${ox.toFixed(2)}x${oz.toFixed(2)}m vs size ${upperW.toFixed(2)}x${upperD.toFixed(2)}m)`,
            point: { x: midX, y: upper.box.min.y, z: midZ },
          });
        }
      }
    }
  }
  return issues;
}
