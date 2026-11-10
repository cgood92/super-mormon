import * as THREE from "three";
import { type ApostleRacer, createApostleFaceTexture } from "./roster";
import type { KartPhysics } from "./physics";

export class KartVisualModel {
  public readonly group = new THREE.Group();
  public readonly racer: ApostleRacer;

  // Moving parts
  private wheels: THREE.Mesh[] = [];
  private frontWheelsGroup: THREE.Group[] = [];
  private steeringWheel: THREE.Group | null = null;
  private headMesh: THREE.Mesh | null = null;
  private hairMesh: THREE.Group | null = null;

  // Particle & FX Meshes
  private driftSparks: THREE.Points | null = null;
  private exhaustFlames: THREE.Mesh[] = [];
  private starAura: THREE.Mesh | null = null;
  private faceTexture: THREE.CanvasTexture;

  constructor(racer: ApostleRacer) {
    this.racer = racer;
    this.faceTexture = createApostleFaceTexture(racer);
    this.buildKart();
    this.buildDriver();
    this.buildFX();
  }

  private buildKart() {
    const kartGroup = new THREE.Group();
    kartGroup.name = "kart-chassis";

    // Main Chassis Body
    const bodyGeo = new THREE.BoxGeometry(1.4, 0.42, 2.2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: this.racer.kartColor,
      metalness: 0.7,
      roughness: 0.25,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.42;
    body.castShadow = true;
    kartGroup.add(body);

    // Front Nose / Cowl
    const noseGeo = new THREE.ConeGeometry(0.7, 0.9, 4);
    const nose = new THREE.Mesh(noseGeo, bodyMat);
    nose.rotation.x = -Math.PI / 2;
    nose.rotation.y = Math.PI / 4;
    nose.position.set(0, 0.38, 1.35);
    kartGroup.add(nose);

    // Front Bumper with Trim Color
    const bumperGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.7, 8);
    const trimMat = new THREE.MeshStandardMaterial({
      color: this.racer.kartTrimColor,
      metalness: 0.9,
      roughness: 0.1,
    });
    const bumper = new THREE.Mesh(bumperGeo, trimMat);
    bumper.rotation.z = Math.PI / 2;
    bumper.position.set(0, 0.28, 1.6);
    kartGroup.add(bumper);

    // Side Pods
    [-0.75, 0.75].forEach((x) => {
      const podGeo = new THREE.BoxGeometry(0.3, 0.3, 1.4);
      const pod = new THREE.Mesh(podGeo, trimMat);
      pod.position.set(x, 0.36, 0);
      kartGroup.add(pod);
    });

    // Rear Spoiler
    const spoilerGeo = new THREE.BoxGeometry(1.6, 0.08, 0.35);
    const spoiler = new THREE.Mesh(spoilerGeo, trimMat);
    spoiler.position.set(0, 0.92, -1.05);
    kartGroup.add(spoiler);

    // Spoiler Struts
    [-0.5, 0.5].forEach((x) => {
      const strutGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.45);
      const strut = new THREE.Mesh(strutGeo, trimMat);
      strut.position.set(x, 0.7, -1.05);
      kartGroup.add(strut);
    });

