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
    assert.equal(
      awningWalker.grounded,
      true,
      "player lands on market awning platform",
    );
    assert.ok(
      awningWalker.y >= 2.4,
      `player standing atop awning: y=${awningWalker.y}`,
    );

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
    assert.equal(world.story?.plates.z, -24);
    assert.equal(world.story?.treasury.x, 14);
    assert.equal(world.story?.treasury.z, -21);

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

test("rooftop platforming provides playable highway across dwellings with plank bridges and removed coins", () => {
  const scene = new THREE.Scene();
  const world = buildJerusalem("streets", scene);
  try {
    // Rooftop plank bridges exist
    const bridgeWest = scene.getObjectByName("rooftop plank bridge west 1");
    assert.ok(bridgeWest, "rooftop plank bridge west exists");
    const bridgeEast2 = scene.getObjectByName("rooftop plank bridge east 2");
    assert.ok(bridgeEast2, "rooftop plank bridge east 2 exists");

    // Tokens/coins removed from streets mode per player feedback
    assert.equal(world.tokens, undefined, "tokens removed in streets mode");

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

test("Pool of Bethesda features five porches, disturbed rippling water, and waiting figures", () => {
  const scene = new THREE.Scene();
  const world = buildJerusalem("streets", scene);
  try {
    // Retaining walls and five porches
    const northWall = scene.getObjectByName("bethesda north wall");
    const southWall = scene.getObjectByName("bethesda south wall");
    const northRoof = scene.getObjectByName("bethesda north porch roof");
    const southRoof = scene.getObjectByName("bethesda south porch roof");
    const westRoof = scene.getObjectByName("bethesda west porch roof");
    const eastRoof = scene.getObjectByName("bethesda east porch roof");
    const centralBeam = scene.getObjectByName("bethesda central porch beam");
    assert.ok(northWall && southWall, "retaining walls exist");
    assert.ok(
      northRoof && southRoof && westRoof && eastRoof && centralBeam,
      "five colonnaded porches exist",
    );

    // Wading into the pool
    const water = scene.getObjectByName(
      "bethesda pool water surface",
    ) as THREE.Mesh;
    assert.ok(water, "pool water surface exists");

    // Stepped descent into the pool
    const step1 = scene.getObjectByName("bethesda pool step 1");
    assert.ok(step1, "pool steps exist");

    // Waiting infirm figures under the porches
    const mat = scene.getObjectByName("infirm man sleeping mat");
    assert.ok(mat, "infirm man sleeping mat exists");
    const bench = scene.getObjectByName("bethesda stone bench");
    assert.ok(bench, "stone bench for blind figure exists");

    // Disturbed water periodic animation
    assert.ok(world.update, "world update callback exists");
    const initialY = water.position.y;
    // Step forward into the troubled water phase (at t = 4.5s)
    world.update(4.5, createPlayer(0, 0, 0));
    assert.ok(
      Math.abs(water.position.y - initialY) > 0.001,
      "water surface ripples vertically during troubled cycle",
    );
    // Return to calm phase
    world.update(2.0, createPlayer(0, 0, 0)); // t = 6.5s -> 0.5s in cycle
    assert.ok(
      Math.abs(water.position.y - initialY) < 1e-4,
      `water returns to serene calm: ${water.position.y} vs ${initialY}`,
    );
  } finally {
    world.dispose?.();
  }
});

test("animals have solid collision blocking traversal and supporting landing", () => {
  const scene = new THREE.Scene();
  const world = buildJerusalem("streets", scene);
  try {
    // Market donkey at (-9.5, 0, 8)
    const walker = createPlayer(-8.0, 0, 8);
    for (let frame = 0; frame < 60; frame++) {
      stepPlayer(
        walker,
        { x: 1, y: 0, jump: false, jumpHeld: false }, // moves west (-X) toward donkey
        1 / 60,
        0,
        world.solids,
      );
    }
    // Player should be physically blocked from crossing through the donkey
    assert.ok(
      walker.x > -9.0,
      `pack donkey must block walking player: x=${walker.x}`,
    );

    // Sheep at (39, 0, 31)
    const sheepWalker = createPlayer(37.5, 0, 31);
    for (let frame = 0; frame < 60; frame++) {
      stepPlayer(
        sheepWalker,
        { x: -1, y: 0, jump: false, jumpHeld: false }, // moves east (+X) toward sheep
        1 / 60,
        0,
        world.solids,
      );
    }
    assert.ok(
      sheepWalker.x < 38.6,
      `sheep must block walking player: x=${sheepWalker.x}`,
    );
  } finally {
    world.dispose?.();
  }
});

test("temple approach steps ascend northward and temple roof supports player at 9m", () => {
  const scene = new THREE.Scene();
  const world = buildJerusalem("streets", scene);
  try {
    // Approach steps lead north onto the platform at z = -47
    // When cameraYaw = 0, input { x: 0, y: -1 } moves north (-Z)
    const climber = createPlayer(23, 0, -44.5);
    for (let frame = 0; frame < 80; frame++) {
      stepPlayer(
        climber,
        { x: 0, y: -1, jump: false, jumpHeld: false }, // moves north (-Z)
        1 / 60,
        0,
        world.solids,
      );
    }
    assert.ok(
      climber.z <= -47.0,
      `climber ascended north onto platform: z=${climber.z}`,
    );
    assert.ok(
      climber.y >= 1.15,
      `climber reached platform top height: y=${climber.y}`,
    );

    // Temple roof supports player firmly at y = 9.0m (no sinking into cornice)
    const roofPlayer = createPlayer(28, 9.5, -61);
    for (let frame = 0; frame < 20; frame++) {
      stepPlayer(
        roofPlayer,
        { x: 0, y: 0, jump: false, jumpHeld: false },
        1 / 60,
        0,
        world.solids,
      );
    }
    assert.ok(
      roofPlayer.y >= 8.95 && roofPlayer.y <= 9.05,
      `player stands on top of temple roof: y=${roofPlayer.y}`,
    );
  } finally {
    world.dispose?.();
  }
});

test("all environmental text signs except LEHI'S HOUSE are removed", () => {
  const scene = new THREE.Scene();
  const world = buildJerusalem("streets", scene);
  try {
    // Verify removed signs
    const forbidden = [
      "WATERS OF SHILOAH",
      "INNER VAULT",
      "LABAN’S PALACE",
      "TREASURY",
      "SOUTH GATE",
      "TEMPLE PRECINCT",
    ];
    for (const name of forbidden) {
      assert.equal(
        scene.getObjectByName(name),
        undefined,
        `sign "${name}" must be removed`,
      );
    }

    // Lehi's House plaque remains
    const lehiPlaque = scene.getObjectByName("LEHI’S HOUSE plaque");
    assert.ok(lehiPlaque, "LEHI'S HOUSE plaque remains");
  } finally {
    world.dispose?.();
  }
});

test("city wall battlements are solid physical blocks", () => {
  const scene = new THREE.Scene();
  const world = buildJerusalem("streets", scene);
  try {
    const battlement = scene.getObjectByName("battlement");
    assert.ok(battlement, "city wall battlement exists");

    // Player running along the wall top at y = 8.0 towards a battlement at x = 10, z = 40
    const wallRunner = createPlayer(7.5, 8.0, 40);
    wallRunner.grounded = true;
    for (let frame = 0; frame < 60; frame++) {
      stepPlayer(
        wallRunner,
        { x: -1, y: 0, jump: false, jumpHeld: false }, // moves east (+X) toward battlement at x=10
        1 / 60,
        0,
        world.solids,
      );
    }
    // Battlement spans x in [10 - 1.2, 10 + 1.2] = [8.8, 11.2]. Player must be blocked.
    assert.ok(
      wallRunner.x < 8.6,
      `battlement must block running player on wall: x=${wallRunner.x}`,
    );
  } finally {
    world.dispose?.();
  }
});

test("follow camera does not get stranded when entering gap between walls leaving temple precinct", () => {
  const scene = new THREE.Scene();
  const world = buildJerusalem("streets", scene);
  try {
    // Starting on temple precinct platform at x = 6.8, z = -46, facing south (+Z)
    // When cameraYaw = 0, input { x: 0, y: 1 } moves south (+Z) into the gap
    const player = createPlayer(6.8, 1.2, -46);
    player.yaw = 0;
    const camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.08, 200);
    const follow = new FollowCamera(camera);
    follow.reset(player, 0, "streets");

    // Walk south into the corridor between palace rear wall and vault west wall
    for (let frame = 0; frame < 150; frame++) {
      stepPlayer(
        player,
        { x: 0, y: 1, jump: false, jumpHeld: false }, // moves south (+Z)
        1 / 60,
        0,
        world.solids,
      );
      follow.update(
        1 / 60,
        player,
        world.solids,
        { orbitX: 0, orbitY: 0, recenter: false },
        "streets",
      );

      // Camera must not be stranded far behind
      const dist = camera.position.distanceTo(
        new THREE.Vector3(player.x, player.y + 1, player.z),
      );
      assert.ok(
        dist < 8.5,
        `camera stranded when entering corridor at frame ${frame}: dist=${dist.toFixed(2)}m, camZ=${camera.position.z.toFixed(2)}, playerZ=${player.z.toFixed(2)}`,
      );
    }

    assert.ok(
      player.z > -33,
      `player entered deep into corridor: z=${player.z}`,
    );
    assert.ok(
      camera.position.z > -39,
      `camera followed player into or near the corridor: camZ=${camera.position.z}`,
    );
  } finally {
    world.dispose?.();
  }
});
