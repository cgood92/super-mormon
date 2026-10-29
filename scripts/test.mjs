import { readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

// Explicit discovery works on Node 22 without relying on shell globstar support.
const root = fileURLToPath(new URL("../", import.meta.url));
const tests = ["src", "scripts"]
  .flatMap((directory) =>
    readdirSync(join(root, directory), { recursive: true })
      .filter((file) => file.endsWith(".test.ts"))
      .map((file) => join(directory, file)),
  )
  .sort();
if (!tests.length) throw new Error("No colocated tests found");
const result = spawnSync(
  process.execPath,
  ["--import", "tsx", "--test", ...process.argv.slice(2), ...tests],
  { cwd: root, stdio: "inherit" },
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
