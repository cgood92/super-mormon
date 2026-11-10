import * as THREE from "three";
import type { KartItemSystem } from "./items";

export type TrackCheckpoint = {
  index: number;
  position: THREE.Vector3;
  tangent: THREE.Vector3;
  normal: THREE.Vector3;
  width: number;
};

export type BoostPad = {
  position: THREE.Vector3;
  rotation: number;
  radius: number;
};

export class KartTrack {
  public readonly scene = new THREE.Group();
  public readonly waypoints: THREE.Vector3[] = [];
  public readonly checkpoints: TrackCheckpoint[] = [];
  public readonly boostPads: BoostPad[] = [];
  public readonly trackWidth = 16.0; // 16 meters wide road

  constructor(itemSystem: KartItemSystem) {
    this.buildWaypoints();
    this.buildRoadMesh();
    this.buildCurbsAndBarriers();
    this.buildLandmarks();
    this.buildBoostPads();
    this.spawnItemBoxClusters(itemSystem);
  }

  private buildWaypoints() {
    // 3D circuit representing Conference Center, Rooftop Gardens, Temple Square & City Creek
    const rawNodes: [number, number, number][] = [
      // Start / Finish Line on North Temple
      [0, 0, 0],
      [15, 0, 25],
      [35, 1.5, 55],

      // East Ramp climbing Conference Center
      [55, 4.0, 90],
      [65, 8.5, 125],
      [60, 13.0, 160],

      // Rooftop Terrace Gardens (Elevation 16m)
      [40, 16.0, 185],
      [15, 16.0, 195],
      [-15, 16.0, 195],

      // Waterfall Hairpin Curve (Elevation 16m -> 14m)
      [-45, 15.0, 180],
      [-65, 13.0, 150],

      // West Terrace Cascade & Spiral Descent
      [-75, 9.0, 110],
      [-78, 5.0, 70],
      [-75, 2.0, 30],

      // Approach Temple Square
      [-70, 0.5, -10],
      [-65, 0.0, -50],

      // Salt Lake Temple Spire Straightaway
      [-60, 0.0, -90],
      [-50, 0.0, -130],

      // Tabernacle Oval Chicane
      [-25, 0.0, -150],
      [5, 0.0, -145],
      [30, 0.0, -125],

      // City Creek Skybridge Crossing (Elevation +2.5m)
      [45, 2.5, -95],
      [48, 2.5, -60],

      // Grandstand Final Sweeping Curve
      [35, 0.5, -25],
      [15, 0.0, -10],
    ];

    // Smooth Catmull-Rom spline interpolation
    const controlPoints = rawNodes.map(
      (p) => new THREE.Vector3(p[0], p[1], p[2]),
    );
    const curve = new THREE.CatmullRomCurve3(
      controlPoints,
      true,
      "centripetal",
      0.5,
    );

    const sampleCount = 60;
    for (let i = 0; i < sampleCount; i++) {
      const u = i / sampleCount;
      const pt = curve.getPointAt(u);
      this.waypoints.push(pt);

      const tangent = curve.getTangentAt(u).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      this.checkpoints.push({
        index: i,
        position: pt,
        tangent,
        normal,
        width: this.trackWidth,
      });
    }
  }

  private buildRoadMesh() {
    // Generate smooth ribbon mesh for the track asphalt
    const halfWidth = this.trackWidth * 0.5;
    const vertexCount = this.waypoints.length * 2;
    const positions = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);
    const indices: number[] = [];