    // Dual Chrome Exhaust Pipes
    [-0.3, 0.3].forEach((x) => {
      const exhaustGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.4, 8);
      const exhaustMat = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        metalness: 0.95,
        roughness: 0.05,
      });
      const pipe = new THREE.Mesh(exhaustGeo, exhaustMat);
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(x, 0.4, -1.2);
      kartGroup.add(pipe);
    });

    // Cockpit Seat
    const seatGeo = new THREE.BoxGeometry(0.8, 0.7, 0.15);
    const seatMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.8,
    });
    const seat = new THREE.Mesh(seatGeo, seatMat);
    seat.position.set(0, 0.65, -0.4);
    seat.rotation.x = 0.15;
    kartGroup.add(seat);

    // Steering Wheel Column & Wheel
    const column = new THREE.Group();
    column.position.set(0, 0.6, 0.35);
    column.rotation.x = -0.45;

    const wheelRimGeo = new THREE.TorusGeometry(0.24, 0.035, 8, 20);
    const wheelRim = new THREE.Mesh(wheelRimGeo, seatMat);
    column.add(wheelRim);
    this.steeringWheel = column;
    kartGroup.add(column);

    // 4 Kart Wheels with Rubber Tires & Silver Rims
    const wheelPositions = [
      { x: -0.85, z: 0.95, front: true },
      { x: 0.85, z: 0.95, front: true },
      { x: -0.9, z: -0.85, front: false },
      { x: 0.9, z: -0.85, front: false },
    ];

    const tireGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.3, 16);
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x1c1c1c,
      roughness: 0.9,
    });
    const rimGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.32, 12);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xeeeeee,
      metalness: 0.9,
      roughness: 0.1,
    });

    wheelPositions.forEach((wp) => {
      const wheelMount = new THREE.Group();
      wheelMount.position.set(wp.x, 0.35, wp.z);

      const wheelMesh = new THREE.Mesh(tireGeo, tireMat);
      wheelMesh.rotation.z = Math.PI / 2;

      const rimMesh = new THREE.Mesh(rimGeo, rimMat);
      wheelMesh.add(rimMesh);

      wheelMount.add(wheelMesh);
      kartGroup.add(wheelMount);

      this.wheels.push(wheelMesh);
      if (wp.front) {
        this.frontWheelsGroup.push(wheelMount);
      }
    });

    this.group.add(kartGroup);
  }

  private buildDriver() {
    const driver = new THREE.Group();
    driver.position.set(0, 0.58, -0.15);

    // Torso in Dark Business Suit
    const suitMat = new THREE.MeshStandardMaterial({
      color: this.racer.suitColor,
      roughness: 0.7,
    });
    const torsoGeo = new THREE.BoxGeometry(0.7, 0.75, 0.5);
    const torso = new THREE.Mesh(torsoGeo, suitMat);
    torso.position.y = 0.42;
    driver.add(torso);

    // White Shirt Collar
    const collarGeo = new THREE.BoxGeometry(0.3, 0.12, 0.1);
    const collarMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const collar = new THREE.Mesh(collarGeo, collarMat);
    collar.position.set(0, 0.74, 0.24);
    driver.add(collar);

    // Silk Necktie
    const tieGeo = new THREE.BoxGeometry(0.12, 0.4, 0.04);
    const tieMat = new THREE.MeshStandardMaterial({
      color: this.racer.tieColor,
      roughness: 0.3,
    });
    const tie = new THREE.Mesh(tieGeo, tieMat);
    tie.position.set(0, 0.52, 0.26);
    driver.add(tie);

    // Driver Arms holding steering wheel
    [-0.38, 0.38].forEach((side) => {
      const armGeo = new THREE.CylinderGeometry(0.1, 0.09, 0.65, 8);
      const arm = new THREE.Mesh(armGeo, suitMat);
      arm.position.set(side, 0.55, 0.18);
      arm.rotation.x = Math.PI / 3;
      arm.rotation.z = -Math.sign(side) * 0.25;
      driver.add(arm);

      // Hands on steering wheel
      const handGeo = new THREE.SphereGeometry(0.08, 8, 8);
      const skinColor = new THREE.Color(this.racer.skinTone);
      const handMat = new THREE.MeshStandardMaterial({ color: skinColor });
      const hand = new THREE.Mesh(handGeo, handMat);
      hand.position.set(side * 0.55, 0.65, 0.45);
      driver.add(hand);
    });

    // 3D Head with custom Face Texture applied to the front face!
    const headGeo = new THREE.BoxGeometry(0.55, 0.65, 0.55);
    const skinColor = new THREE.Color(this.racer.skinTone);
    const sideMat = new THREE.MeshStandardMaterial({
      color: skinColor,
      roughness: 0.5,
    });
    const faceMat = new THREE.MeshStandardMaterial({
      map: this.faceTexture,
      roughness: 0.4,
    });

    // Multi-material head: Front (+Z) is face texture, others are skin
    const headMaterials = [
      sideMat, // +X right
      sideMat, // -X left
      sideMat, // +Y top
      sideMat, // -Y bottom
      faceMat, // +Z front face!
      sideMat, // -Z back
    ];
    const head = new THREE.Mesh(headGeo, headMaterials);
    head.position.set(0, 1.15, 0);
    this.headMesh = head;
    driver.add(head);

    // 3D Sculpted Hair Geometry
    this.build3DHair(head);

    this.group.add(driver);
  }

  private build3DHair(head: THREE.Mesh) {
    const hair = new THREE.Group();
    const hairColor = new THREE.Color(this.racer.hairColor);
    const hairMat = new THREE.MeshStandardMaterial({
      color: hairColor,
      roughness: 0.6,
    });

    if (this.racer.hairStyle === "pompadour") {
      // President Uchtdorf's iconic voluminous silver pompadour!
      const quiffGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.6, 12);
      const quiff = new THREE.Mesh(quiffGeo, hairMat);
      quiff.rotation.z = Math.PI / 2;
      quiff.rotation.x = -0.3;
      quiff.position.set(0, 0.42, 0.08);
      hair.add(quiff);

      const sideHair = new THREE.Mesh(
        new THREE.BoxGeometry(0.62, 0.35, 0.58),
        hairMat,
      );
      sideHair.position.set(0, 0.15, -0.05);
      hair.add(sideHair);
    } else if (
      this.racer.hairStyle === "bald-top" ||
      this.racer.hairStyle === "tall-bald"
    ) {
      // Oaks & Eyring: Bald dome on top with side curls
      const sideHair = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.3, 0.56),
        hairMat,
      );
      sideHair.position.set(0, 0.05, -0.05);
      hair.add(sideHair);
    } else {
      // Full parted or swept hair
      const topHair = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.2, 0.58),
        hairMat,
      );
      topHair.position.set(0, 0.34, 0);
      hair.add(topHair);

      const backHair = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.45, 0.2),
        hairMat,
      );
      backHair.position.set(0, 0.1, -0.25);
      hair.add(backHair);
    }

    // 3D Spectacle Frames
    if (this.racer.hasGlasses) {
      const glassesColor =
        this.racer.glassesColor === "#silver"
          ? 0xcccccc
          : this.racer.glassesColor === "#d4af37"
            ? 0xd4af37
            : 0x222222;
      const glassesMat = new THREE.MeshStandardMaterial({
        color: glassesColor,
        metalness: 0.8,
        roughness: 0.2,
      });

      [-0.14, 0.14].forEach((x) => {
        const frameGeo = new THREE.TorusGeometry(0.08, 0.015, 6, 12);
        const frame = new THREE.Mesh(frameGeo, glassesMat);
        frame.position.set(x, 0.04, 0.3);
        hair.add(frame);
      });
      // Bridge
      const bridgeGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.1, 6);
      const bridge = new THREE.Mesh(bridgeGeo, glassesMat);
      bridge.rotation.z = Math.PI / 2;
      bridge.position.set(0, 0.04, 0.3);
      hair.add(bridge);
    }

    this.hairMesh = hair;
    head.add(hair);
  }

  private buildFX() {
    // Mini-Turbo rear wheel sparks
    const sparkCount = 30;
    const sparkGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(sparkCount * 3);
    for (let i = 0; i < sparkCount * 3; i++) positions[i] = 0;
    sparkGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const sparkMat = new THREE.PointsMaterial({
      color: 0x3498db, // blue default
      size: 0.28,
      transparent: true,
      opacity: 0.9,
    });
    this.driftSparks = new THREE.Points(sparkGeo, sparkMat);
    this.driftSparks.visible = false;
    this.group.add(this.driftSparks);

    // Boost Exhaust Flames
    const flameGeo = new THREE.ConeGeometry(0.16, 0.75, 8);
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0xff4500,
      transparent: true,
      opacity: 0.85,
    });
    [-0.3, 0.3].forEach((x) => {
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.rotation.x = -Math.PI / 2;
      flame.position.set(x, 0.4, -1.5);
      flame.visible = false;
      this.group.add(flame);
      this.exhaustFlames.push(flame);
    });

    // Star / Iron Rod Rainbow Golden Aura Sphere
    const auraGeo = new THREE.SphereGeometry(1.6, 16, 16);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.35,
      wireframe: true,
    });
    this.starAura = new THREE.Mesh(auraGeo, auraMat);
    this.starAura.visible = false;
    this.group.add(this.starAura);
  }

  public update(dt: number, physics: KartPhysics): void {
    // Position & Orientation
    this.group.position.copy(physics.position);
    this.group.position.y = physics.y;

    // Heading Yaw + Drift Angle + Spinout
    const totalYaw = physics.yaw + physics.driftAngle + physics.spinoutAngle;
    this.group.rotation.set(0, 0, 0);
    this.group.rotation.y = totalYaw;
    this.group.rotation.x = physics.pitch;
    this.group.rotation.z = physics.roll;

    // Scale (for Lightning / shrunk state)
    const scale = physics.isShrunk ? 0.55 : 1.0;
    this.group.scale.set(scale, scale, scale);

    // Roll wheels with speed
    const rollAngle = (physics.speed * dt) / 0.35;
    this.wheels.forEach((w) => {
      w.rotation.x += rollAngle;
    });

    // Steer front wheels & steering wheel
    const steerAngle = physics.isDrifting ? -physics.driftDirection * 0.4 : 0;
    this.frontWheelsGroup.forEach((mount) => {
      mount.rotation.y = steerAngle;
    });
    if (this.steeringWheel) {
      this.steeringWheel.rotation.z = steerAngle * 1.5;
    }

    // Drift Sparks FX
    if (physics.isDrifting && physics.miniTurboTier > 0 && this.driftSparks) {
      this.driftSparks.visible = true;
      const sparkColor =
        physics.miniTurboTier === 1
          ? 0x3498db // Blue
          : physics.miniTurboTier === 2
            ? 0xe67e22 // Orange
            : 0x9b59b6; // Purple
      (this.driftSparks.material as THREE.PointsMaterial).color.setHex(
        sparkColor,
      );

      // Animate spark particles around rear wheels
      const posAttr = this.driftSparks.geometry.getAttribute(
        "position",
      ) as THREE.BufferAttribute;
      const rearX = physics.driftDirection * 0.9;
      for (let i = 0; i < posAttr.count; i++) {
        posAttr.setXYZ(
          i,
          rearX + (Math.random() - 0.5) * 0.4,
          0.35 + (Math.random() - 0.5) * 0.3,
          -0.85 - Math.random() * 0.8,
        );
      }
      posAttr.needsUpdate = true;
    } else if (this.driftSparks) {
      this.driftSparks.visible = false;
    }

    // Exhaust Flames FX (during active boost)
    const isBoosting = physics.boostTime > 0;
    this.exhaustFlames.forEach((flame) => {
      flame.visible = isBoosting;
      if (isBoosting) {
        const flameScale = 0.8 + Math.random() * 0.6;
        flame.scale.set(flameScale, flameScale, flameScale);
      }
    });

    // Invincible Aura FX
    if (this.starAura) {
      this.starAura.visible = physics.isInvincible;
      if (physics.isInvincible) {
        this.starAura.rotation.y += dt * 8.0;
        const rainbowHue = (Date.now() % 2000) / 2000;
        (this.starAura.material as THREE.MeshBasicMaterial).color.setHSL(
          rainbowHue,
          1.0,
          0.6,
        );
      }
    }
  }

  public dispose(): void {
    this.faceTexture.dispose();
  }
}
