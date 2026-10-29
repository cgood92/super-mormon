import test from "node:test";
import assert from "node:assert/strict";
import { layoutSign } from "./sign-layout";

// A deterministic proportional font metric makes geometry checks independent of DOM.
const measure = (text: string, size: number) =>
  Array.from(text).reduce(
    (sum, c) => sum + (c === " " ? 0.3 : c === "I" ? 0.3 : 0.61) * size,
    0,
  );
for (const [words, width, height] of [
  ["STORY GALLERY", 25, 1],
  ["AUDITORIUM · ALL LEVELS OPEN", 12, 0.85],
  ["ROOF GARDENS ↑ ESCALATORS", 14, 0.8],
  [
    "A long painting caption explaining the journey through the wilderness",
    6,
    0.52,
  ],
  [
    "An extraordinarily long inscription with many words for a taller plaque",
    3,
    1.4,
  ],
  ["超長文字列ABCDEFGHIJKLMN", 2, 0.8],
] as const) {
  test(`fits complete sign text at natural aspect: ${words}`, () => {
    const layout = layoutSign(words, width, height, measure, 2);
    assert.ok(
      Math.abs(layout.canvasWidth - (layout.canvasHeight * width) / height) <=
        1,
    );
    assert.ok(layout.canvasWidth <= 2048 && layout.canvasHeight <= 2048);
    assert.equal(
      layout.lines
        .map((line) => line.text)
        .join("")
        .replace(/\s/g, ""),
      words.replace(/\s/g, ""),
    );
    for (const line of layout.lines) {
      assert.ok(
        measure(line.text, layout.fontSize) <=
          layout.canvasWidth - 2 * layout.padding + 0.01,
      );
      assert.ok(line.y - layout.fontSize / 2 >= layout.padding - 0.01);
      assert.ok(
        line.y + layout.fontSize / 2 <=
          layout.canvasHeight - layout.padding + 0.01,
      );
    }
    if (height > 1) assert.ok(layout.lines.length > 1);
  });
}