    for (let i = 0; i < this.waypoints.length; i++) {
      const cp = this.checkpoints[i];
      const p = cp.position;
      const n = cp.normal;

      // Left edge
      const lx = p.x - n.x * halfWidth;
      const ly = p.y + 0.02;
      const lz = p.z - n.z * halfWidth;

      // Right edge
      const rx = p.x + n.x * halfWidth;
      const ry = p.y + 0.02;
      const rz = p.z + n.z * halfWidth;

      positions[i * 6] = lx;
      positions[i * 6 + 1] = ly;
      positions[i * 6 + 2] = lz;

      positions[i * 6 + 3] = rx;
      positions[i * 6 + 4] = ry;
      positions[i * 6 + 5] = rz;

      uvs[i * 4] = 0;
      uvs[i * 4 + 1] = i * 0.5;
      uvs[i * 4 + 2] = 1;
      uvs[i * 4 + 3] = i * 0.5;

      const next = (i + 1) % this.waypoints.length;
      const i0 = i * 2;
      const i1 = i * 2 + 1;
      const i2 = next * 2;
      const i3 = next * 2 + 1;

      indices.push(i0, i1, i2);
      indices.push(i1, i3, i2);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x222629,
      roughness: 0.85,
      metalness: 0.1,
    });
    const road = new THREE.Mesh(geo, roadMat);
    road.receiveShadow = true;
    this.scene.add(road);

    // Center Dashed Yellow Line
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xf1c40f });
    for (let i = 0; i < this.waypoints.length; i += 2) {
      const p = this.waypoints[i];
      const nextP = this.waypoints[(i + 1) % this.waypoints.length];
      const stripGeo = new THREE.BoxGeometry(
        0.3,
        0.04,
        p.distanceTo(nextP) * 0.5,
      );
      const strip = new THREE.Mesh(stripGeo, lineMat);
      strip.position
        .copy(p.clone().lerp(nextP, 0.5))
        .add(new THREE.Vector3(0, 0.03, 0));
      strip.lookAt(nextP);
      this.scene.add(strip);
    }
  }

  private buildCurbsAndBarriers() {
    const halfWidth = this.trackWidth * 0.5;
    const redMat = new THREE.MeshStandardMaterial({
      color: 0xeb4d4b,
      roughness: 0.5,
    });
    const whiteMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.5,
    });
    const guardMat = new THREE.MeshStandardMaterial({
      color: 0x95a5a6,
      metalness: 0.8,
      roughness: 0.2,
    });

    for (let i = 0; i < this.waypoints.length; i++) {
      const cp = this.checkpoints[i];
      const nextCp = this.checkpoints[(i + 1) % this.checkpoints.length];
      const dist = cp.position.distanceTo(nextCp.position);
      const isRed = i % 2 === 0;
      const curbMat = isRed ? redMat : whiteMat;

      [-1, 1].forEach((side) => {
        // Red and White Alternating Rumble Curbs
        const curbPos = cp.position
          .clone()
          .addScaledVector(cp.normal, side * (halfWidth + 0.4));
        curbPos.y += 0.08;
        const curbGeo = new THREE.BoxGeometry(0.8, 0.16, dist);
        const curb = new THREE.Mesh(curbGeo, curbMat);
        curb.position.copy(curbPos);
        curb.lookAt(
          nextCp.position
            .clone()
            .addScaledVector(nextCp.normal, side * (halfWidth + 0.4)),
        );
        this.scene.add(curb);

        // Guardrail Barriers
        const railPos = cp.position
          .clone()
          .addScaledVector(cp.normal, side * (halfWidth + 1.2));
        railPos.y += 0.5;
        const railGeo = new THREE.BoxGeometry(0.3, 0.75, dist);
        const rail = new THREE.Mesh(railGeo, guardMat);
        rail.position.copy(railPos);
        rail.lookAt(
          nextCp.position
            .clone()
            .addScaledVector(nextCp.normal, side * (halfWidth + 1.2)),
        );
        this.scene.add(rail);
      });
    }
  }

  private buildLandmarks() {
    // 1. Start / Finish Line Banner Arch ("GENERAL CONFERENCE 500")
    const startPos = this.waypoints[0];
    const startCp = this.checkpoints[0];
    const archGroup = new THREE.Group();
    archGroup.position.copy(startPos);

    // Arch Pillars
    [-1, 1].forEach((side) => {
      const pillarGeo = new THREE.BoxGeometry(1.2, 7.5, 1.2);
      const pillarMat = new THREE.MeshStandardMaterial({
        color: 0x333333,
        metalness: 0.7,
      });
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(side * (this.trackWidth * 0.5 + 1.5), 3.75, 0);
      archGroup.add(pillar);
    });

    // Checkered Banner Overhead
    const bannerGeo = new THREE.BoxGeometry(this.trackWidth + 4.0, 1.8, 0.5);
    const bannerMat = new THREE.MeshStandardMaterial({
      color: 0x1b365d,
      emissive: 0x0a192f,
      emissiveIntensity: 0.4,
    });
    const banner = new THREE.Mesh(bannerGeo, bannerMat);
    banner.position.set(0, 7.0, 0);
    archGroup.add(banner);

    // Text Canvas on Arch
    if (typeof document !== "undefined") {
      const canvas = document.createElement("canvas");
      canvas.width = 1024;
      canvas.height = 128;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#1b365d";
        ctx.fillRect(0, 0, 1024, 128);
        ctx.fillStyle = "#ffd700";
        ctx.font = "bold 56px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("🏁 GENERAL CONFERENCE 500 🏁", 512, 85);
      }
      const bannerTex = new THREE.CanvasTexture(canvas);
      const signMat = new THREE.MeshBasicMaterial({ map: bannerTex });
      const signMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(this.trackWidth + 3.8, 1.6),
        signMat,
      );
      signMesh.position.set(0, 7.0, 0.26);
      archGroup.add(signMesh);
    }

    // Checkered Finish Line Strip on ground
    const finishGeo = new THREE.BoxGeometry(this.trackWidth, 0.05, 2.0);
    const finishMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const finishLine = new THREE.Mesh(finishGeo, finishMat);
    finishLine.position.set(0, 0.04, 0);
    archGroup.add(finishLine);

    archGroup.lookAt(startPos.clone().add(startCp.tangent));
    this.scene.add(archGroup);

    // 2. The Salt Lake Temple Model (Granite spires & Golden Angel Moroni!)
    const templeGroup = new THREE.Group();
    templeGroup.position.set(-95, 0, -110);

    const graniteMat = new THREE.MeshStandardMaterial({
      color: 0xdcdde1,
      roughness: 0.8,
    });
    const templeBase = new THREE.Mesh(
      new THREE.BoxGeometry(28, 18, 42),
      graniteMat,
    );
    templeBase.position.y = 9;
    templeGroup.add(templeBase);

    // 6 Iconic Granite Spires (3 East, 3 West)
    const spireGeo = new THREE.ConeGeometry(2.2, 16, 6);
    const spirePositions = [
      { x: -11, z: -18, h: 26 },
      { x: 0, z: -18, h: 30, center: true }, // Main East Spire with Moroni!
      { x: 11, z: -18, h: 26 },
      { x: -11, z: 18, h: 25 },
      { x: 0, z: 18, h: 28 },
      { x: 11, z: 18, h: 25 },
    ];
    spirePositions.forEach((sp) => {
      const spire = new THREE.Mesh(spireGeo, graniteMat);
      spire.position.set(sp.x, sp.h, sp.z);
      templeGroup.add(spire);

      if (sp.center) {
        // Golden Angel Moroni gleaming on the highest spire!
        const moroniMat = new THREE.MeshStandardMaterial({
          color: 0xffd700,
          emissive: 0xffaa00,
          emissiveIntensity: 0.9,
          metalness: 0.95,
        });
        const statue = new THREE.Mesh(
          new THREE.CylinderGeometry(0.4, 0.8, 3.2, 8),
          moroniMat,
        );
        statue.position.set(sp.x, sp.h + 9.5, sp.z);
        templeGroup.add(statue);
      }
    });
    this.scene.add(templeGroup);

    // 3. The Salt Lake Tabernacle (Famous Dome)
    const tabernacleGroup = new THREE.Group();
    tabernacleGroup.position.set(-10, 0, -135);
    const domeGeo = new THREE.SphereGeometry(
      14,
      24,
      16,
      0,
      Math.PI * 2,
      0,
      Math.PI * 0.5,
    );
    const domeMat = new THREE.MeshStandardMaterial({
      color: 0x95a5a6,
      metalness: 0.7,
      roughness: 0.3,
    });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.y = 5;
    tabernacleGroup.add(dome);
    this.scene.add(tabernacleGroup);

    // 4. Conference Center Rooftop Waterfall
    const waterfallGroup = new THREE.Group();
    waterfallGroup.position.set(-45, 14, 180);
    const waterGeo = new THREE.PlaneGeometry(12, 16);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x00cec9,
      emissive: 0x81ecec,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.8,
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = Math.PI / 2.8;
    waterfallGroup.add(water);
    this.scene.add(waterfallGroup);

    // 5. Grandstand packed with cheering spectators
    const grandstand = new THREE.Group();
    grandstand.position.set(startPos.x + 18, 0, startPos.z - 15);
    for (let row = 0; row < 4; row++) {
      const bleacherGeo = new THREE.BoxGeometry(40, 0.8, 2.0);
      const bleacher = new THREE.Mesh(bleacherGeo, graniteMat);
      bleacher.position.set(0, row * 0.8 + 0.4, row * 2.0);
      grandstand.add(bleacher);

      // Spectator crowd figures waving white handkerchiefs!
      for (let s = -18; s <= 18; s += 2.5) {
        const figure = new THREE.Mesh(
          new THREE.BoxGeometry(0.7, 1.4, 0.6),
          new THREE.MeshStandardMaterial({
            color: 0x2c3e50 + ((s * 4123) % 0xaaaaaa),
          }),
        );
        figure.position.set(s, row * 0.8 + 1.2, row * 2.0);
        grandstand.add(figure);
      }
    }
    this.scene.add(grandstand);

    // Pine Trees on Rooftop Terrace
    const treeGeo = new THREE.ConeGeometry(2.5, 6.0, 8);
    const treeMat = new THREE.MeshStandardMaterial({
      color: 0x1b4332,
      roughness: 0.9,
    });
    const trunkGeo = new THREE.CylinderGeometry(0.4, 0.4, 2.0, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a2810 });

    [
      [30, 16, 175],
      [10, 16, 185],
      [-20, 16, 185],
      [-35, 15, 165],
    ].forEach((tp) => {
      const tree = new THREE.Group();
      tree.position.set(tp[0], tp[1], tp[2]);
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 1.0;
      const leaves = new THREE.Mesh(treeGeo, treeMat);
      leaves.position.y = 4.5;
      tree.add(trunk);
      tree.add(leaves);
      this.scene.add(tree);
    });
  }

  private buildBoostPads() {
    // Glowing golden boost chevrons on track
    const padIndices = [6, 18, 32, 48];
    const padMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffaa00,
      emissiveIntensity: 0.9,
    });

    padIndices.forEach((idx) => {
      const cp = this.checkpoints[idx];
      const padGeo = new THREE.BoxGeometry(6.0, 0.06, 3.5);
      const padMesh = new THREE.Mesh(padGeo, padMat);
      padMesh.position.copy(cp.position).add(new THREE.Vector3(0, 0.05, 0));
      padMesh.lookAt(cp.position.clone().add(cp.tangent));
      this.scene.add(padMesh);

      this.boostPads.push({
        position: cp.position.clone(),
        rotation: Math.atan2(cp.tangent.x, cp.tangent.z),
        radius: 3.5,
      });
    });
  }

  private spawnItemBoxClusters(itemSystem: KartItemSystem) {
    // 3 item box clusters around the circuit
    const boxIndices = [8, 25, 42];
    boxIndices.forEach((idx) => {
      const cp = this.checkpoints[idx];
      [-4.0, 0, 4.0].forEach((offset) => {
        const boxPos = cp.position.clone().addScaledVector(cp.normal, offset);
        itemSystem.createItemBox(boxPos.x, boxPos.y, boxPos.z);
      });
    });
  }

  /**
   * Returns surface elevation Y and whether kart is off-road (grass)
   */
  public getTrackSurface(
    x: number,
    z: number,
  ): { y: number; normal: THREE.Vector3; isOffroad: boolean } {
    let closestDistSq = Infinity;
    let closestY = 0;
    let normal = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < this.waypoints.length; i++) {
      const p = this.waypoints[i];
      const dx = x - p.x;
      const dz = z - p.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < closestDistSq) {
        closestDistSq = d2;
        closestY = p.y;
        normal = this.checkpoints[i].normal;
      }
    }

    const distFromCenterline = Math.sqrt(closestDistSq);
    const isOffroad = distFromCenterline > this.trackWidth * 0.5 + 0.4;

    return {
      y: closestY,
      normal,
      isOffroad,
    };
  }

  /**
   * Tracks race progress for checkpoints & lap counting
   */
  public updateRacerProgress(
    racerPos: THREE.Vector3,
    currentCheckpoint: number,
    currentLap: number,
  ): {
    nextCheckpoint: number;
    newLap: number;
    lapCompleted: boolean;
    wrongWay: boolean;
  } {
    const cp = this.checkpoints[currentCheckpoint];
    const nextIdx = (currentCheckpoint + 1) % this.checkpoints.length;
    const nextCp = this.checkpoints[nextIdx];

    const distToNext = racerPos.distanceTo(nextCp.position);
    let newLap = currentLap;
    let lapCompleted = false;

    // Check if reached next checkpoint
    let nextCheckpoint = currentCheckpoint;
    if (distToNext < this.trackWidth * 1.2) {
      nextCheckpoint = nextIdx;
      // Crossed finish line!
      if (nextIdx === 0 && currentCheckpoint === this.checkpoints.length - 1) {
        newLap = currentLap + 1;
        lapCompleted = true;
      }
    }

    // Wrong way detection
    const toNext = nextCp.position.clone().sub(cp.position).normalize();
    const toRacer = racerPos.clone().sub(cp.position).normalize();
    const wrongWay = toNext.dot(toRacer) < -0.6;

    return {
      nextCheckpoint,
      newLap,
      lapCompleted,
      wrongWay,
    };
  }

  public dispose() {
    this.scene.clear();
  }
}
