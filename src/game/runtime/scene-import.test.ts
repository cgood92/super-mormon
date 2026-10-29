import test from "node:test";
import assert from "node:assert/strict";
import { importScene } from "./scene-import";

test("scene import retries a transient failure without reloading the page", async () => {
  let attempts = 0;
  const result = await importScene("scene", async () => {
    if (++attempts === 1)
      throw new TypeError("Failed to fetch dynamically imported module");
    return "ready";
  });
  assert.equal(result, "ready");
  assert.equal(attempts, 2);
});
test("an old tab can load the currently deployed scene after its old chunk disappears", async () => {
  const files: string[] = [];
  const result = await importScene(
    "src/game/worlds/missions/olive-vineyard.ts",
    async () => {
      throw new TypeError("old chunk 404");
    },
    {
      manifest: async () => ({
        "src/game/worlds/missions/olive-vineyard.ts": {
          file: "assets/olive-vineyard-new.js",
        },
      }),
      load: async (file) => {
        files.push(file);
        return "current grove";
      },
    },
  );
  assert.equal(result, "current grove");
  assert.deepEqual(files, ["assets/olive-vineyard-new.js"]);
});
test("missing or unsafe deployment entries fail cleanly", async () => {
  for (const file of ["https://other.example/code.js", "assets/../code.js"]) {
    await assert.rejects(
      importScene(
        "scene",
        async () => {
          throw new Error("download failed");
        },
        {
          manifest: async () => ({ scene: { file } }),
          load: async () => {
            assert.fail("must not import an unsafe entry");
          },
        },
      ),
      /download failed/,
    );
  }
});
