import * as T from "three";

export type LocomotionParticles = {
  footstep(x: number, y: number, z: number): void;
  skid(x: number, y: number, z: number, vx: number, vz: number): void;
  landingRing(x: number, y: number, z: number, severity: number): void;
  poundShockwave(x: number, y: number, z: number): void;
  update(dt: number): void;
  dispose(): void;
};

type Puff = {
  mesh: T.Mesh<T.SphereGeometry, T.MeshBasicMaterial>;
  active: boolean;
  age: number;
  lifespan: number;
  vx: number;
  vy: number;
  vz: number;
  startScale: number;
  endScale: number;
  startOpacity: number;
};

const POOL_SIZE = 36;

/** Reusable step and impact particle FX pool: footfalls, skid friction smoke, and landing rings. */
export function createLocomotionParticles(scene: T.Scene): LocomotionParticles {
  const group = new T.Group();
  group.name = "Locomotion particles";
  scene.add(group);

  const geometry = new T.SphereGeometry(1, 7, 5);
  const puffs: Puff[] = [];

  for (let i = 0; i < POOL_SIZE; i++) {
    const mat = new T.MeshBasicMaterial({
      color: 0xe3d3ad,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const mesh = new T.Mesh(geometry, mat);
    mesh.visible = false;
    group.add(mesh);
    puffs.push({
      mesh,
      active: false,
      age: 0,
      lifespan: 0.3,
      vx: 0,
      vy: 0,
      vz: 0,
      startScale: 0.08,
      endScale: 0.22,
      startOpacity: 0.45,
    });
  }

  let disposed = false;

  function spawn(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    startScale: number,
    endScale: number,
    lifespan: number,
    startOpacity: number,
  ) {
    if (disposed) return;
    // Find inactive puff or oldest puff
    let oldest = puffs[0];
    let candidate = puffs.find((p) => !p.active);
    if (!candidate) {
      for (const p of puffs) {
        if (p.age > oldest.age) oldest = p;
      }
      candidate = oldest;
    }
    candidate.active = true;
    candidate.age = 0;
    candidate.lifespan = Math.max(0.05, lifespan);
    candidate.vx = vx;
    candidate.vy = vy;
    candidate.vz = vz;
    candidate.startScale = startScale;
    candidate.endScale = endScale;
    candidate.startOpacity = startOpacity;
    candidate.mesh.position.set(x, y, z);
    candidate.mesh.scale.set(startScale, startScale * 0.65, startScale);
    candidate.mesh.material.opacity = startOpacity;
    candidate.mesh.visible = true;
  }

  return {
    footstep(x: number, y: number, z: number) {
      if (disposed) return;
      spawn(
        x,
        y + 0.04,
        z,
        (Math.random() - 0.5) * 0.35,
        0.35 + Math.random() * 0.25,
        (Math.random() - 0.5) * 0.35,
        0.05,
        0.15,
        0.2,
        0.35,
      );
    },
    skid(x: number, y: number, z: number, vx: number, vz: number) {
      if (disposed) return;
      const speed = Math.hypot(vx, vz);
      const backX = speed > 0.001 ? -vx / speed : 0;
      const backZ = speed > 0.001 ? -vz / speed : 0;
      for (let i = 0; i < 2; i++) {
        spawn(
          x + (Math.random() - 0.5) * 0.2,
          y + 0.05,
          z + (Math.random() - 0.5) * 0.2,
          backX * (0.8 + Math.random() * 0.8) + (Math.random() - 0.5) * 0.4,
          0.3 + Math.random() * 0.3,
          backZ * (0.8 + Math.random() * 0.8) + (Math.random() - 0.5) * 0.4,
          0.07,
          0.2,
          0.26,
          0.42,
        );
      }
    },
    landingRing(x: number, y: number, z: number, severity: number) {
      if (disposed) return;
      const count = Math.round(6 + severity * 6);
      const radialSpeed = 1.1 + severity * 2.2;
      for (let i = 0; i < count; i++) {
        const angle = (i * 2 * Math.PI) / count + (Math.random() - 0.5) * 0.2;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        spawn(
          x + cos * 0.15,
          y + 0.06,
          z + sin * 0.15,
          cos * radialSpeed,
          0.15 + severity * 0.35,
          sin * radialSpeed,
          0.07 + severity * 0.05,
          0.2 + severity * 0.22,
          0.28 + severity * 0.15,
          0.38 + severity * 0.25,
        );
      }
    },
    poundShockwave(x: number, y: number, z: number) {
      if (disposed) return;
      const count = 12;
      const radialSpeed = 3.2;
      for (let i = 0; i < count; i++) {
        const angle = (i * 2 * Math.PI) / count;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        spawn(
          x + cos * 0.18,
          y + 0.07,
          z + sin * 0.18,
          cos * radialSpeed,
          0.25,
          sin * radialSpeed,
          0.12,
          0.42,
          0.42,
          0.55,
        );
      }
    },
    update(dt: number) {
      if (disposed) return;
      dt = Math.max(0, Math.min(dt, 0.1));
      for (const p of puffs) {
        if (!p.active) continue;
        p.age += dt;
        if (p.age >= p.lifespan) {
          p.active = false;
          p.mesh.visible = false;
          continue;
        }
        const t = p.age / p.lifespan;
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        p.vy = Math.max(-0.2, p.vy - 1.2 * dt);
        const scale = p.startScale + (p.endScale - p.startScale) * t;
        p.mesh.scale.set(scale, scale * 0.65, scale);
        p.mesh.material.opacity = p.startOpacity * (1 - t);
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      group.removeFromParent();
      geometry.dispose();
      for (const p of puffs) {
        p.mesh.material.dispose();
      }
      puffs.length = 0;
    },
  };
}
