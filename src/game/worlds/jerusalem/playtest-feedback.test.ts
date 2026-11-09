import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { buildJerusalem } from "./jerusalem";
import { createPlayer, stepPlayer } from "../../physics/physics";
import { FollowCamera, cameraSegmentClear } from "../../camera/camera";
import { createCharacter } from "../../characters/character";

test("Jerusalem ground has procedural texture and extends past the back of Laban's palace", () => {
  const scene = new THREE.Scene();
  const world = buildJerusalem("streets", scene);
  try {
    const ground = scene.getObjectByName(
      "Jerusalem earth and desert road",
    ) as THREE.Mesh;
    assert.ok(ground, "ground mesh exists");
    assert.ok(ground.material instanceof THREE.MeshStandardMaterial);
    assert.ok(
      ground.material.map instanceof THREE.DataTexture,
      "ground has procedural texture map",
    );

    // Palace back wall is at z = -28.5; ground must extend past it
    const bbox = new THREE.Box3().setFromObject(ground);
    assert.ok(
      bbox.min.z < -30,
      `ground must extend behind palace: minZ=${bbox.min.z}`,
    );
    assert.ok(
      bbox.max.z > 115,
      `ground must extend past south desert road: maxZ=${bbox.max.z}`,
    );

    // No street pavers or cross street paving seams
    const paver = scene.getObjectByName("street paver");
    assert.equal(paver, undefined, "random street pavers should be removed");
    const seam = scene.getObjectByName("cross street paving seam");
    assert.equal(
      seam,
      undefined,
      "cross street paving seams should be removed",
    );

    // Laban's palace back floor has stone paving
    const palacePaving = scene.getObjectByName(
      "palace interior stone paving",
    ) as THREE.Mesh;
    assert.ok(palacePaving, "palace interior stone paving exists");
    const palaceBox = new THREE.Box3().setFromObject(palacePaving);
    assert.ok(
      palaceBox.min.z <= -28.4,
      `palace paving covers rear corridor: minZ=${palaceBox.min.z}`,
    );
    assert.ok(
      palaceBox.min.x <= -17.5,
      `palace paving covers west corridor: minX=${palaceBox.min.x}`,
    );
    assert.ok(
      palaceBox.max.x >= 17.5,
      `palace paving covers east corridor: maxX=${palaceBox.max.x}`,
    );
  } finally {
    world.dispose?.();
  }
});

test("dwelling flat roofs do not share coplanar height with dwelling walls (no z-fighting)", () => {
  const scene = new THREE.Scene();
  const world = buildJerusalem("streets", scene);
  try {
    const dwellings: THREE.Mesh[] = [];
    const roofs: THREE.Mesh[] = [];
    scene.traverse((obj) => {
      if (obj.name === "Jerusalem dwelling" && obj instanceof THREE.Mesh)
        dwellings.push(obj);
      if (obj.name === "flat roof" && obj instanceof THREE.Mesh)
        roofs.push(obj);
    });
    assert.ok(dwellings.length >= 8);
    assert.ok(roofs.length >= 8);

    for (const dwelling of dwellings) {
      const dwBox = new THREE.Box3().setFromObject(dwelling);
      // Find matching roof
      const matchingRoof = roofs.find(
        (r) =>
          Math.abs(r.position.x - dwelling.position.x) < 0.2 &&
          Math.abs(r.position.z - dwelling.position.z) < 0.2,
      );
      assert.ok(matchingRoof, "each dwelling has matching roof");
      const roofBox = new THREE.Box3().setFromObject(matchingRoof);
      // The top of the dwelling wall must be beneath the top of the roof slab
      assert.ok(
        dwBox.max.y < roofBox.max.y - 0.1,
        `dwelling wall (${dwBox.max.y}) must sit beneath roof top (${roofBox.max.y}) without coplanar overlap`,
      );
    }
  } finally {
    world.dispose?.();
  }
});

