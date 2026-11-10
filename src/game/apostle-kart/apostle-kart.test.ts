import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { APOSTLE_ROSTER, getApostleById } from "./roster";
import { KonamiCodeDetector } from "./konami";
import { KartPhysics } from "./physics";
import { KartItemSystem } from "./items";
import { KartAudio } from "./audio";
import { KartTrack } from "./track";

describe("Apostle Kart: Quorum of the Twelve Roster", () => {
  it("contains all 15 General Authorities of the First Presidency & Quorum of the Twelve", () => {
    assert.equal(APOSTLE_ROSTER.length, 15);
    const ids = APOSTLE_ROSTER.map((r) => r.id);
    assert.ok(
      ids.includes("oaks"),
      "President Dallin H. Oaks must be in roster",
    );
    assert.ok(
      ids.includes("eyring"),
      "President Henry B. Eyring must be in roster",
    );
    assert.ok(
      ids.includes("christofferson"),
      "President D. Todd Christofferson must be in roster",
    );
    assert.ok(
      ids.includes("uchtdorf"),
      "President Dieter F. Uchtdorf must be in roster",
    );
    assert.ok(
      ids.includes("bednar"),
      "Elder David A. Bednar must be in roster",
    );
    assert.ok(ids.includes("cook"), "Elder Quentin L. Cook must be in roster");
    assert.ok(
      ids.includes("andersen"),
      "Elder Neil L. Andersen must be in roster",
    );
    assert.ok(
      ids.includes("rasband"),
      "Elder Ronald A. Rasband must be in roster",
    );
    assert.ok(
      ids.includes("stevenson"),
      "Elder Gary E. Stevenson must be in roster",
    );
    assert.ok(
      ids.includes("renlund"),
      "Elder Dale G. Renlund must be in roster",
    );
    assert.ok(ids.includes("gong"), "Elder Gerrit W. Gong must be in roster");
    assert.ok(ids.includes("soares"), "Elder Ulisses Soares must be in roster");
    assert.ok(ids.includes("kearon"), "Elder Patrick Kearon must be in roster");
    assert.ok(ids.includes("causse"), "Elder Gérald Caussé must be in roster");
    assert.ok(
      ids.includes("gilbert"),
      "Elder Clark G. Gilbert must be in roster",
    );
  });

  it("gives each racer distinct kart names, numbers, colors, and iconic catchphrases", () => {
    const numbers = new Set<number>();
    const kartNames = new Set<string>();

    APOSTLE_ROSTER.forEach((r) => {
      assert.ok(r.name.length > 0);
      assert.ok(r.catchphrases.length >= 3);
      assert.ok(r.stats.topSpeed >= 0.8 && r.stats.topSpeed <= 1.3);
      assert.ok(r.stats.handling >= 0.8 && r.stats.handling <= 1.3);
      numbers.add(r.number);
      kartNames.add(r.kartName);
    });

    assert.equal(numbers.size, 15, "Each apostle has a unique racing number");
    assert.equal(
      kartNames.size,
      15,
      "Each apostle has a unique themed kart name",
    );
  });

  it("configures President Dallin H. Oaks as the lead presidential racer", () => {
    const oaks = getApostleById("oaks");
    assert.equal(oaks.number, 1);
    assert.equal(oaks.kartName, "The Supreme Gavel");
    assert.equal(oaks.hairStyle, "bald-top");
    assert.equal(oaks.hasGlasses, true);
    assert.ok(oaks.catchphrases.some((c) => c.includes("Order on the track")));
  });

  it("configures President Uchtdorf with aviation jet theme and iconic pompadour", () => {
    const uchtdorf = getApostleById("uchtdorf");
    assert.equal(uchtdorf.hairStyle, "pompadour");
    assert.ok(uchtdorf.kartName.includes("747"));
    assert.ok(uchtdorf.stats.topSpeed > 1.1);
  });
});

