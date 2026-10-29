import * as THREE from "three";
import { label, palette } from "./art";
import type { Solid } from "./physics";
import { sceneryBox } from "./scenery";

/** Story titles have their own plaque below the frame, never an overlay on the art. */
export function paintingCaption(
  group: THREE.Group,
  solids: Solid[],
  title: string,
  x: number,
  floor: number,
  frontZ: number,
  width: number,
): THREE.Mesh {
  const height = 0.4;
  const centerY = floor + 0.25;
  const depth = 0.18;
  const backing = sceneryBox(
    group,
    solids,
    new THREE.MeshBasicMaterial({ color: palette.indigo }),
    {
      x,
      y: centerY - height / 2,
      z: frontZ - depth / 2,
      w: width,
      h: height,
      d: depth,
    },
    "story caption backing",
  );
  // Exhibit groups can rotate onto side walls. Physics always consumes world AABBs.
  backing.updateWorldMatrix(true, false);
  const bounds = new THREE.Box3().setFromObject(backing);
  const support = solids[solids.length - 1];
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  Object.assign(support, {
    x: center.x,
    y: bounds.min.y,
    z: center.z,
    w: size.x,
    h: size.y,
    d: size.z,
  });
  const caption = label(
    group,
    title,
    x,
    centerY,
    frontZ + 0.006,
    width,
    height,
  );
  (caption.material as THREE.MeshBasicMaterial).side = THREE.FrontSide;
  return caption;
}
