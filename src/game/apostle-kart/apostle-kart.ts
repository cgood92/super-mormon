import * as THREE from "three";
import { APOSTLE_ROSTER, type ApostleRacer, getApostleById } from "./roster";
import { KartPhysics, type KartInput } from "./physics";
import { KartVisualModel } from "./models";
import { KartTrack } from "./track";
import { KartItemSystem, type KartItemType } from "./items";
import { KartAIController } from "./ai";
import { KartAudio } from "./audio";
import { KartHUD } from "./hud";

export class ApostleKartGame {
  private readonly container: HTMLElement;
  private readonly onExitToSuperMormon: () => void;

  // Three.js Core
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private animFrameId: number | null = null;
  private lastTime = 0;

  // Subsystems
  private audio!: KartAudio;
  private hud!: KartHUD;
  private track!: KartTrack;
  private itemSystem!: KartItemSystem;

  // Racers
  private playerRacer: ApostleRacer;
  private playerPhysics!: KartPhysics;
  private playerModel!: KartVisualModel;
  private aiControllers: KartAIController[] = [];
  private allRacersPhysics: KartPhysics[] = [];
  private allRacerModels: KartVisualModel[] = [];

  // Race State
  private raceState: "countdown" | "racing" | "finished" = "countdown";
  private countdownTimer = 3.6; // 3, 2, 1, GO
  private raceElapsedTime = 0;
  private readonly totalLaps = 3;
  private playerHeldItem: KartItemType | null = null;
  private playerRouletteTimer = 0;
  private keysPressed = new Set<string>();

  // Camera Follow State
  private cameraTargetPos = new THREE.Vector3();
  private cameraLookTarget = new THREE.Vector3();
  private cameraShake = 0;

  constructor(
    container: HTMLElement,
    onExit: () => void,
    selectedApostle = "oaks",
  ) {
    this.container = container;
    this.onExitToSuperMormon = onExit;
    this.playerRacer = getApostleById(selectedApostle as any);

    this.initRenderer();
    this.initScene();
    this.initAudio();
    this.initHUD();
    this.initRacers();
    this.bindEvents();
    this.startLoop();
  }