describe("Apostle Kart: Konami Code Detector", () => {
  it("triggers callback when Konami code is completed via keyboard", () => {
    let triggered = false;
    const detector = new KonamiCodeDetector(() => {
      triggered = true;
    });

    // Simulate key sequence
    const keys = [
      "ArrowUp",
      "ArrowUp",
      "ArrowDown",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "ArrowLeft",
      "ArrowRight",
      "KeyB",
      "KeyA",
    ];

    keys.forEach((code) => {
      detector.handleKey(code);
    });

    assert.equal(triggered, true);
    detector.dispose();
  });

  it("triggers callback when Gamepad enters Konami sequence", () => {
    let triggered = false;
    const detector = new KonamiCodeDetector(() => {
      triggered = true;
    });

    // Gamepad sequence: 12, 12, 13, 13, 14, 15, 14, 15, 1, 0
    const padSeq = [12, 12, 13, 13, 14, 15, 14, 15, 1, 0];
    padSeq.forEach((buttonIndex) => {
      const mockGamepad = {
        buttons: Array(16)
          .fill(0)
          .map((_, i) => ({ pressed: i === buttonIndex })),
      } as unknown as Gamepad;

      // Press
      detector.updateGamepad(mockGamepad);
      // Release
      const releasedGamepad = {
        buttons: Array(16)
          .fill(0)
          .map(() => ({ pressed: false })),
      } as unknown as Gamepad;
      detector.updateGamepad(releasedGamepad);
    });

    assert.equal(triggered, true);
    detector.dispose();
  });
});

describe("Apostle Kart: Mario Kart Physics & Drift Mechanics", () => {
  const oaks = getApostleById("oaks");

  it("accelerates smoothly up to top speed", () => {
    const kart = new KartPhysics(oaks, new THREE.Vector3(0, 0, 0), 0);
    const surfaceGetter = () => ({
      y: 0,
      normal: new THREE.Vector3(0, 1, 0),
      isOffroad: false,
    });

    // Step forward 60 frames with full throttle
    for (let i = 0; i < 60; i++) {
      kart.update(
        1 / 60,
        { steer: 0, throttle: 1.0, brake: false, drift: false, useItem: false },
        surfaceGetter,
      );
    }

    assert.ok(
      kart.speed > 10.0,
      `Speed should have accelerated, got ${kart.speed}`,
    );
    assert.ok(kart.speed <= 35.0, "Speed should not exceed max governed speed");
  });

  it("hops and initiates power-slide drift when drift button is held while turning", () => {
    const kart = new KartPhysics(oaks, new THREE.Vector3(0, 0, 0), 0);
    kart.speed = 18.0;
    const surfaceGetter = () => ({
      y: 0,
      normal: new THREE.Vector3(0, 1, 0),
      isOffroad: false,
    });

    // Press drift while steering right
    kart.update(
      1 / 60,
      { steer: 1.0, throttle: 1.0, brake: false, drift: true, useItem: false },
      surfaceGetter,
    );

    assert.equal(kart.isDrifting, true);
    assert.equal(kart.driftDirection, 1);
    assert.ok(kart.vy > 0, "Hop should impart upward vertical velocity");

    // Hold drift for 80 frames to accumulate mini-turbo
    for (let i = 0; i < 80; i++) {
      kart.update(
        1 / 60,
        {
          steer: 1.0,
          throttle: 1.0,
          brake: false,
          drift: true,
          useItem: false,
        },
        surfaceGetter,
      );
    }

    assert.ok(
      kart.miniTurboTier >= 1,
      "Holding drift should charge at least Tier 1 Mini-Turbo",
    );

    // Release drift -> should trigger mini-turbo boost!
    kart.update(
      1 / 60,
      { steer: 0, throttle: 1.0, brake: false, drift: false, useItem: false },
      surfaceGetter,
    );
    assert.equal(kart.isDrifting, false);
    assert.ok(
      kart.boostMultiplier > 1.0,
      "Releasing drift should apply speed boost",
    );
    assert.ok(kart.boostTime > 0, "Boost timer should be active");
  });

  it("slows down significantly when off-road unless boosting", () => {
    const kart = new KartPhysics(oaks, new THREE.Vector3(0, 0, 0), 0);
    kart.speed = 25.0;
    const offroadGetter = () => ({
      y: 0,
      normal: new THREE.Vector3(0, 1, 0),
      isOffroad: true,
    });

    // Step in grass off-road
    for (let i = 0; i < 60; i++) {
      kart.update(
        1 / 60,
        { steer: 0, throttle: 1.0, brake: false, drift: false, useItem: false },
        offroadGetter,
      );
    }

    assert.ok(
      kart.speed < 12.0,
      `Off-road speed should be heavily reduced, got ${kart.speed}`,
    );
  });

  it("handles spinouts and tumble impacts", () => {
    const kart = new KartPhysics(oaks, new THREE.Vector3(0, 0, 0), 0);
    kart.speed = 20.0;
    kart.triggerSpinout();

    assert.ok(kart.spinoutTimer > 0);
    const surfaceGetter = () => ({
      y: 0,
      normal: new THREE.Vector3(0, 1, 0),
      isOffroad: false,
    });
    kart.update(
      1 / 60,
      { steer: 0, throttle: 1.0, brake: false, drift: false, useItem: false },
      surfaceGetter,
    );

    assert.ok(kart.spinoutAngle > 0, "Spinout should rotate kart angle");
  });
});

