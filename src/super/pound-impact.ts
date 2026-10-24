import * as T from "three";

/** One reusable, short-lived dust pulse per world; no physics surface or allocations on impact. */
export function createPoundImpact(scene: T.Scene) {
  const group = new T.Group();
  group.name = "Ground pound dust";
  group.visible = false;
  scene.add(group);
  const mat = new T.MeshBasicMaterial({
    color: 0xe3d3ad,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const geometry = new T.SphereGeometry(1, 8, 5);
  const puffs = Array.from({ length: 8 }, () => {
    const mesh = new T.Mesh(geometry, mat);
    group.add(mesh);
    return mesh;
  });
  let age = 1,
    disposed = false;
  return {
    trigger(point: { x: number; y: number; z: number }) {
      if (disposed) return;
      group.position.set(point.x, point.y + 0.07, point.z);
      age = 0;
      group.visible = true;
    },
    update(dt: number) {
      age += Math.max(0, dt);
      group.visible = !disposed && age < 0.42;
      if (!group.visible) return;
      const t = age / 0.42;
      mat.opacity = (1 - t) * 0.4;
      puffs.forEach((mesh, i) => {
        const angle = (i * Math.PI) / 4;
        const radius = 0.18 + t * 0.95;
        mesh.position.set(
          Math.cos(angle) * radius,
          Math.sin(t * Math.PI) * 0.11,
          Math.sin(angle) * radius,
        );
        mesh.scale.setScalar(0.09 + t * 0.15);
        mesh.scale.y *= 0.5;
      });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      group.removeFromParent();
      geometry.dispose();
      mat.dispose();
    },
  };
}
