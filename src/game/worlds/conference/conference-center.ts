import { galleryPaintingFile } from "./gallery-paintings";
import { buildWanderingElders } from "../missions/missionary-actors";
import * as THREE from "three";
import { label, painting } from "../../rendering/art";
import { STORY_ORDER, type StoryId } from "../../runtime/progression";
import { laterPainting } from "./gallery-layout";
import { paintingCollider } from "./gallery-entry";
import { paintingCaption } from "./gallery-caption";
import type { WorldData } from "../../runtime/worlds";
import {
  conferenceKit,
  conferencePalette as C,
  disposeConference,
} from "./conference-kit";
import { buildConferenceChristus } from "./conference-christus";
import { buildAuditorium } from "./conference-auditorium";
import { buildRooftop } from "./conference-rooftop";

const GALLERY_ARTWORK: Partial<Record<StoryId, string>> = {
  "broken-bow": "broken-bow.jpg",
  bountiful: "ship.jpg",
  voyage: "voyage.jpg",
  promised: "promised-land.jpg",
};

export const CONFERENCE_LEVELS = [0, 12, 24] as const;
export const CONFERENCE_ESCALATORS = [
  { x: -56, y: 0, startZ: 40, endZ: 6 },
  { x: 56, y: 12, startZ: 6, endZ: 40 },
  { x: -56, y: 24, startZ: 40, endZ: 6 },
] as const;
const stairHole = (x: number, z: number) =>
  Math.abs(Math.abs(x) - 56) < 5 && z > 6 && z < 40;