test("date palms have no green rendered cube, canopy is walkable, and player can climb to top handstand", () => {
  const scene = new THREE.Scene();
  const world = buildJerusalem("streets", scene);
  try {
    // No green rendered box
    const greenBox = scene.getObjectByName("date palm leaf canopy");
    assert.equal(
      greenBox,
      undefined,
      "date palm leaf canopy green box should not be rendered",
    );

    // West palm: x = -17, z = 22, height = 4.8
    const palm = world.climbables?.find((c) => c.id === "jerusalem-west-palm");
    assert.ok(palm, "west palm climbable exists");

    // Player jumps onto tree trunk
    const player = createPlayer(-17, 1.0, 22.5);
    player.grounded = false;
    player.vy = 1;
    stepPlayer(
      player,
      { x: 0, y: 1, jump: false, jumpHeld: false },
      1 / 60,
      Math.PI,
      world.solids,
      world.climbables,
    );
    assert.equal(player.climbId, "jerusalem-west-palm");
    assert.equal(player.move, "climb");

    // Climb all the way up the trunk past 4.2m
    for (let frame = 0; frame < 90; frame++) {
      stepPlayer(
        player,
        { x: 0, y: 1, jump: false, jumpHeld: false },
        1 / 60,
        Math.PI,
        world.solids,
        world.climbables,
      );
    }
    assert.ok(
      player.y >= palm.height - 0.7,
      `player climbs to near top of tree: y=${player.y}`,
    );

    // Holding up reaches handstand at the top of the tree
    for (let frame = 0; frame < 10; frame++) {
      stepPlayer(
        player,
        { x: 0, y: 1, jump: false, jumpHeld: false },
        1 / 60,
        Math.PI,
        world.solids,
        world.climbables,
      );
    }
    assert.equal(
      player.move,
      "handstand",
      "reaching top transitions into handstand",
    );

    // Player can stand on top of the canopy platform
    const canopyWalker = createPlayer(-17, 5.5, 22);
    canopyWalker.grounded = false;
    canopyWalker.vy = -2;
    for (let frame = 0; frame < 20; frame++) {
      stepPlayer(
        canopyWalker,
        { x: 0, y: 0, jump: false, jumpHeld: false },
        1 / 60,
        0,
        world.solids,
        world.climbables,
      );
    }
    assert.equal(
      canopyWalker.grounded,
      true,
      "player lands on top of tree canopy",
    );
    assert.ok(
      canopyWalker.y >= 4.8,
      `canopy walker standing at tree top: y=${canopyWalker.y}`,
    );
  } finally {
    world.dispose?.();
  }
});

test("wall kick works reliably on the outside perimeter city wall", () => {
  const scene = new THREE.Scene();
  const world = buildJerusalem("streets", scene);
  try {
    // Player airborne next to outside south wall (z = 40.8, wall at z = 40)
    const player = createPlayer(10, 1.8, 40.8);
    player.grounded = false;
    player.vy = -0.5;
    player.yaw = Math.PI; // facing north into wall

    const events = stepPlayer(
      player,
      { x: 0, y: 0, jump: true, jumpHeld: true },
      1 / 60,
      Math.PI,
      world.solids,
    );
    assert.equal(events.jumped, true);
    assert.equal(player.move, "wallKick");
    assert.ok(
      player.vz > 0,
      `wall kick pushes south away from wall: vz=${player.vz}`,
    );
  } finally {
    world.dispose?.();
  }
});

test("Nephi model has clean sculpted face and noble profile", () => {
  const nephi = createCharacter("nephi");
  try {
    assert.ok(nephi.group);
    const head = nephi.group.getObjectByName("sculpted-face-neck-nose");
    assert.ok(head, "Nephi sculpted face exists");
  } finally {
    nephi.dispose();
  }
});

test("expanded Jerusalem features Solomon's Temple, Waters of Shiloah, market stalls, and city cistern", () => {
  const scene = new THREE.Scene();
  const world = buildJerusalem("streets", scene);
  try {
    // 1. Solomon's Temple Precinct
    const templePlatform = scene.getObjectByName("temple ashlar platform");
    assert.ok(templePlatform, "temple ashlar platform exists");
    const boaz = scene.getObjectByName("bronze pillar Boaz");
    const jachin = scene.getObjectByName("bronze pillar Jachin");
    assert.ok(boaz, "Boaz pillar exists");
    assert.ok(jachin, "Jachin pillar exists");
    const altar = scene.getObjectByName("temple altar base");
    assert.ok(altar, "great altar exists in temple precinct");

    // 2. Waters of Shiloah (Pool of Siloam)
    const siloam = scene.getObjectByName("waters of shiloah pool surface");
    assert.ok(siloam, "waters of shiloah pool surface exists");
    const conduit = scene.getObjectByName("conduit tunnel mouth");
    assert.ok(conduit, "conduit tunnel mouth exists");

    // 3. Public City Well / Cistern
    const wellCurb = scene.getObjectByName("city well curb");
    assert.ok(wellCurb, "city well curb exists");
    const trough = scene.getObjectByName("animal water trough");
    assert.ok(trough, "animal water trough exists");

    // 4. Market Stalls with Walkable Canopy Awnings
    const awning1 = scene.getObjectByName("market awning 1 (textiles)");
    const awning2 = scene.getObjectByName("market awning 2 (pottery)");
    assert.ok(awning1, "market awning 1 exists");
    assert.ok(awning2, "market awning 2 exists");

    // Player can stand on top of market awning
    const awningWalker = createPlayer(-7, 3.0, 10);
    awningWalker.grounded = false;
    awningWalker.vy = -1;
    for (let frame = 0; frame < 15; frame++) {
      stepPlayer(
        awningWalker,
        { x: 0, y: 0, jump: false, jumpHeld: false },
        1 / 60,
        0,
        world.solids,
      );
    }
    assert.equal(awningWalker.grounded, true, "player lands on market awning platform");
    assert.ok(awningWalker.y >= 2.4, `player standing atop awning: y=${awningWalker.y}`);

    // 5. Ambient Animals
    const donkeys = scene.children[0].children.filter(
      (c) => c.name === "Jerusalem pack donkey",
    );
    assert.ok(donkeys.length >= 2, "at least 2 pack donkeys in Jerusalem");
    const sheep = scene.children[0].children.filter(
      (c) => c.name === "Jerusalem flock sheep",
    );
    assert.ok(sheep.length >= 2, "flock sheep present in animal pen");
  } finally {
    world.dispose?.();
  }
});

