import assert from "node:assert/strict";
import test from "node:test";
import { adminDevPlugin, createAdminMiddleware } from "./admin-plugin";

type MockRes = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  setHeader: (k: string, v: string) => void;
  end: (chunk?: string) => void;
};

function createMockRes(): MockRes {
  const res: MockRes = {
    statusCode: 0,
    headers: {},
    body: "",
    setHeader(k: string, v: string) {
      res.headers[k.toLowerCase()] = v;
    },
    end(chunk?: string) {
      if (chunk) res.body += chunk;
    },
  };
  return res;
}

test("createAdminMiddleware responds with HTML for /admin and /admin/", () => {
  const middleware = createAdminMiddleware("/");

  for (const url of ["/admin", "/admin/", "/admin?query=1"]) {
    const req = { url, method: "GET" } as any;
    const res = createMockRes();
    let nextCalled = false;

    middleware(req, res as any, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false, `next() should not be called for ${url}`);
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers["content-type"], "text/html; charset=utf-8");
    assert.ok(res.body.includes("Super Mormon"));
    assert.ok(res.body.includes("?scene=bountiful"));
  }
});

test("createAdminMiddleware handles custom base path", () => {
  const middleware = createAdminMiddleware("/super-mormon/");

  for (const url of ["/super-mormon/admin", "/super-mormon/admin/", "/admin"]) {
    const req = { url, method: "GET" } as any;
    const res = createMockRes();
    let nextCalled = false;

    middleware(req, res as any, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false, `next() should not be called for ${url}`);
    assert.equal(res.statusCode, 200);
    assert.ok(res.body.includes('href="/super-mormon/?scene=bountiful"'));
  }
});

test("createAdminMiddleware ignores non-admin paths and non-GET methods", () => {
  const middleware = createAdminMiddleware("/");

  // Non-matching path
  let nextCalled = false;
  const res1 = createMockRes();
  middleware({ url: "/index.html", method: "GET" } as any, res1 as any, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true);
  assert.equal(res1.statusCode, 0);

  // Non-GET method on /admin
  nextCalled = false;
  const res2 = createMockRes();
  middleware({ url: "/admin", method: "POST" } as any, res2 as any, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true);
  assert.equal(res2.statusCode, 0);
});

test("adminDevPlugin registers middleware in configureServer and configurePreviewServer", () => {
  const plugin = adminDevPlugin("/");
  assert.equal(plugin.name, "admin-dev-scene-menu");

  let serverMiddleware: any = null;
  plugin.configureServer?.({
    middlewares: {
      use: (fn: any) => {
        serverMiddleware = fn;
      },
    },
  } as any);
  assert.ok(serverMiddleware, "configureServer must register middleware");

  let previewMiddleware: any = null;
  plugin.configurePreviewServer?.({
    middlewares: {
      use: (fn: any) => {
        previewMiddleware = fn;
      },
    },
  } as any);
  assert.ok(
    previewMiddleware,
    "configurePreviewServer must register middleware",
  );
});
