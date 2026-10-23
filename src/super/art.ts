import { softBoxGeometry, palmFrondGeometry } from "./soft-geometry";
import * as THREE from "three";
import { layoutSign } from "./sign-layout";

export const palette = {
  limestone: 0xd7c6a2,
  paleStone: 0xe9dcc0,
  sandstone: 0xb99a72,
  clay: 0xa97554,
  darkClay: 0x86543f,
  timber: 0x654936,
  brass: 0xc7a66a,
  indigo: 0x314c64,
  turquoise: 0x407b78,
  leaf: 0x607852,
  night: 0x182b3e,
} as const;

export function material(
  color: THREE.ColorRepresentation,
  roughness = 0.9,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness });
}

export function box(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  color: THREE.ColorRepresentation,
  name = "",
): THREE.Mesh {
  const mesh = new THREE.Mesh(softBoxGeometry(w, h, d, name), material(color));
  mesh.position.set(x, y + h / 2, z);
  mesh.scale.set(w, h, d);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = name;
  group.add(mesh);
  return mesh;
}

export function column(
  group: THREE.Group,
  x: number,
  z: number,
  height: number,
  radius = 0.34,
  color: THREE.ColorRepresentation = palette.paleStone,
): void {
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.82, radius, height, 10),
    material(color),
  );
  shaft.position.set(x, height / 2, z);
  shaft.castShadow = true;
  shaft.receiveShadow = true;
  group.add(shaft);
  box(group, x, 0, z, radius * 2.8, 0.16, radius * 2.8, color);
  box(group, x, height - 0.17, z, radius * 2.8, 0.2, radius * 2.8, color);
}

export function vessel(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
  scale = 1,
  color: THREE.ColorRepresentation = palette.clay,
): void {
  const mat = material(color);
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.21 * scale, 0.28 * scale, 0.08 * scale, 10),
    mat,
  );
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.32 * scale, 10, 7),
    mat,
  );
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.17 * scale, 0.19 * scale, 0.24 * scale, 10),
    mat,
  );
  base.position.set(x, y + 0.04 * scale, z);
  body.position.set(x, y + 0.31 * scale, z);
  body.scale.y = 1.18;
  neck.position.set(x, y + 0.69 * scale, z);
  for (const part of [base, body, neck]) {
    part.castShadow = true;
    group.add(part);
  }
}

export function datePalm(
  group: THREE.Group,
  x: number,
  z: number,
  height = 5,
): void {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.23, height, 8),
    material(palette.timber),
  );
  trunk.position.set(x, height / 2, z);
  trunk.rotation.z = 0.035;
  trunk.castShadow = true;
  group.add(trunk);
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const leaf = new THREE.Mesh(palmFrondGeometry(), material(palette.leaf, 1));
    leaf.position.set(x, height, z);
    leaf.rotation.y = angle;
    (leaf.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    leaf.castShadow = true;
    group.add(leaf);
  }
}

export function oilLamp(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
): void {
  const bowl = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 8, 5),
    material(palette.clay),
  );
  bowl.scale.y = 0.34;
  bowl.position.set(x, y + 0.08, z);
  group.add(bowl);
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.06, 0.18, 6),
    new THREE.MeshBasicMaterial({ color: 0xffcd70 }),
  );
  flame.position.set(x, y + 0.23, z);
  group.add(flame);
  const light = new THREE.PointLight(0xffba65, 0.65, 6);
  light.position.set(x, y + 0.3, z);
  group.add(light);
}

export function banner(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
  color: number = palette.indigo,
  height = 2.5,
): void {
  const cloth = box(group, x, y, z, 0.9, height, 0.05, color);
  cloth.castShadow = false;
  box(group, x, y + height - 0.08, z, 1.12, 0.1, 0.11, palette.timber);
}

export function label(
  group: THREE.Group,
  words: string,
  x: number,
  y: number,
  z: number,
  width = 3,
  height = 0.55,
): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(width, height);
  if (typeof document === "undefined") {
    const plaque = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        color: palette.indigo,
        side: THREE.DoubleSide,
      }),
    );
    plaque.position.set(x, y, z);
    plaque.name = "plaque";
    group.add(plaque);
    return plaque;
  }
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const layout = layoutSign(
    words,
    width,
    height,
    (text, size) => {
      ctx.font = `600 ${size}px Georgia, serif`;
      return ctx.measureText(text).width;
    },
    typeof window === "undefined" ? 1 : window.devicePixelRatio,
  );
  canvas.width = layout.canvasWidth;
  canvas.height = layout.canvasHeight;
  ctx.fillStyle = "#243a4a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#c7a66a";
  ctx.lineWidth = Math.max(1, Math.min(canvas.width, canvas.height) * 0.025);
  const inset = ctx.lineWidth * 1.5;
  ctx.strokeRect(
    inset,
    inset,
    canvas.width - 2 * inset,
    canvas.height - 2 * inset,
  );
  ctx.fillStyle = "#fff5df";
  ctx.font = `600 ${layout.fontSize}px Georgia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const line of layout.lines)
    ctx.fillText(line.text, canvas.width / 2, line.y);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }),
  );
  mesh.position.set(x, y, z);
  mesh.name = "plaque";
  group.add(mesh);
  return mesh;
}

export function painting(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
  file: string,
  tint: number,
): THREE.Mesh {
  box(group, x, y - 0.2, z + 0.08, 3.9, 4.9, 0.24, palette.brass);
  box(group, x, y - 0.2, z + 0.2, 3.55, 4.55, 0.12, 0x3f322e);
  const material = new THREE.MeshBasicMaterial({
    color: tint,
    side: THREE.DoubleSide,
  });
  const image = new THREE.Mesh(new THREE.PlaneGeometry(3.36, 4.36), material);
  let requested = false;
  let disposed = false;
  let texture: THREE.Texture | undefined;
  material.addEventListener("dispose", () => {
    disposed = true;
    texture?.dispose();
  });
  // Three calls this only for paintings inside the camera frustum.
  image.onBeforeRender = () => {
    if (requested || disposed || typeof document === "undefined") return;
    requested = true;
    texture = new THREE.TextureLoader().load(file, (loaded) => {
      if (disposed) {
        loaded.dispose();
        return;
      }
      loaded.colorSpace = THREE.SRGBColorSpace;
      material.map = loaded;
      material.needsUpdate = true;
    });
  };
  image.position.set(x, y + 2.07, z + 0.28);
  image.name = "portal-painting";
  group.add(image);
  return image;
}

export function ambient(
  scene: THREE.Scene,
  mode: "gallery" | "jerusalem" | "interior",
): void {
  scene.background = new THREE.Color(mode === "gallery" ? 0xd8e7ed : 0xc8d9dc);
  scene.fog = new THREE.Fog(
    scene.background,
    mode === "gallery" ? 46 : 58,
    mode === "gallery" ? 110 : 125,
  );
  const hemisphere = new THREE.HemisphereLight(
    0xfff5dd,
    0x667780,
    mode === "interior" ? 2.3 : 2.6,
  );
  scene.add(hemisphere);
  const sun = new THREE.DirectionalLight(
    0xffefd4,
    mode === "interior" ? 2.2 : 2.8,
  );
  sun.position.set(-18, 28, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -42;
  sun.shadow.camera.right = 42;
  sun.shadow.camera.top = 42;
  sun.shadow.camera.bottom = -42;
  sun.shadow.normalBias = 0.025;
  scene.add(sun);
  scene.add(sun.target);
}
