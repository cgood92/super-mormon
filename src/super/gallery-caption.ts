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
  sceneryBox(
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
