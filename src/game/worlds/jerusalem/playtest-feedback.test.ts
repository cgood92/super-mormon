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
    const ground = scene.getObjectByName("Jerusalem earth and desert road") as THREE.Mesh;
    assert.ok(ground, "ground mesh exists");
    assert.ok(ground.material instanceof THREE.MeshStandardMaterial);
    assert.ok(ground.material.map instanceof THREE.DataTexture, "ground has procedural texture map");

    // Palace back wall is at z = -28.5; ground must extend past it
    const bbox = new THREE.Box3().setFromObject(ground);
    assert.ok(bbox.min.z < -30, `ground must extend behind palace: minZ=${bbox.min.z}`);
    assert.ok(bbox.max.z > 115, `ground must extend past south desert road: maxZ=${bbox.max.z}`);

    // No street pavers or cross street paving seams
    const paver = scene.getObjectByName("street paver");
    assert.equal(paver, undefined, "random street pavers should be removed");
    const seam = scene.getObjectByName("cross street paving seam");
    assert.equal(seam, undefined, "cross street paving seams should be removed");

    // Laban's palace back floor has stone paving
    const palacePaving = scene.getObjectByName("palace interior stone paving") as THREE.Mesh;
    assert.ok(palacePaving, "palace interior stone paving exists");
    const palaceBox = new THREE.Box3().setFromObject(palacePaving);
    assert.ok(palaceBox.min.z <= -28.4, `palace paving covers rear corridor: minZ=${palaceBox.min.z}`);
    assert.ok(palaceBox.min.x <= -17.5, `palace paving covers west corridor: minX=${palaceBox.min.x}`);
    assert.ok(palaceBox.max.x >= 17.5, `palace paving covers east corridor: maxX=${palaceBox.max.x}`);
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
      if (obj.name === "Jerusalem dwelling" && obj instanceof THREE.Mesh) dwellings.push(obj);
      if (obj.name === "flat roof" && obj instanceof THREE.Mesh) roofs.push(obj);
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
    assert.equal(greenBox, undefined, "date palm leaf canopy green box should not be rendered");

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
    assert.ok(player.y >= palm.height - 0.7, `player climbs to near top of tree: y=${player.y}`);

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
    assert.equal(player.move, "handstand", "reaching top transitions into handstand");

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
    assert.equal(canopyWalker.grounded, true, "player lands on top of tree canopy");
    assert.ok(canopyWalker.y >= 4.8, `canopy walker standing at tree top: y=${canopyWalker.y}`);
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
    assert.ok(player.vz > 0, `wall kick pushes south away from wall: vz=${player.vz}`);
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
