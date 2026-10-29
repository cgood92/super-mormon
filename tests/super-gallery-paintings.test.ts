import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import test from "node:test";
import {
  GALLERY_PAINTINGS,
  galleryPaintingFile,
} from "../src/super/gallery-paintings";

test("all nine later paintings have bounded JPEG assets and stable URLs", () => {
  assert.equal(Object.keys(GALLERY_PAINTINGS).length, 9);
  for (const [id, file] of Object.entries(GALLERY_PAINTINGS)) {
    const path = new URL(`../public/art/gallery/${file}`, import.meta.url);
    const bytes = readFileSync(path);
    assert.equal(bytes.readUInt16BE(0), 0xffd8, id);
    assert.ok(statSync(path).size < 400_000, `${id} stays suitable for mobile`);
    assert.equal(galleryPaintingFile(id), `/art/gallery/${file}`);
  }
  assert.equal(galleryPaintingFile("moroni"), undefined);
  assert.equal(galleryPaintingFile("nephi"), undefined);
});

test("generated later paintings preserve the shared lazy texture lifecycle", () => {
  const hub = readFileSync(
    new URL("../src/super/conference-center.ts", import.meta.url),
    "utf8",
  );
  assert.match(hub, /if \(!galleryFile\) image.onBeforeRender/);
  assert.match(hub, /if \(!galleryFile && typeof document/);
  const art = readFileSync(
    new URL("../src/super/art.ts", import.meta.url),
    "utf8",
  );
  assert.match(art, /image.onBeforeRender/);
  assert.match(art, /texture\?\.dispose\(\)/);
});
