import { openSync, closeSync } from "node:fs";
import { execFileSync } from "node:child_process";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

async function files(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await files(path)));
    else if (entry.isFile()) result.push(path);
    else throw new Error(`Unexpected non-regular deployment file: ${path}`);
  }
  return result;
}

// Only Vite's content-addressed assets are retained. HTML always comes from
// today's build. No expiry: a sleeping mobile tab can return much later.
export async function retainAssets(dist, archive) {
  const current = join(dist, "assets");
  const retained = join(archive, "assets");
  await mkdir(retained, { recursive: true });
  const incoming = await files(current);
  for (const path of incoming) {
    const destination = join(retained, path.slice(current.length + 1));
    try {
      if (!(await readFile(path)).equals(await readFile(destination))) {
        throw new Error(
          `Immutable asset has different content: ${destination}`,
        );
      }
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  await cp(current, retained, { recursive: true });
  await cp(retained, current, { recursive: true });
}

export function seedArtifacts(artifacts, activeSha) {
  const seeds = artifacts.filter(
    (artifact) =>
      artifact.name === "github-pages" &&
      !artifact.expired &&
      artifact.workflow_run?.head_branch === "main",
  );
  if (
    !activeSha ||
    !seeds.some((artifact) => artifact.workflow_run?.head_sha === activeSha)
  ) {
    throw new Error(
      "The currently live deployment has no available artifact; recover its assets before initializing pages-assets.",
    );
  }
  return seeds;
}

// Bootstrap once from still-available main deployment artifacts, including
// the currently published build. Do not silently start an empty archive.
async function bootstrap(archive, temporary) {
  const pages = JSON.parse(
    execFileSync(
      "gh",
      [
        "api",
        "--paginate",
        "--slurp",
        `repos/${process.env.GITHUB_REPOSITORY}/actions/artifacts?per_page=100`,
      ],
      { encoding: "utf8" },
    ),
  );
  const deployments = JSON.parse(
    execFileSync(
      "gh",
      [
        "api",
        "--paginate",
        "--slurp",
        `repos/${process.env.GITHUB_REPOSITORY}/deployments?environment=github-pages&per_page=100`,
      ],
      { encoding: "utf8" },
    ),
  ).flat();
  let activeSha;
  for (const deployment of deployments) {
    const statuses = JSON.parse(
      execFileSync(
        "gh",
        [
          "api",
          `repos/${process.env.GITHUB_REPOSITORY}/deployments/${deployment.id}/statuses`,
        ],
        { encoding: "utf8" },
      ),
    );
    if (statuses[0]?.state === "success") {
      activeSha = deployment.sha;
      break;
    }
  }
  const artifacts = seedArtifacts(
    pages.flatMap((page) => page.artifacts),
    activeSha,
  );
  for (const artifact of artifacts) {
    const unpack = join(temporary, String(artifact.id));
    await mkdir(unpack);
    const zip = join(unpack, "pages.zip");
    const descriptor = openSync(zip, "w");
    try {
      execFileSync(
        "gh",
        [
          "api",
          `repos/${process.env.GITHUB_REPOSITORY}/actions/artifacts/${artifact.id}/zip`,
        ],
        { stdio: ["ignore", descriptor, "inherit"] },
      );
    } finally {
      closeSync(descriptor);
    }
    execFileSync("unzip", ["-q", zip, "-d", unpack]);
    execFileSync("tar", ["-xf", join(unpack, "artifact.tar"), "-C", unpack]);
    await retainAssets(unpack, archive);
  }
  console.log(
    `Seeded retained assets from ${artifacts.length} main deployment artifacts.`,
  );
}

export async function publishAssets(dist) {
  const temporary = await mkdtemp(join(tmpdir(), "pages-assets-"));
  const archive = join(temporary, "archive");
  const ref = "refs/heads/pages-assets";
  const git = (args, options = {}) =>
    execFileSync("git", args, { encoding: "utf8", ...options }).trim();
  try {
    await mkdir(archive);
    const remote = git(["ls-remote", "origin", ref]);
    let parent;
    if (remote) {
      git(["fetch", "--depth=1", "origin", ref]);
      parent = git(["rev-parse", "FETCH_HEAD"]);
      const tar = join(temporary, "archive.tar");
      const descriptor = openSync(tar, "w");
      try {
        execFileSync("git", ["archive", parent], {
          stdio: ["ignore", descriptor, "inherit"],
        });
      } finally {
        closeSync(descriptor);
      }
      execFileSync("tar", ["-xf", tar, "-C", archive]);
    } else {
      await bootstrap(archive, temporary);
    }
    await retainAssets(dist, archive);
    const sizes = await Promise.all(
      (await files(dist)).map(async (path) => (await stat(path)).size),
    );
    const bytes = sizes.reduce((total, size) => total + size, 0);
    if (bytes > 900 * 1024 * 1024)
      throw new Error(
        "Deployment exceeds 900 MiB; migrate retained assets to durable hosting before deploying. Never prune live tabs' code automatically.",
      );
    const env = {
      ...process.env,
      GIT_INDEX_FILE: join(temporary, "index"),
      GIT_AUTHOR_NAME: "github-actions[bot]",
      GIT_AUTHOR_EMAIL: "41898282+github-actions[bot]@users.noreply.github.com",
      GIT_COMMITTER_NAME: "github-actions[bot]",
      GIT_COMMITTER_EMAIL:
        "41898282+github-actions[bot]@users.noreply.github.com",
    };
    git(["read-tree", "--empty"], { env });
    git([`--work-tree=${archive}`, "add", "--all", "--", "assets"], { env });
    const tree = git(["write-tree"], { env });
    if (!parent || tree !== git(["rev-parse", `${parent}^{tree}`])) {
      const commit = git(
        ["commit-tree", tree, ...(parent ? ["-p", parent] : [])],
        {
          env,
          input: `Retain assets for ${process.env.GITHUB_SHA || "deployment"}\n`,
        },
      );
      // A normal push rejects concurrent changes. Failure aborts deployment.
      git(["push", "origin", `${commit}:${ref}`]);
    }
    console.log(
      `Deployment includes retained assets (${(bytes / 1024 / 1024).toFixed(1)} MiB total).`,
    );
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await publishAssets(resolve(process.argv[2] || "dist"));
}
