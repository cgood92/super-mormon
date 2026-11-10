import * as THREE from "three";
import type { KartPhysics } from "./physics";
import type { KartAudio } from "./audio";

export type KartItemType =
  | "green-jello"
  | "funeral-potatoes"
  | "angel-moroni"
  | "ctr-ring"
  | "swig-cookie"
  | "iron-rod"
  | "conference-chimes";

export type ActiveProjectile = {
  mesh: THREE.Group;
  type: KartItemType;
  ownerId: string;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  target?: KartPhysics;
  bouncesRemaining: number;
  lifetime: number;
  update: (dt: number) => boolean; // return false to remove
};

export type TrackItemBox = {
  mesh: THREE.Group;
  center: THREE.Vector3;
  respawnTimer: number;
  active: boolean;
};

export class KartItemSystem {
  public projectiles: ActiveProjectile[] = [];
  public itemBoxes: TrackItemBox[] = [];
  public readonly scene: THREE.Group = new THREE.Group();
  private readonly audio: KartAudio;

  constructor(audio: KartAudio) {
    this.audio = audio;
  }

  public createItemBox(x: number, y: number, z: number): TrackItemBox {
    const group = new THREE.Group();
    group.position.set(x, y + 1.2, z);

    // Question / Mystery Cube
    const boxGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
    const boxMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffa500,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.8,
      transparent: true,
      opacity: 0.88,
    });
    const cube = new THREE.Mesh(boxGeo, boxMat);
    cube.name = "cube";
    group.add(cube);

    // Glowing question mark / Liahona rings
    const ringGeo = new THREE.TorusGeometry(0.9, 0.06, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const ring1 = new THREE.Mesh(ringGeo, ringMat);
    ring1.rotation.x = Math.PI / 2;
    group.add(ring1);

    const ring2 = ring1.clone();
    ring2.rotation.y = Math.PI / 2;
    group.add(ring2);

    this.scene.add(group);
    const box: TrackItemBox = {
      mesh: group,
      center: new THREE.Vector3(x, y + 1.2, z),
      respawnTimer: 0,
      active: true,
    };
    this.itemBoxes.push(box);
    return box;
  }

  public getRandomItemForRank(rank: number, totalRacers: number): KartItemType {
    const normalizedRank = rank / totalRacers; // 0.0 (1st) to 1.0 (last)
    const roll = Math.random();

    if (normalizedRank <= 0.2) {
      // 1st / 2nd place
      if (roll < 0.45) return "green-jello";
      if (roll < 0.85) return "ctr-ring";
      return "swig-cookie";
    } else if (normalizedRank <= 0.5) {
      // Mid pack
      if (roll < 0.35) return "funeral-potatoes";
      if (roll < 0.65) return "green-jello";
      if (roll < 0.9) return "swig-cookie";
      return "ctr-ring";
    } else if (normalizedRank <= 0.8) {
      // Rear pack
      if (roll < 0.4) return "swig-cookie";
      if (roll < 0.7) return "funeral-potatoes";
      if (roll < 0.9) return "iron-rod";
      return "angel-moroni";
    } else {
      // Last places: Catch-up super weapons!
      if (roll < 0.35) return "angel-moroni";
      if (roll < 0.65) return "iron-rod";
      if (roll < 0.85) return "conference-chimes";
      return "swig-cookie";
    }
  }

  public useItem(
    item: KartItemType,
    user: KartPhysics,
    allRacers: KartPhysics[],
    trackWaypoints: THREE.Vector3[],
  ): void {
    switch (item) {
      case "swig-cookie":
        this.audio.playBoost();
        user.applyBoost(1.7, 2.8);
        break;

      case "iron-rod":
        this.audio.playTrumpetFanfare();
        user.triggerInvincible(8.0);
        break;

      case "conference-chimes":
        this.audio.playLapChime(true);
        allRacers.forEach((racer) => {
          if (racer !== user && !racer.isInvincible) {
            racer.triggerShrink();
          }
        });
        break;

      case "green-jello":
        this.spawnGreenJello(user);
        break;

      case "funeral-potatoes":
        this.spawnFuneralPotatoes(user, allRacers);
        break;

      case "angel-moroni":
        this.spawnAngelMoroni(user, allRacers, trackWaypoints);
        break;

      case "ctr-ring":
        this.spawnCtrRing(user);
        break;
    }
  }

  // --- ITEM SPAWNERS ---

  private spawnGreenJello(user: KartPhysics) {
    this.audio.playThrow();
    const group = new THREE.Group();

    // Wobbly lime Jell-O bowl
    const jelloGeo = new THREE.CylinderGeometry(0.55, 0.4, 0.45, 16);
    const jelloMat = new THREE.MeshStandardMaterial({
      color: 0x2ecc71,
      emissive: 0x27ae60,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.85,
      roughness: 0.1,
    });
    const jelloMesh = new THREE.Mesh(jelloGeo, jelloMat);
    group.add(jelloMesh);

    // Grated carrot specks inside!
    const speckMat = new THREE.MeshBasicMaterial({ color: 0xe67e22 });
    for (let i = 0; i < 6; i++) {
      const carrot = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.08, 0.08),
        speckMat,
      );
      carrot.position.set(
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.25,
        (Math.random() - 0.5) * 0.4,
      );
      group.add(carrot);
    }

    const spawnPos = user.position
      .clone()
      .add(user.forward.clone().multiplyScalar(2.0));
    spawnPos.y += 0.4;
    group.position.copy(spawnPos);
    this.scene.add(group);

    const speed = 42.0;
    const velocity = user.forward.clone().multiplyScalar(speed);

    this.projectiles.push({
      mesh: group,
      type: "green-jello",
      ownerId: user.racer.id,
      position: spawnPos,
      velocity,
      bouncesRemaining: 4,
      lifetime: 8.0,
      update: (dt) => {
        group.rotation.y += dt * 6.0;
        spawnPos.addScaledVector(velocity, dt);
        group.position.copy(spawnPos);
        return true;
      },
    });
  }

  private spawnFuneralPotatoes(user: KartPhysics, allRacers: KartPhysics[]) {
    this.audio.playThrow();
    const group = new THREE.Group();

    // Hot casserole dish
    const dishGeo = new THREE.BoxGeometry(0.8, 0.35, 0.6);
    const dishMat = new THREE.MeshStandardMaterial({
      color: 0xf1c40f,
      roughness: 0.4,
    });
    const dish = new THREE.Mesh(dishGeo, dishMat);
    group.add(dish);

    // Crunchy Cornflake & Cheddar cheese topping!
    const cheeseGeo = new THREE.BoxGeometry(0.74, 0.1, 0.54);
    const cheeseMat = new THREE.MeshStandardMaterial({
      color: 0xd35400,
      emissive: 0xe67e22,
      emissiveIntensity: 0.7,
    });
    const cheese = new THREE.Mesh(cheeseGeo, cheeseMat);
    cheese.position.y = 0.18;
    group.add(cheese);

    const spawnPos = user.position
      .clone()
      .add(user.forward.clone().multiplyScalar(2.2));
    spawnPos.y += 0.5;
    group.position.copy(spawnPos);
    this.scene.add(group);

    // Target the racer immediately ahead of user in distance traveled
    const aheadRacers = allRacers
      .filter(
        (r) =>
          r !== user && r.totalDistanceTraveled > user.totalDistanceTraveled,
      )
      .sort((a, b) => a.totalDistanceTraveled - b.totalDistanceTraveled);
    const target = aheadRacers[0] ?? allRacers.find((r) => r !== user);

    const velocity = user.forward.clone().multiplyScalar(28.0);

    this.projectiles.push({
      mesh: group,
      type: "funeral-potatoes",
      ownerId: user.racer.id,
      position: spawnPos,
      velocity,
      target,
      bouncesRemaining: 0,
      lifetime: 10.0,
      update: (dt) => {
        if (target) {
          const toTarget = target.position
            .clone()
            .sub(spawnPos)
            .setY(0)
            .normalize();
          velocity.lerp(toTarget.multiplyScalar(46.0), dt * 4.0);
        }
        spawnPos.addScaledVector(velocity, dt);
        group.position.copy(spawnPos);
        group.rotation.y = Math.atan2(velocity.x, velocity.z);
        return true;
      },
    });
  }

  private spawnAngelMoroni(
    user: KartPhysics,
    allRacers: KartPhysics[],
    waypoints: THREE.Vector3[],
  ) {
    this.audio.playTrumpetFanfare();
    const group = new THREE.Group();

    // Gleaming Golden Angel Moroni with raised trumpet!
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffa500,
      emissiveIntensity: 0.8,
      metalness: 0.95,
      roughness: 0.1,
    });

    // Body
    const bodyGeo = new THREE.ConeGeometry(0.35, 1.3, 12);
    const bodyMesh = new THREE.Mesh(bodyGeo, goldMat);
    bodyMesh.position.y = 0.65;
    group.add(bodyMesh);

    // Head
    const headGeo = new THREE.SphereGeometry(0.2, 12, 12);
    const headMesh = new THREE.Mesh(headGeo, goldMat);
    headMesh.position.y = 1.4;
    group.add(headMesh);

    // Golden Trumpet
    const trumpetGeo = new THREE.CylinderGeometry(0.12, 0.03, 0.9, 12);
    const trumpetMesh = new THREE.Mesh(trumpetGeo, goldMat);
    trumpetMesh.rotation.x = Math.PI / 2.6;
    trumpetMesh.position.set(0, 1.45, 0.45);
    group.add(trumpetMesh);

    const spawnPos = user.position.clone().add(new THREE.Vector3(0, 4.0, 0));
    group.position.copy(spawnPos);
    this.scene.add(group);

    // Target the overall 1st place leader!
    const leader = [...allRacers].sort(
      (a, b) => b.totalDistanceTraveled - a.totalDistanceTraveled,
    )[0];

    let diveMode = false;
    let hoverTimer = 0.8;

    this.projectiles.push({
      mesh: group,
      type: "angel-moroni",
      ownerId: user.racer.id,
      position: spawnPos,
      velocity: new THREE.Vector3(0, 0, 0),
      target: leader,
      bouncesRemaining: 0,
      lifetime: 14.0,
      update: (dt) => {
        if (!leader) return false;
        group.rotation.y += dt * 5.0;

        if (!diveMode) {
          // Fly high above track towards leader
          const targetPos = leader.position
            .clone()
            .add(new THREE.Vector3(0, 4.5, 0));
          const distToLeader = spawnPos.distanceTo(targetPos);
          if (distToLeader > 2.5) {
            const dir = targetPos.sub(spawnPos).normalize();
            spawnPos.addScaledVector(dir, 55.0 * dt);
          } else {
            // Hover directly over leader
            spawnPos.copy(targetPos);
            hoverTimer -= dt;
            if (hoverTimer <= 0) {
              diveMode = true;
            }
          }
        } else {
          // Dive straight down on 1st place leader!
          spawnPos.y -= 38.0 * dt;
          if (spawnPos.y <= leader.position.y + 0.3) {
            // Direct strike!
            this.audio.playExplosion();
            leader.triggerTumble();
            return false;
          }
        }
        group.position.copy(spawnPos);
        return true;
      },
    });
  }

  private spawnCtrRing(user: KartPhysics) {
    this.audio.playThrow();
    const group = new THREE.Group();

    // Large Green & Gold "Choose The Right" Ring
    const shieldGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.15, 6);
    const shieldMat = new THREE.MeshStandardMaterial({
      color: 0x16a085,
      emissive: 0x1abc9c,
      emissiveIntensity: 0.6,
      metalness: 0.5,
      roughness: 0.3,
    });
    const shield = new THREE.Mesh(shieldGeo, shieldMat);
    shield.rotation.x = Math.PI / 2;
    group.add(shield);

    // Golden CTR Lettering Decal
    const ringGeo = new THREE.TorusGeometry(0.42, 0.05, 8, 20);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.9,
      roughness: 0.1,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    group.add(ringMesh);

    // Drop directly behind user
    const spawnPos = user.position
      .clone()
      .sub(user.forward.clone().multiplyScalar(2.2));
    spawnPos.y = user.position.y + 0.25;
    group.position.copy(spawnPos);
    this.scene.add(group);

    this.projectiles.push({
      mesh: group,
      type: "ctr-ring",
      ownerId: user.racer.id,
      position: spawnPos,
      velocity: new THREE.Vector3(0, 0, 0),
      bouncesRemaining: 0,
      lifetime: 35.0, // sits on track
      update: (dt) => {
        group.rotation.y += dt * 1.8;
        return true;
      },
    });
  }

  public update(dt: number, allRacers: KartPhysics[]): void {
    // Animate item boxes
    this.itemBoxes.forEach((box) => {
      if (box.active) {
        box.mesh.rotation.y += dt * 1.8;
        box.mesh.rotation.x += dt * 0.8;

        // Check if any racer drove through
        for (const racer of allRacers) {
          if (racer.position.distanceTo(box.center) < 1.9) {
            box.active = false;
            box.mesh.visible = false;
            box.respawnTimer = 4.5;
            this.audio.playItemBoxHit();
            break;
          }
        }
      } else {
        box.respawnTimer -= dt;
        if (box.respawnTimer <= 0) {
          box.active = true;
          box.mesh.visible = true;
        }
      }
    });

    // Update active projectiles & collisions
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.lifetime -= dt;
      const alive = p.update(dt) && p.lifetime > 0;

      if (!alive) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
        continue;
      }

      // Check collision with karts
      for (const racer of allRacers) {
        // Can't hit own projectile during first 0.3s
        if (racer.racer.id === p.ownerId && p.lifetime > 7.7) continue;

        const dist = racer.position.distanceTo(p.position);
        if (dist < 1.7) {
          // Hit!
          if (p.type === "green-jello" || p.type === "ctr-ring") {
            this.audio.playSpinOut();
            racer.triggerSpinout();
          } else if (
            p.type === "funeral-potatoes" ||
            p.type === "angel-moroni"
          ) {
            this.audio.playExplosion();
            racer.triggerTumble();
          }

          this.scene.remove(p.mesh);
          this.projectiles.splice(i, 1);
          break;
        }
      }
    }
  }

  public dispose(): void {
    this.itemBoxes.forEach((b) => this.scene.remove(b.mesh));
    this.projectiles.forEach((p) => this.scene.remove(p.mesh));
    this.itemBoxes = [];
    this.projectiles = [];
  }
}
