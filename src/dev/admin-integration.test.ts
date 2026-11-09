import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "vite";

test("Vite dev server responds to /admin and /admin/ with admin HTML", async () => {
  const server = await createServer({
    configFile: "./vite.config.ts",
    server: { port: 5198, host: "127.0.0.1" },
  });
  await server.listen();
  const address = server.httpServer?.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const res = await fetch(`${baseUrl}/admin`);
    assert.equal(res.status, 200);
    assert.ok(res.headers.get("content-type")?.includes("text/html"));
    const text = await res.text();
    assert.ok(text.includes("Super Mormon"));
    assert.ok(text.includes("Local Dev Only"));
    assert.ok(text.includes("?scene=bountiful"));
    assert.ok(text.includes("?scene=broken-bow"));
    assert.ok(text.includes("?scene=samuel"));

    const slashRes = await fetch(`${baseUrl}/admin/`);
    assert.equal(slashRes.status, 200);
    const slashText = await slashRes.text();
    assert.ok(slashText.includes("Super Mormon"));
  } finally {
    await server.close();
  }
});
