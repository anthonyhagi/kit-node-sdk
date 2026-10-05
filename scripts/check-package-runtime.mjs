import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const temporary = mkdtempSync(join(tmpdir(), "kit-runtime-"));
const consumer = join(temporary, "consumer");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

try {
  const packed = JSON.parse(
    execFileSync(npm, ["pack", "--json", "--pack-destination", temporary], {
      cwd: root,
      encoding: "utf8",
    })
  );
  mkdirSync(consumer);
  writeFileSync(
    join(consumer, "package.json"),
    JSON.stringify({
      name: "kit-runtime-consumer",
      private: true,
      type: "module",
    })
  );
  execFileSync(
    npm,
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--engine-strict",
      join(temporary, packed[0].filename),
    ],
    { cwd: consumer, stdio: "inherit" }
  );
  const smoke = join(consumer, "package-runtime-smoke.mjs");
  copyFileSync(new URL("package-runtime-smoke.mjs", import.meta.url), smoke);
  execFileSync(process.execPath, [smoke], { cwd: consumer, stdio: "inherit" });
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