describe("Apostle Kart: Mormon Items & Weapons", () => {
  const audio = new KartAudio();
  audio.setMuted(true);
  const itemSystem = new KartItemSystem(audio);

  it("gives defensive/green items to 1st place and powerful catch-up weapons to trailing places", () => {
    // 1st place
    const p1Items = Array(20)
      .fill(0)
      .map(() => itemSystem.getRandomItemForRank(1, 15));
    assert.ok(p1Items.includes("green-jello") || p1Items.includes("ctr-ring"));
    assert.ok(
      !p1Items.includes("angel-moroni"),
      "1st place should never receive blue shell Angel Moroni",
    );

    // 15th place (last place)
    const p15Items = Array(20)
      .fill(0)
      .map(() => itemSystem.getRandomItemForRank(15, 15));
    assert.ok(
      p15Items.includes("angel-moroni") ||
        p15Items.includes("iron-rod") ||
        p15Items.includes("conference-chimes"),
      "Last place should receive catch-up super items",
    );
  });

  it("executes Swig Cookie and Iron Rod items", () => {
    const oaks = getApostleById("oaks");
    const kart = new KartPhysics(oaks, new THREE.Vector3(0, 0, 0), 0);

    // Swig Cookie -> Boost
    itemSystem.useItem("swig-cookie", kart, [kart], []);
    assert.ok(kart.boostTime > 2.0);
    assert.ok(kart.boostMultiplier > 1.5);

    // Iron Rod -> Invincibility
    itemSystem.useItem("iron-rod", kart, [kart], []);
    assert.equal(kart.isInvincible, true);
    assert.ok(kart.invincibleTimer > 5.0);
  });
});

describe("Apostle Kart: Track & Checkpoint Progression", () => {
  const audio = new KartAudio();
  audio.setMuted(true);
  const itemSystem = new KartItemSystem(audio);
  const track = new KartTrack(itemSystem);

  it("creates a closed circuit with elevation and checkpoints", () => {
    assert.ok(track.waypoints.length >= 40);
    assert.ok(track.checkpoints.length >= 40);

    // Check elevation variation (Conference Center Rooftop is elevated ~16m)
    const elevations = track.waypoints.map((w) => w.y);
    const maxElevation = Math.max(...elevations);
    assert.ok(
      maxElevation >= 14.0,
      `Track should climb onto rooftop terrace, got ${maxElevation}m`,
    );
  });

  it("tracks lap progression and detects finish line crossings", () => {
    const startCp = track.checkpoints[0];
    const lastIdx = track.checkpoints.length - 1;

    // Simulate crossing finish line from last checkpoint to checkpoint 0
    const result = track.updateRacerProgress(startCp.position, lastIdx, 1);
    assert.equal(result.nextCheckpoint, 0);
    assert.equal(result.newLap, 2);
    assert.equal(result.lapCompleted, true);
  });
});