test("expanded Laban's palace includes audience hall, inner courtyard garden, stables, and fortified inner vault", () => {
  const scene = new THREE.Scene();
  const world = buildJerusalem("night", scene);
  try {
    // Inner Fortified Vault
    const vaultWest = scene.getObjectByName("vault west wall");
    const vaultNorth = scene.getObjectByName("vault north wall");
    assert.ok(vaultWest, "inner vault west wall exists");
    assert.ok(vaultNorth, "inner vault north wall exists");

    // Plates pedestal located deep inside vault
    const pedestal = scene.getObjectByName("plates stone pedestal");
    assert.ok(pedestal, "plates stone pedestal exists");
    assert.equal(world.story?.plates.x, 14);
    assert.equal(world.story?.plates.z, -32);
    assert.equal(world.story?.treasury.x, 14);
    assert.equal(world.story?.treasury.z, -24);

    // Inner Courtyard Garden
    const gardenBasin = scene.getObjectByName("palace garden basin");
    assert.ok(gardenBasin, "palace garden basin exists");

    // Palace Stables
    const stableNorth = scene.getObjectByName("stable north wall");
    const manger = scene.getObjectByName("stone manger 1");
    assert.ok(stableNorth, "palace stable north wall exists");
    assert.ok(manger, "palace stable stone manger exists");

    // Player can walk into the inner vault up to the Plates pedestal
    const infiltrator = createPlayer(14, 0, -20);
    for (let frame = 0; frame < 120; frame++) {
      const dz = -32 - infiltrator.z;
      const d = Math.abs(dz);
      if (d < 0.2) break;
      stepPlayer(
        infiltrator,
        { x: 0, y: -Math.sign(dz), jump: false, jumpHeld: false },
        1 / 60,
        Math.PI, // Facing north
        world.solids,
      );
    }
    assert.ok(
      infiltrator.z <= -30,
      `infiltrator reached inner vault chamber: z=${infiltrator.z}`,
    );
  } finally {
    world.dispose?.();
  }
});

test("rooftop platforming provides playable highway across dwellings with plank bridges and tokens", () => {
  const scene = new THREE.Scene();
  const world = buildJerusalem("streets", scene);
  try {
    // Rooftop plank bridges exist
    const bridgeWest = scene.getObjectByName("rooftop plank bridge west 1");
    assert.ok(bridgeWest, "rooftop plank bridge west exists");

    // Tokens rewarding rooftop platforming
    assert.ok(world.tokens, "tokens exist in streets mode");
    assert.ok(world.tokens.find((t) => t.id === "roof-route"), "roof-route token exists");
    assert.ok(world.tokens.find((t) => t.id === "west-rooftop-token"), "west rooftop token exists");
    assert.ok(world.tokens.find((t) => t.id === "temple-overlook-token"), "temple overlook token exists");

    // Player can walk across western rooftop bridge from x=-27 dwelling toward x=-43 dwelling
    const bridgeRunner = createPlayer(-28, 4.37, 14);
    bridgeRunner.grounded = true;
    for (let frame = 0; frame < 90; frame++) {
      stepPlayer(
        bridgeRunner,
        { x: 1, y: 0, jump: false, jumpHeld: false }, // stickX +1 moves west (-X) when cameraYaw=0
        1 / 60,
        0,
        world.solids,
      );
    }
    assert.ok(
      bridgeRunner.x < -32,
      `player crossed rooftop bridge over alley: x=${bridgeRunner.x}`,
    );
    assert.ok(
      bridgeRunner.y >= 4.1,
      `player stayed on rooftop bridge surface: y=${bridgeRunner.y}`,
    );
  } finally {
    world.dispose?.();
  }
});
