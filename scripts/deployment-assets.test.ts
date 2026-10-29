import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Removing retention would strand an old entry module's unvisited lazy scene.
test("successive deployments preserve old lazy modules and their shared dependencies", async () => {
  const { retainAssets } = await import("./deployment-assets.mjs");
  const root = await mkdtemp(join(tmpdir(), "deployment-assets-"));
  const archive = join(root, "archive");
  const dist = join(root, "dist");
  try {
    await mkdir(join(dist, "assets"), { recursive: true });
    await writeFile(join(dist, "index.html"), "old entry");
    await writeFile(
      join(dist, "assets", "scene-old.js"),
      'export { value } from "./shared-old.js";',
    );
    await writeFile(
      join(dist, "assets", "shared-old.js"),
      'export const value = "old scene";',
    );
    await retainAssets(dist, archive);
    await rm(dist, { recursive: true });
    await mkdir(join(dist, "assets"), { recursive: true });
    await writeFile(join(dist, "index.html"), "new entry");
    await writeFile(
      join(dist, "assets", "scene-new.js"),
      'export const value = "new scene";',
    );
    await retainAssets(dist, archive);
    assert.equal(
      (await import(join(dist, "assets", "scene-old.js"))).value,
      "old scene",
    );
    assert.equal(
      (await import(join(dist, "assets", "scene-new.js"))).value,
      "new scene",
    );
    assert.equal(await readFile(join(dist, "index.html"), "utf8"), "new entry");
    await rm(dist, { recursive: true });
    await mkdir(join(dist, "assets"), { recursive: true });
    await writeFile(
      join(dist, "assets", "scene-third.js"),
      "export const value = 3;",
    );
    await retainAssets(dist, archive);
    assert.equal(
      await readFile(join(dist, "assets", "shared-old.js"), "utf8"),
      'export const value = "old scene";',
    );
    assert.equal(
      await readFile(join(dist, "assets", "scene-new.js"), "utf8"),
      'export const value = "new scene";',
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("retention refuses to replace an immutable filename with different content", async () => {
  const { retainAssets } = await import("./deployment-assets.mjs");
  const root = await mkdtemp(join(tmpdir(), "deployment-collision-"));
  try {
    const dist = join(root, "dist");
    const archive = join(root, "archive");
    await mkdir(join(dist, "assets"), { recursive: true });
    await writeFile(join(dist, "assets", "scene-hash.js"), "original");
    await retainAssets(dist, archive);
    await writeFile(join(dist, "assets", "scene-hash.js"), "changed");
    await assert.rejects(retainAssets(dist, archive), /different content/);
    assert.equal(
      await readFile(join(archive, "assets", "scene-hash.js"), "utf8"),
      "original",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("deployment archive survives fresh checkouts without changing the source checkout", async () => {
  const { execFileSync } = await import("node:child_process");
  const root = await mkdtemp(join(tmpdir(), "deployment-git-"));
  const script = join(process.cwd(), "scripts/deployment-assets.mjs");
  const git = (cwd: string, args: string[]) =>
    execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: "Test",
        GIT_AUTHOR_EMAIL: "test@example.com",
        GIT_COMMITTER_NAME: "Test",
        GIT_COMMITTER_EMAIL: "test@example.com",
      },
    }).trim();
  try {
    const remote = join(root, "remote.git");
    const repo = join(root, "repo");
    git(root, ["init", "--bare", remote]);
    git(root, ["init", repo]);
    git(repo, ["remote", "add", "origin", remote]);
    await mkdir(join(repo, "assets"));
    await writeFile(
      join(repo, "assets", "old.js"),
      'export const value = "old";',
    );
    git(repo, ["add", "."]);
    git(repo, ["commit", "-m", "seed"]);
    git(repo, ["push", "origin", "HEAD:refs/heads/pages-assets"]);
    for (const version of ["new", "third"]) {
      const checkout = join(root, version);
      git(root, ["clone", "--branch", "pages-assets", remote, checkout]);
      const dist = join(checkout, "dist");
      await mkdir(join(dist, "assets"), { recursive: true });
      await writeFile(
        join(dist, "assets", `${version}.js`),
        `export const value = "${version}";`,
      );
      await writeFile(join(dist, "index.html"), version);
      const before = git(checkout, ["status", "--porcelain"]);
      execFileSync(process.execPath, [script, dist], {
        cwd: checkout,
        stdio: "pipe",
      });
      assert.equal(git(checkout, ["status", "--porcelain"]), before);
      assert.equal(
        await readFile(join(dist, "assets", "old.js"), "utf8"),
        'export const value = "old";',
      );
      assert.equal(await readFile(join(dist, "index.html"), "utf8"), version);
    }
    assert.equal(
      git(root, ["--git-dir", remote, "show", "pages-assets:assets/new.js"]),
      'export const value = "new";',
    );
    assert.equal(
      git(root, ["--git-dir", remote, "show", "pages-assets:assets/third.js"]),
      'export const value = "third";',
    );
    assert.throws(() =>
      git(root, ["--git-dir", remote, "show", "pages-assets:index.html"]),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("archive seeding refuses artifacts that omit the currently live deployment", async () => {
  const { seedArtifacts } = await import("./deployment-assets.mjs");
  const artifacts = [
    {
      name: "github-pages",
      expired: true,
      workflow_run: { head_branch: "main", head_sha: "live" },
    },
    {
      name: "github-pages",
      expired: false,
      workflow_run: { head_branch: "main", head_sha: "failed-deploy" },
    },
  ];
  assert.throws(() => seedArtifacts(artifacts, "live"), /currently live/);
  artifacts.push({
    name: "github-pages",
    expired: false,
    workflow_run: { head_branch: "main", head_sha: "live" },
  });
  assert.equal(seedArtifacts(artifacts, "live").length, 2);
});