  private initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.renderer.domElement.id = "kart-canvas";
    this.renderer.domElement.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;display:block;z-index:900;";
    this.container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.5,
      600,
    );
  }

  private initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Clear Utah sky blue
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.0035);

    // Warm Sun & Sky Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444455, 0.7);
    this.scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffaed, 1.4);
    sunLight.position.set(100, 180, 80);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 400;
    const d = 120;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    this.scene.add(sunLight);

    // Ground Plane (Lush grass around Salt Lake City & Temple Square)
    const groundGeo = new THREE.PlaneGeometry(1200, 1200);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x27ae60, // Utah temple grounds green lawn
      roughness: 0.9,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  private initAudio() {
    this.audio = new KartAudio();
  }

  private initHUD() {
    this.hud = new KartHUD(this.container, this.playerRacer);
  }

  private initRacers() {
    this.itemSystem = new KartItemSystem(this.audio);
    this.scene.add(this.itemSystem.scene);

    this.track = new KartTrack(this.itemSystem);
    this.scene.add(this.track.scene);

    // Grid Stagger Spacing (Start / Finish line)
    const startPos = this.track.waypoints[0];
    const startCp = this.track.checkpoints[0];
    const forward = startCp.tangent.clone().normalize();
    const right = startCp.normal.clone().normalize();
    const startYaw = Math.atan2(forward.x, forward.z);

    // Spawn Player 1 (President Dallin H. Oaks) at Pole Position!
    const playerSpawn = startPos
      .clone()
      .addScaledVector(right, -2.5)
      .addScaledVector(forward, 2.0);
    this.playerPhysics = new KartPhysics(
      this.playerRacer,
      playerSpawn,
      startYaw,
    );
    this.playerModel = new KartVisualModel(this.playerRacer);
    this.scene.add(this.playerModel.group);

    this.allRacersPhysics.push(this.playerPhysics);
    this.allRacerModels.push(this.playerModel);

    // Spawn All 14 Other Apostles & First Presidency Members in Staggered Grid!
    const rivalApostles = APOSTLE_ROSTER.filter(
      (r) => r.id !== this.playerRacer.id,
    );
    rivalApostles.forEach((apostle, i) => {
      const row = Math.floor((i + 1) / 2);
      const side = (i + 1) % 2 === 0 ? 1 : -1;
      const spawn = startPos
        .clone()
        .addScaledVector(right, side * 3.2)
        .addScaledVector(forward, -row * 4.5);

      const physics = new KartPhysics(apostle, spawn, startYaw);
      const model = new KartVisualModel(apostle);
      this.scene.add(model.group);

      const ai = new KartAIController(physics, this.track, this.itemSystem, i);
      this.aiControllers.push(ai);

      this.allRacersPhysics.push(physics);
      this.allRacerModels.push(model);
    });

    // Initial camera position behind player
    this.camera.position.copy(playerSpawn).add(new THREE.Vector3(0, 3.5, -6.5));
    this.camera.lookAt(playerSpawn.clone().add(new THREE.Vector3(0, 1.2, 5)));
  }

  private bindEvents() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("resize", this.onResize);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    this.keysPressed.add(e.code);
    if (this.keysPressed.has("Space") || this.keysPressed.has("KeyB")) {
      e.preventDefault();
    }
    // Audio activation on first interaction
    this.audio.startEngine();
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keysPressed.delete(e.code);
  };

  private onResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private startLoop() {
    this.lastTime = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - this.lastTime) * 0.001, 0.05); // cap delta
      this.lastTime = now;
      this.update(dt);
      this.render();
      this.animFrameId = requestAnimationFrame(tick);
    };
    this.animFrameId = requestAnimationFrame(tick);
  }

  private getPlayerInput(): KartInput {
    let steer = 0;
    if (this.keysPressed.has("ArrowLeft") || this.keysPressed.has("KeyA"))
      steer -= 1.0;
    if (this.keysPressed.has("ArrowRight") || this.keysPressed.has("KeyD"))
      steer += 1.0;
    if (this.hud.touchSteer !== 0) steer = this.hud.touchSteer;

    let throttle = 0;
    if (this.keysPressed.has("ArrowUp") || this.keysPressed.has("KeyW"))
      throttle = 1.0;
    if (this.hud.touchThrottle > 0) throttle = this.hud.touchThrottle;

    const brake =
      this.keysPressed.has("ArrowDown") ||
      this.keysPressed.has("KeyS") ||
      this.hud.touchBrake;
    const drift =
      this.keysPressed.has("Space") ||
      this.keysPressed.has("ShiftLeft") ||
      this.hud.touchDrift;
    const useItem =
      this.keysPressed.has("KeyE") ||
      this.keysPressed.has("ControlLeft") ||
      this.hud.touchItem;

    return { steer, throttle, brake, drift, useItem };
  }

  private update(dt: number) {
    if (dt <= 0) return;

    // --- COUNTDOWN SEQUENCE ---
    if (this.raceState === "countdown") {
      const prevTimer = this.countdownTimer;
      this.countdownTimer -= dt;

      // Beep at 3, 2, 1
      if (prevTimer >= 3.0 && this.countdownTimer < 3.0)
        this.audio.playCountdown(false);
      if (prevTimer >= 2.0 && this.countdownTimer < 2.0)
        this.audio.playCountdown(false);
      if (prevTimer >= 1.0 && this.countdownTimer < 1.0)
        this.audio.playCountdown(false);

      if (this.countdownTimer <= 0) {
        this.raceState = "racing";
        this.audio.playCountdown(true);
        this.audio.startBGM();

        // Check for Rocket Start!
        const playerInput = this.getPlayerInput();
        if (playerInput.throttle > 0.5 && prevTimer <= 0.35) {
          this.audio.playBoost();
          this.playerPhysics.applyBoost(1.65, 2.5);
          this.hud.showQuote(this.playerRacer, "Rocket start sustained!");
        }
      }

      this.updateCamera(dt, true);
      return;
    }

    this.raceElapsedTime += dt;

    // --- PLAYER UPDATE ---
    const playerInput = this.getPlayerInput();
    const prevDrifting = this.playerPhysics.isDrifting;

    this.playerPhysics.update(dt, playerInput, (x, z) =>
      this.track.getTrackSurface(x, z),
    );

    // Audio cues for drift & mini-turbo
    if (!prevDrifting && this.playerPhysics.isDrifting) {
      this.audio.startDrift();
      this.audio.playHop();
    } else if (prevDrifting && !this.playerPhysics.isDrifting) {
      this.audio.stopDrift();
      if (this.playerPhysics.miniTurboTier > 0) {
        this.audio.playMiniTurbo(this.playerPhysics.miniTurboTier as 1 | 2 | 3);
      }
    }
    this.audio.updateEngine(
      this.playerPhysics.speed / 26.0,
      this.playerPhysics.isDrifting,
    );

    // Boost Pad Collisions
    this.track.boostPads.forEach((pad) => {
      if (this.playerPhysics.position.distanceTo(pad.position) < pad.radius) {
        this.audio.playBoost();
        this.playerPhysics.applyBoost(1.85, 2.0);
      }
    });

    // Checkpoints & Lap Tracking
    const progress = this.track.updateRacerProgress(
      this.playerPhysics.position,
      this.playerPhysics.checkpointIndex,
      this.playerPhysics.currentLap,
    );
    this.playerPhysics.checkpointIndex = progress.nextCheckpoint;

    if (progress.lapCompleted) {
      this.playerPhysics.currentLap = progress.newLap;
      if (this.playerPhysics.currentLap === this.totalLaps) {
        // Final Lap Siren!
        this.audio.playLapChime(true);
        this.audio.speedUpBGM();
        this.hud.showQuote(this.playerRacer, "Final lap! Hold fast!");
      } else if (this.playerPhysics.currentLap > this.totalLaps) {
        // Race Finished!
        this.finishRace();
        return;
      } else {
        this.audio.playLapChime(false);
      }
    }

    // Player Item Rolling & Firing
    if (this.playerRouletteTimer > 0) {
      this.playerRouletteTimer -= dt;
      if (this.playerRouletteTimer <= 0) {
        const sorted = [...this.allRacersPhysics].sort(
          (a, b) => b.totalDistanceTraveled - a.totalDistanceTraveled,
        );
        const rank = sorted.indexOf(this.playerPhysics) + 1;
        this.playerHeldItem = this.itemSystem.getRandomItemForRank(
          rank,
          this.allRacersPhysics.length,
        );
        this.audio.playItemGet();
      }
    }

    if (
      playerInput.useItem &&
      this.playerHeldItem &&
      this.playerRouletteTimer <= 0
    ) {
      this.itemSystem.useItem(
        this.playerHeldItem,
        this.playerPhysics,
        this.allRacersPhysics,
        this.track.waypoints,
      );
      this.playerHeldItem = null;
    }

    // Check item box hit for player
    this.track.scene.children.forEach(() => {
      this.itemSystem.itemBoxes.forEach((b) => {
        if (
          b.active &&
          this.playerPhysics.position.distanceTo(b.center) < 2.0
        ) {
          if (!this.playerHeldItem && this.playerRouletteTimer <= 0) {
            this.playerRouletteTimer = 1.35;
          }
        }
      });
    });

    // --- AI RACERS UPDATE ---
    this.aiControllers.forEach((ai) => {
      const aiInput = ai.update(
        dt,
        this.allRacersPhysics,
        this.playerPhysics.totalDistanceTraveled,
      );
      ai.physics.update(dt, aiInput, (x, z) =>
        this.track.getTrackSurface(x, z),
      );

      // AI Checkpoints
      const aiProg = this.track.updateRacerProgress(
        ai.physics.position,
        ai.physics.checkpointIndex,
        ai.physics.currentLap,
      );
      ai.physics.checkpointIndex = aiProg.nextCheckpoint;
      ai.physics.currentLap = aiProg.newLap;

      // AI Boost Pads
      this.track.boostPads.forEach((pad) => {
        if (ai.physics.position.distanceTo(pad.position) < pad.radius) {
          ai.physics.applyBoost(1.7, 1.8);
        }
      });

      // AI Item Boxes
      this.itemSystem.itemBoxes.forEach((b) => {
        if (b.active && ai.physics.position.distanceTo(b.center) < 2.0) {
          ai.giveItemBox(
            this.allRacersPhysics.length,
            ai.physics.checkpointIndex,
          );
        }
      });
    });

    // --- KART-TO-KART BUMPING DYNAMICS ---
    for (let i = 0; i < this.allRacersPhysics.length; i++) {
      for (let j = i + 1; j < this.allRacersPhysics.length; j++) {
        const k1 = this.allRacersPhysics[i];
        const k2 = this.allRacersPhysics[j];
        const diff = k1.position.clone().sub(k2.position).setY(0);
        const dist = diff.length();
        if (dist < 1.6 && dist > 0.01) {
          // Push karts apart
          const normal = diff.normalize();
          const overlap = 1.6 - dist;
          k1.position.addScaledVector(normal, overlap * 0.5);
          k2.position.addScaledVector(normal, -overlap * 0.5);

          // Starman Knockout
          if (k1.isInvincible && !k2.isInvincible) k2.triggerSpinout();
          if (k2.isInvincible && !k1.isInvincible) k1.triggerSpinout();
        }
      }
    }

    // --- ITEMS & PROJECTILE UPDATE ---
    this.itemSystem.update(dt, this.allRacersPhysics);

    // --- UPDATE 3D VISUAL MODELS ---
    this.allRacersPhysics.forEach((physics, idx) => {
      this.allRacerModels[idx].update(dt, physics);
    });

    // --- CAMERA FOLLOW ---
    this.updateCamera(dt, false);

    // --- HUD UPDATE ---
    this.hud.update(
      dt,
      this.playerPhysics,
      this.allRacersPhysics,
      this.totalLaps,
      this.raceElapsedTime,
      this.playerHeldItem,
      this.playerRouletteTimer > 0,
      this.track.waypoints,
    );
  }

  private updateCamera(dt: number, isCountdown: boolean) {
    const fwd = this.playerPhysics.forward;
    const speedRatio = Math.max(0, this.playerPhysics.speed / 26.0);

    // Dynamic FOV (Mario Kart speed stretch effect!)
    const targetFov =
      65 + speedRatio * 18 + (this.playerPhysics.boostTime > 0 ? 10 : 0);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, 0.15);
    this.camera.updateProjectionMatrix();

    // Desired camera chase position
    const distanceBehind = 5.8 + speedRatio * 1.8;
    const heightAbove = 2.4 + (this.playerPhysics.isDrifting ? 0.3 : 0);

    const idealPos = this.playerPhysics.position
      .clone()
      .sub(fwd.clone().multiplyScalar(distanceBehind))
      .add(new THREE.Vector3(0, heightAbove, 0));

    // Smooth spring interpolation
    this.cameraTargetPos.lerp(idealPos, 0.25);
    this.camera.position.copy(this.cameraTargetPos);

    // Look target slightly ahead of kart
    const idealLook = this.playerPhysics.position
      .clone()
      .add(new THREE.Vector3(0, 1.2, 0))
      .addScaledVector(fwd, 4.0);
    this.cameraLookTarget.lerp(idealLook, 0.3);
    this.camera.lookAt(this.cameraLookTarget);

    // Camera roll into drifts
    this.camera.rotation.z = -this.playerPhysics.roll * 0.45;
  }

  private finishRace() {
    this.raceState = "finished";
    this.audio.playLapChime(true);
    this.audio.stopBGM();
    this.hud.showRaceResults(
      this.allRacersPhysics,
      () => this.restartRace(),
      () => this.exitToSuperMormon(),
    );
  }

  public restartRace() {
    this.dispose();
    new ApostleKartGame(
      this.container,
      this.onExitToSuperMormon,
      this.playerRacer.id,
    );
  }

  public exitToSuperMormon() {
    this.dispose();
    this.onExitToSuperMormon();
  }

  private render() {
    this.renderer.render(this.scene, this.camera);
  }

  public dispose() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("resize", this.onResize);

    this.audio.dispose();
    this.hud.dispose();
    this.track.dispose();
    this.itemSystem.dispose();
    this.allRacerModels.forEach((m) => m.dispose());
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