function tileFloor(group: THREE.Group, y: number, upper: boolean) {
  const geometry = new THREE.BoxGeometry(2.75, 0.035, 2.75),
    matrix = new THREE.Matrix4(),
    rotation = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      Math.PI / 4,
    );
  const points: [number, number, number][] = [];
  for (let a = -60; a <= 60; a++)
    for (let b = -60; b <= 60; b++) {
      const x = ((a - b) * 2.75) / Math.SQRT2,
        z = ((a + b) * 2.75) / Math.SQRT2;
      if (
        Math.abs(x) > 88 ||
        z < -102 ||
        z > 53 ||
        (z < 1 && Math.abs(x) < 67) ||
        (upper && stairHole(x, z))
      )
        continue;
      points.push([x, z, (a + b) & 1]);
    }
  for (let shade = 0; shade < 2; shade++) {
    const list = points.filter((p) => p[2] === shade),
      mesh = new THREE.InstancedMesh(
        geometry,
        new THREE.MeshStandardMaterial({
          color: shade ? 0xb5ad9c : 0xe7e1d2,
          roughness: 0.34,
          metalness: 0.06,
        }),
        list.length,
      );
    list.forEach(([x, z], i) => {
      matrix.compose(
        new THREE.Vector3(x, y + 0.025, z),
        rotation,
        new THREE.Vector3(1, 1, 1),
      );
      mesh.setMatrixAt(i, matrix);
    });
    mesh.name = "diagonal polished limestone checkerboard";
    mesh.receiveShadow = true;
    group.add(mesh);
  }
}
export function gallery(scene: THREE.Scene): WorldData {
  const group = new THREE.Group();
  group.name = "Conference Center";
  scene.add(group);
  const { add, decor, solids, batch } = conferenceKit(group);
  const priorBackground = scene.background,
    priorFog = scene.fog;
  scene.background = new THREE.Color(0xbacbd1);
  scene.fog = new THREE.Fog(0xbacbd1, 150, 380);
  group.add(new THREE.HemisphereLight(0xfff8e5, 0x6c7478, 2.6));
  const sun = new THREE.DirectionalLight(0xfff3da, 2);
  sun.position.set(-70, 100, 80);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {
    left: -120,
    right: 120,
    top: 120,
    bottom: -120,
    far: 250,
  });
  sun.shadow.camera.updateProjectionMatrix();
  group.add(sun);
  for (const y of CONFERENCE_LEVELS) {
    if (y === 0)
      add(0, -0.55, -25, 180, 0.55, 160, C.stone, "ground foundation");
    else {
      // Open wells accommodate actual continuous escalator stair surfaces.
      add(0, y - 0.5, 47.5, 180, 0.5, 15, C.stone, "south landing");
      add(0, y - 0.5, 2.5, 124, 0.5, 7, C.stone, "north landing");
      add(0, y - 0.5, 23, 100, 0.5, 34, C.stone, "central foyer slab");
      for (const side of [-1, 1]) {
        add(
          side * 76,
          y - 0.5,
          -30,
          28,
          0.5,
          140,
          C.stone,
          "side gallery slab",
        );
      }
    }
    tileFloor(group, y, y > 0);
    // Recessed ceiling panels and glowing circular coffers.
    decor(0, y + 10.9, 27, 100, 0.45, 55, C.pale, "foyer ceiling");
    for (const side of [-1, 1])
      decor(
        side * 76,
        y + 10.9,
        27,
        27,
        0.45,
        55,
        C.pale,
        "side foyer ceiling",
      );
    decor(0, y + 10.9, 47.5, 178, 0.45, 14, C.pale, "south ceiling");
    for (const x of [-77, -36, 0, 36, 77])
      for (const z of [12, 43]) {
        const ring = new THREE.Mesh(
          new THREE.CylinderGeometry(2.7, 2.7, 0.23, 32),
          new THREE.MeshStandardMaterial({ color: C.bronze }),
        );
        ring.position.set(x, y + 10.72, z);
        group.add(ring);
        const diffuser = new THREE.Mesh(
          new THREE.CylinderGeometry(2.36, 2.36, 0.25, 32),
          new THREE.MeshBasicMaterial({ color: 0xfff3c7 }),
        );
        diffuser.position.set(x, y + 10.57, z);
        group.add(diffuser);
      }
    for (const x of [-70, -40, 0, 40, 70])
      for (const z of [8, 43]) {
        add(x, y, z, 1.5, 10.9, 1.5, C.pale, "cream stone column");
        decor(x, y, z, 1.9, 0.5, 1.9, C.timber, "wood column foot");
        decor(x, y + 10.4, z, 2.2, 0.5, 2.2, C.stone, "column capital");
      }
    // Window bays span the south facade; fine dark mullions preserve the reference silhouette.
    for (let x = -81; x < 90; x += 18) {
      decor(x, y + 1, 54.6, 16, 9, 0.16, 0x9ebbc3, "daylight glazing");
      for (const dx of [-8, -4, 0, 4, 8])
        decor(
          x + dx,
          y,
          54.35,
          0.18,
          11,
          0.22,
          C.mullion,
          "black window mullion",
        );
      for (const h of [1, 5, 10])
        decor(x, y + h, 54.25, 16, 0.18, 0.25, C.mullion, "window transom");
      decor(x, y, 54.1, 17, 0.65, 0.6, C.timber, "warm wood window sill");
    }
    add(0, y, 55.2, 180, 11, 0.45, C.stone, "facade boundary");
    for (const side of [-1, 1]) {
      add(side * 90, y, -25, 0.6, 11, 160, C.stone, "outer side wall");
      decor(
        side * 78,
        y + 10.9,
        -50,
        23,
        0.35,
        102,
        C.pale,
        "side hall ceiling",
      );
      for (let z = -90; z < 0; z += 18) {
        decor(side * 89.6, y + 1, z, 0.2, 8, 14, 0xabc1c5, "side hall window");
        for (const dz of [-7, 0, 7])
          decor(
            side * 89.3,
            y,
            z + dz,
            0.22,
            10,
            0.18,
            C.mullion,
            "side window mullion",
          );
      }
    }
    add(0, y, -104.5, 180, 11, 0.6, C.stone, "north building wall");
    // Open warm wood surrounds lead directly into each auditorium level.
    for (const x of [-10, 10])
      decor(x, y, 1, 1.1, 6, 0.7, C.timber, "auditorium door surround");
    decor(0, y + 6, 1, 21, 0.9, 0.7, C.timber, "auditorium lintel");
    label(
      group,
      y === 0
        ? "AUDITORIUM · ALL LEVELS OPEN"
        : `AUDITORIUM · LEVEL ${y / 12 + 1}`,
      0,
      y + 7.2,
      1.5,
      12,
      0.85,
    );
    label(group, "ROOF GARDENS ↑  ·  ESCALATORS", -53, y + 6.2, 41, 14, 0.8);
  }
  // Wide paired escalator belts with small climbable risers and bronze rails.
  for (const flight of CONFERENCE_ESCALATORS) {
    const count = 40,
      run = (flight.endZ - flight.startZ) / count;
    for (let i = 0; i < count; i++)
      add(
        flight.x,
        flight.y + i * 0.3,
        flight.startZ + run * (i + 0.5),
        7,
        0.3,
        Math.abs(run),
        0x777d7b,
        "escalator tread",
      );
    for (const dx of [-3.8, 3.8]) {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(
          0.2,
          0.18,
          Math.hypot(flight.endZ - flight.startZ, 12),
        ),
        new THREE.MeshStandardMaterial({ color: C.bronze }),
      );
      rail.position.set(
        flight.x + dx,
        flight.y + 7,
        (flight.startZ + flight.endZ) / 2,
      );
      rail.rotation.x = -Math.atan(12 / (flight.endZ - flight.startZ));
      group.add(rail);
    }
  }
  // Six story paintings form one clearly legible ground-floor gallery.
  const stories = [
    ["streets", "streets.jpg", "JERUSALEM STREETS"],
    ["palace", "palace.jpg", "LABAN’S PALACE"],
    ["house", "house.jpg", "LEHI’S HOUSE"],
    ["trade", "trade.jpg", "THE TREASURE OFFER"],
    ["night", "night.jpg", "JERUSALEM BY NIGHT"],
    ["tree", "tree.jpg", "THE TREE OF LIFE"],
  ] as const;
  const portals: NonNullable<WorldData["portals"]> = [];
  add(0, 0, 15, 46, 6, 0.45, C.pale, "story gallery wall");
  decor(0, 0, 15.3, 46, 0.45, 0.2, C.timber, "gallery wood skirting");
  stories.forEach(([id, file, title], i) => {
    const x = -20 + i * 8;
    painting(
      group,
      x,
      0.7,
      15.3,
      `${import.meta.env?.BASE_URL ?? "/"}art/gallery/${file}`,
      0xffffff,
    );
    paintingCaption(group, solids, title, x, 0, 15.7, 6);
    const portal = {
      id,
      x,
      y: 0.59,
      z: 15.58,
      title,
      facing: "north" as const,
    };
    portals.push(portal);
    solids.push(paintingCollider(portal));
  });
  // Later stories are hung in side hallways, then on successively higher floors.
  for (const { id, title, x, y, z: wallZ } of STORY_ORDER.slice(6).map(
    laterPainting,
  )) {
    // Replace an existing wall exhibit, leaving the hallway open from end to end.
    const side = Math.sign(x);
    const exhibit = new THREE.Group();
    exhibit.name = `${id} wall exhibit`;
    exhibit.position.set(x - side * 0.28, y, wallZ);
    exhibit.rotation.y = (side * Math.PI) / 2;
    group.add(exhibit);
    const galleryFile =
      galleryPaintingFile(id) ??
      (GALLERY_ARTWORK[id]
        ? `${import.meta.env?.BASE_URL ?? "/"}art/gallery/${GALLERY_ARTWORK[id]}`
        : undefined) ??
      (id === "title-liberty"
        ? `${import.meta.env?.BASE_URL ?? "/"}art/gallery/title-liberty.jpg`
        : undefined);
    const image = painting(exhibit, 0, 0.7, 0, galleryFile ?? "", 0xffffff);
    if (!galleryFile) image.onBeforeRender = () => {};
    image.name = `${id} story painting`;
    if (!galleryFile && typeof document !== "undefined") {
      const canvas = document.createElement("canvas");
      canvas.width = 384;
      canvas.height = 512;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const ocean = id === "voyage";
        ctx.fillStyle = ocean ? "#577c9a" : "#d6b77a";
        ctx.fillRect(0, 0, 384, 512);
        ctx.fillStyle = "#fff0c8";
        ctx.beginPath();
        ctx.arc(290, 88, 35, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = ocean ? "#255b78" : "#608a88";
        ctx.fillRect(0, 270, 384, 242);
        if (!ocean) {
          ctx.fillStyle = "#d4b884";
          ctx.beginPath();
          ctx.moveTo(0, 290);
          ctx.lineTo(384, 380);
          ctx.lineTo(384, 512);
          ctx.lineTo(0, 512);
          ctx.fill();
          ctx.fillStyle = "#52694c";
          ctx.beginPath();
          ctx.moveTo(0, 275);
          ctx.lineTo(70, 105);
          ctx.lineTo(135, 305);
          ctx.fill();
        }
        ctx.fillStyle = "#714a30";
        ctx.beginPath();
        ctx.moveTo(72, 329);
        ctx.lineTo(336, 312);
        ctx.lineTo(292, 375);
        ctx.lineTo(112, 375);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#392f29";
        ctx.fillRect(198, 135, 8, 200);
        ctx.fillStyle = ocean ? "#f8e9c8" : "#c5a470";
        ctx.beginPath();
        ctx.moveTo(212, 145);
        ctx.lineTo(310, 295);
        ctx.lineTo(212, 295);
        ctx.closePath();
        ctx.fill();
        if (!ocean) {
          ctx.strokeStyle = "#ead7a8";
          ctx.lineWidth = 7;
          for (let rib = 110; rib < 320; rib += 25) {
            ctx.beginPath();
            ctx.moveTo(rib, 325);
            ctx.lineTo(rib + 12, 365);
            ctx.stroke();
          }
          ctx.fillStyle = "#33495b";
          ctx.fillRect(55, 354, 19, 48);
          ctx.fillStyle = "#b87546";
          ctx.beginPath();
          ctx.arc(65, 344, 11, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#77543d";
          ctx.fillRect(36, 406, 115, 12);
        } else {
          ctx.strokeStyle = "#c3dedc";
          ctx.lineWidth = 4;
          for (let wave = 395; wave < 510; wave += 34) {
            ctx.beginPath();
            ctx.moveTo(25, wave);
            ctx.quadraticCurveTo(95, wave - 20, 170, wave);
            ctx.quadraticCurveTo(240, wave + 20, 355, wave);
            ctx.stroke();
          }
        }
        if (id === "promised" || id === "vineyard") {
          ctx.fillStyle = "#b9d4d3";
          ctx.fillRect(0, 0, 384, 512);
          ctx.fillStyle = "#789560";
          ctx.fillRect(0, 260, 384, 252);
          if (id === "promised") {
            ctx.fillStyle = "#cfba8f";
            ctx.fillRect(90, 220, 205, 135);
            ctx.fillStyle = "#806548";
            ctx.beginPath();
            ctx.moveTo(70, 220);
            ctx.lineTo(190, 155);
            ctx.lineTo(315, 220);
            ctx.fill();
            ctx.fillStyle = "#70523a";
            ctx.fillRect(170, 285, 40, 70);
            ctx.fillStyle = "#e4d09e";
            ctx.beginPath();
            ctx.moveTo(0, 512);
            ctx.lineTo(175, 355);
            ctx.lineTo(210, 355);
            ctx.lineTo(290, 512);
            ctx.fill();
          } else {
            for (const [tx, ty, scale] of [
              [190, 310, 1.5],
              [65, 390, 0.65],
              [310, 400, 0.8],
            ]) {
              ctx.fillStyle = "#70513c";
              ctx.fillRect(
                tx - 7 * scale,
                ty - 50 * scale,
                14 * scale,
                90 * scale,
              );
              ctx.fillStyle = "#4e6b47";
              for (let crown = 0; crown < 5; crown++) {
                ctx.beginPath();
                ctx.ellipse(
                  tx + Math.cos(crown * 1.4) * 24 * scale,
                  ty - 80 * scale + Math.sin(crown * 1.4) * 22 * scale,
                  42 * scale,
                  30 * scale,
                  0,
                  0,
                  Math.PI * 2,
                );
                ctx.fill();
              }
            }
          }
        }
        if (id === "broken-bow") {
          ctx.fillStyle = "#b7ccd0";
          ctx.fillRect(0, 0, 384, 512);
          for (const [mx, my, color] of [
            [-40, 170, "#b59b7b"],
            [170, 105, "#8d7a63"],
            [60, 240, "#d2b48a"],
          ] as const) {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(mx - 120, 512);
            ctx.lineTo(mx + 100, my);
            ctx.lineTo(mx + 310, 512);
            ctx.fill();
          }
          ctx.strokeStyle = "#795439";
          ctx.lineWidth = 11;
          ctx.beginPath();
          ctx.moveTo(90, 280);
          ctx.quadraticCurveTo(170, 360, 90, 450);
          ctx.stroke();
          ctx.strokeStyle = "#eee1b7";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(90, 280);
          ctx.lineTo(120, 365);
          ctx.lineTo(90, 450);
          ctx.stroke();
          ctx.strokeStyle = "#584b3a";
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(100, 365);
          ctx.lineTo(230, 345);
          ctx.stroke();
          ctx.fillStyle = "#655a47";
          ctx.beginPath();
          ctx.ellipse(280, 303, 33, 18, 0, 0, Math.PI * 2);
          ctx.fill();
          for (const dx of [-23, -10, 17, 27])
            ctx.fillRect(280 + dx, 307, 5, 37);
          ctx.beginPath();
          ctx.ellipse(310, 280, 10, 23, -0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#655a47";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(311, 260);
          ctx.quadraticCurveTo(304, 215, 288, 225);
          ctx.moveTo(316, 262);
          ctx.quadraticCurveTo(325, 220, 309, 222);
          ctx.stroke();
        }
        if (id === "jacob" || id === "waters") {
          ctx.fillStyle = id === "waters" ? "#a8c9c5" : "#c5d2d1";
          ctx.fillRect(0, 0, 384, 512);
          ctx.fillStyle = id === "waters" ? "#71865a" : "#c5ad83";
          ctx.fillRect(0, 245, 384, 267);
          if (id === "waters") {
            ctx.fillStyle = "#448fa3";
            ctx.beginPath();
            ctx.ellipse(200, 390, 145, 77, -0.1, 0, Math.PI * 2);
            ctx.fill();
            for (const [x, y] of [
              [20, 245],
              [65, 215],
              [310, 230],
              [360, 190],
            ]) {
              ctx.fillStyle = "#65543b";
              ctx.fillRect(x - 6, y, 12, 110);
              ctx.fillStyle = "#41674a";
              ctx.beginPath();
              ctx.ellipse(x, y, 57, 76, 0, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.fillStyle = "#f0e2c0";
            ctx.fillRect(180, 280, 25, 70);
            ctx.fillStyle = "#987859";
            ctx.beginPath();
            ctx.arc(192, 270, 13, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillStyle = "#b69a73";
            ctx.fillRect(20, 150, 120, 140);
            ctx.fillRect(260, 170, 105, 130);
            for (const [x, color] of [
              [145, "#536b83"],
              [235, "#69526f"],
            ] as const) {
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.moveTo(x - 17, 310);
              ctx.lineTo(x + 17, 310);
              ctx.lineTo(x + 27, 425);
              ctx.lineTo(x - 27, 425);
              ctx.fill();
              ctx.fillStyle = "#b88d67";
              ctx.beginPath();
              ctx.arc(x, 291, 18, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
        if (id === "ammon") {
          ctx.fillStyle = "#b5d6ce";
          ctx.fillRect(0, 0, 384, 512);
          ctx.fillStyle = "#879b64";
          ctx.fillRect(0, 255, 384, 257);
          ctx.fillStyle = "#68aeb5";
          ctx.beginPath();
          ctx.ellipse(220, 360, 135, 46, 0, 0, Math.PI * 2);
          ctx.fill();
          for (const [x, y] of [
            [100, 395],
            [185, 430],
            [280, 411],
            [315, 340],
          ]) {
            ctx.fillStyle = "#eee1c2";
            ctx.beginPath();
            ctx.ellipse(x, y, 23, 17, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#765c46";
            ctx.fillRect(x + 17, y - 5, 9, 11);
            ctx.fillRect(x - 12, y + 10, 4, 18);
            ctx.fillRect(x + 10, y + 10, 4, 18);
          }
          ctx.fillStyle = "#8c5145";
          ctx.beginPath();
          ctx.moveTo(63, 290);
          ctx.lineTo(86, 290);
          ctx.lineTo(97, 370);
          ctx.lineTo(52, 370);
          ctx.fill();
          ctx.fillStyle = "#b78a65";
          ctx.beginPath();
          ctx.arc(74, 276, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#705035";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(93, 235, 38, 18, -0.4, 0, Math.PI * 2);
          ctx.moveTo(74, 305);
          ctx.lineTo(120, 230);
          ctx.stroke();
        }
        if (
          [
            "title-liberty",
            "lehonti",
            "morianton",
            "teancum",
            "gid",
            "nephihah",
          ].includes(id)
        ) {
          const night = id === "teancum" || id === "gid";
          ctx.fillStyle = night ? "#1d2949" : "#95b9bf";
          ctx.fillRect(0, 0, 384, 512);
          ctx.fillStyle = "#62765c";
          ctx.beginPath();
          ctx.moveTo(0, 390);
          ctx.lineTo(160, 90);
          ctx.lineTo(384, 380);
          ctx.lineTo(384, 512);
          ctx.lineTo(0, 512);
          ctx.fill();
          if (id === "lehonti" || id === "morianton") {
            ctx.strokeStyle = "#c0ad80";
            ctx.lineWidth = 15;
            ctx.beginPath();
            ctx.moveTo(190, 480);
            ctx.lineTo(290, 350);
            ctx.lineTo(110, 270);
            ctx.lineTo(180, 160);
            ctx.stroke();
          } else {
            ctx.fillStyle = "#aa916d";
            ctx.fillRect(20, 310, 344, 202);
            for (let n = 0; n < 6; n++) ctx.fillRect(20 + n * 58, 280, 30, 40);
            ctx.fillStyle = "#fff1ce";
            ctx.beginPath();
            ctx.arc(292, 76, 23, 0, Math.PI * 2);
            ctx.fill();
            if (id === "nephihah") {
              ctx.strokeStyle = "#dbc49c";
              ctx.lineWidth = 6;
              ctx.beginPath();
              ctx.moveTo(150, 470);
              ctx.lineTo(150, 255);
              ctx.moveTo(195, 470);
              ctx.lineTo(195, 255);
              ctx.stroke();
              for (let n = 0; n < 10; n++)
                ctx.fillRect(150, 270 + n * 20, 45, 5);
            }
          }
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        (image.material as THREE.MeshBasicMaterial).map = texture;
      }
    }
    paintingCaption(exhibit, solids, title, 0, 0, 0.4, 7);
    const portal = {
      id,
      x,
      y: y + 0.59,
      z: wallZ,
      title,
      facing: side > 0 ? ("west" as const) : ("east" as const),
    };
    portals.push(portal);
    solids.push(paintingCollider(portal));
  }
  // Ground-floor movement studio: wide east doorway and clear hall passages at z=0/43.
  add(-78, 0, 4, 20, 9.8, 0.35, C.pale, "movement studio north wall");
  add(-78, 0, 40, 20, 9.8, 0.35, C.pale, "movement studio south wall");
  add(-88, 0, 22, 0.35, 9.8, 36, C.pale, "movement studio west wall");
  add(-68, 0, 15.5, 0.35, 9.8, 23, C.pale, "movement studio east north wall");
  add(-68, 0, 37.5, 0.35, 9.8, 5, C.pale, "movement studio east south wall");
  add(-68, 7.4, 31, 0.35, 2.4, 8, C.pale, "movement studio doorway lintel");
  add(-82, 0, 30, 3.2, 2.25, 3.2, 0xa5b6a5, "practice ledge");
  add(-84, 0, 14, 0.35, 3.6, 0.35, C.timber, "practice pole");
  add(-75.6, 0, 14, 0.35, 1.4, 3.3, 0x879a91);
  add(-72.4, 0, 14, 0.35, 1.4, 3.3, 0x879a91);
  add(-74, 1.02, 14, 3.5, 0.38, 3.3, 0xc2c9be);
  add(-78, 0, 18, 1.8, 1, 4.5, 0xb4c2b0);
  add(-86, 0, 10, 0.55, 4.5, 5, 0x9dada6);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.4, 0.06, 8, 48),
    new THREE.MeshBasicMaterial({ color: 0xd3aa56 }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(-81, 0.07, 7);
  group.add(ring);
  for (const y of [12, 24])
    for (const x of [-62, -50, 50, 62])
      add(x, y, 23, 0.18, 1.1, 32, C.bronze, "escalator well balustrade");
  // The roof opening is wider than the lower wells; guard its exact slab edges.
  for (const x of [-63, -49])
    add(x, 36, 23, 0.2, 1.15, 34, C.bronze, "roof escalator shaft rail");
  add(-56, 36, 40, 14.2, 1.15, 0.2, C.bronze, "roof shaft south rail");
  // Warm auditorium boundary with three permanently open entries on each level.
  // Side doors align with the escalator approaches; the foyer at z=0 stays clear.
  for (const y of CONFERENCE_LEVELS) {
    for (const [left, right] of [
      [-66, -60.5],
      [-51.5, -8],
      [8, 51.5],
      [60.5, 66],
    ]) {
      const width = right - left,
        x = (left + right) / 2;
      add(x, y, -2, width, 9.5, 0.6, C.pale, "auditorium foyer boundary");
      decor(
        x,
        y,
        -1.65,
        width,
        2.2,
        0.18,
        C.timber,
        "auditorium wood wainscot",
      );
      decor(
        x,
        y + 8.7,
        -1.62,
        width,
        0.8,
        0.2,
        C.timber,
        "auditorium wood cornice",
      );
    }
    for (const [x, width] of [
      [-56, 9],
      [0, 16],
      [56, 9],
    ]) {
      for (const side of [-1, 1])
        decor(
          x + (side * width) / 2,
          y,
          -1.6,
          0.55,
          6.5,
          0.3,
          C.timber,
          "open auditorium door jamb",
        );
      decor(
        x,
        y + 6.2,
        -1.6,
        width + 0.55,
        0.65,
        0.3,
        C.timber,
        "open auditorium door head",
      );
      add(
        x,
        y + 6.8,
        -2,
        width,
        2.7,
        0.6,
        C.pale,
        "auditorium doorway transom",
      );
    }
  }
  // Unassigned wall bays retain their original landscape exhibits.
  const exhibitPositions: { side: number; y: number; z: number }[] = [];
  for (const y of CONFERENCE_LEVELS)
    for (const side of [-1, 1])
      for (const z of [-20, -43, -66, -89]) {
        if (
          portals.some(
            (p) => Math.sign(p.x) === side && p.y === y + 0.59 && p.z === z,
          )
        )
          continue;
        exhibitPositions.push({ side, y, z });
        add(
          side * 67,
          y + 2,
          z,
          0.4,
          4.7,
          9.2,
          C.timber,
          "landscape exhibit wood frame",
        );
        decor(
          side * 67.23,
          y + 2.2,
          z,
          0.1,
          4.3,
          8.8,
          C.bronze,
          "landscape exhibit inner frame",
        );
        decor(
          side * 67.3,
          y + 2.35,
          z,
          0.08,
          4,
          8.5,
          0xbcd2d5,
          "landscape exhibit sky",
        );
      }
  for (const [layer, color, heights] of [
    [0, 0x8a9caa, [1.2, 2.3, 1.6, 3.4, 2.2, 2.8, 1.4]],
    [1, 0x677f7b, [0.8, 1.6, 1.1, 2.2, 1.3, 1.8, 0.8]],
    [2, 0xb0a071, [0.5, 0.7, 0.4, 0.8, 0.6, 0.9, 0.6]],
  ] as const) {
    const shape = new THREE.Shape();
    shape.moveTo(-4.2, 0);
    heights.forEach((height, index) =>
      shape.lineTo(-4.2 + index * 1.4, height),
    );
    shape.lineTo(4.2, 0);
    shape.closePath();
    const artwork = new THREE.InstancedMesh(
      new THREE.ShapeGeometry(shape),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }),
      exhibitPositions.length,
    );
    const matrix = new THREE.Matrix4(),
      rotation = new THREE.Quaternion();
    exhibitPositions.forEach(({ side, y, z }, index) => {
      rotation.setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        (side * Math.PI) / 2,
      );
      matrix.compose(
        new THREE.Vector3(side * (67.36 + layer * 0.02), y + 2.35, z),
        rotation,
        new THREE.Vector3(1, 1, 1),
      );
      artwork.setMatrixAt(index, matrix);
    });
    artwork.name = "original mountain landscape hallway exhibits";
    group.add(artwork);
  }
  batch();
  const christus = buildConferenceChristus(group);
  solids.push(...christus.solids);
  const auditorium = buildAuditorium(group),
    roof = buildRooftop(group);
  solids.push(...auditorium.solids, ...roof.solids);
  const elders = buildWanderingElders(group, solids);
  elders.update(0);
  let disposed = false;
  return {
    name: "Conference Center",
    secretEntrance: elders.point,
    update: (dt, player) => {
      advanceEscalator(player, dt);
      elders.update(dt, player);
    },
    subtitle: "Explore three floors, the auditorium and roof gardens",
    spawn: { x: 0, y: 0, z: 36, yaw: Math.PI },
    landmarks: [
      ...christus.landmarks,
      { name: "Movement studio", x: -74, y: 0, z: 35 },
      { name: "Story gallery", x: 0, y: 0, z: 20 },
      { name: "Auditorium ground entrance", x: 0, y: 0, z: -2 },
      { name: "Auditorium second floor", x: 0, y: 12, z: -2 },
      { name: "Auditorium third floor", x: 0, y: 24, z: -2 },
      ...roof.landmarks,
    ],
    solids,
    portals,
    organ: auditorium.organ,
    climbables: [
      { id: "gallery-pole", x: -84, z: 14, y: 0, height: 3.6, radius: 0.2 },
    ],
    tokens: [
      { id: "arch", x: -74, y: 0.4, z: 14 },
      { id: "ledge", x: -82, y: 2.75, z: 30 },
      { id: "pole", x: -84, y: 4.05, z: 14 },
      { id: "jump", x: -78, y: 1.5, z: 18 },
      { id: "wall", x: -84.8, y: 2.7, z: 10 },
      { id: "explore", x: -73, y: 0.55, z: 11 },
    ],
    carryables: [
      {
        id: "practice-bundle",
        name: "Practice bundle",
        x: -73,
        y: 0.3,
        z: 8,
      },
    ],
    delivery: { x: -81, y: 0, z: 7, radius: 1.4 },
    tutorials: practiceLessons(),
    practiceBounds: { minX: -87, maxX: -69, minZ: 4, maxZ: 39 },
    goal: { x: 0, y: 0, z: 17.5, radius: 3 },
    bounds: { minX: -89, maxX: 89, minZ: -104, maxZ: 54 },
    dispose() {
      if (disposed) return;
      disposed = true;
      auditorium.organ.dispose();
      elders.dispose();
      disposeConference(group);
      scene.background = priorBackground;
      scene.fog = priorFog;
    },
  };
}

function practiceLessons(): NonNullable<WorldData["tutorials"]> {
  return [
    ["arch", "Crawl", "Use {crouch} and move beneath the low arch.", -74, -61],
    [
      "ledge",
      "Jump and climb",
      "Jump toward the ledge, then {up} or {jump} to pull up. {crouch} lets go.",
      -82,
      -45,
    ],
    [
      "pole",
      "Climb the pole",
      "Jump toward the pole. Use {up} / {down}; {jump} springs away.",
      -83,
      -62,
    ],
    [
      "jump",
      "Chain jumps",
      "Press {jump} again as you LAND for a double jump. Chain a third landing jump.",
      -78,
      -57,
    ],
    [
      "wall",
      "Wall kick",
      "Jump toward the wall, then press {jump} to kick away.",
      -84,
      -67,
    ],
    [
      "explore",
      "Carry and deliver",
      "{action} picks up the bundle. {crouch} + {action} sets it in the gold ring.",
      -73,
      -70,
    ],
    [
      "long-jump",
      "Long jump",
      "Run, use {crouch}, then {jump} to leap forward. Hold {jump}.",
      -73,
      -54,
    ],
    [
      "backflip",
      "Backflip",
      "Stand still. Use {crouch}, then {jump} to flip backward.",
      -73,
      -61,
    ],
    [
      "sideflip",
      "Side somersault",
      "Run one way, quickly reverse direction, and press {jump}.",
      -80,
      -40,
    ],
  ].map(([id, title, instruction, x, z]) => ({
    id: String(id),
    title: String(title),
    instruction: String(instruction),
    x: Number(x),
    y: 0,
    z: Number(z) + 78,
    radius: 3,
  }));
}

/** Slow moving treads assist grounded visitors; normal movement can overcome the belt. */
export function advanceEscalator(
  player: { x: number; y: number; z: number; grounded: boolean },
  dt: number,
): boolean {
  if (!player.grounded || !Number.isFinite(dt) || dt <= 0) return false;
  for (const flight of CONFERENCE_ESCALATORS) {
    if (Math.abs(player.x - flight.x) > 3.1) continue;
    const direction = Math.sign(flight.endZ - flight.startZ),
      distance = (player.z - flight.startZ) * direction,
      length = Math.abs(flight.endZ - flight.startZ),
      treadDepth = length / 40;
    if (distance < 0 || distance >= length) continue;
    const top =
      flight.y + 0.3 * Math.min(40, Math.floor(distance / treadDepth) + 1);
    if (Math.abs(player.y - top) > 0.36) continue;
    const next = Math.min(length, distance + 0.9 * Math.min(dt, 0.1));
    player.z = flight.startZ + direction * next;
    // Step-up can already have placed the leading foot on the next tread.
    // Belt motion must never pull it back down inside that tread.
    player.y = Math.max(
      player.y,
      flight.y + 0.3 * Math.min(40, Math.floor(next / treadDepth) + 1),
    );
    return true;
  }
  return false;
}
