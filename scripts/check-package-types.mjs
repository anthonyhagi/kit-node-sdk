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

const [typescript = "6", nodeTypes = "22"] = process.argv.slice(2);
const root = fileURLToPath(new URL("../", import.meta.url));
const temporary = mkdtempSync(join(tmpdir(), "kit-types-"));
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
      name: "kit-types-consumer",
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
      `typescript@${typescript}`,
      `@types/node@${nodeTypes}`,
    ],
    { cwd: consumer, stdio: "inherit" }
  );
  for (const extension of ["mts", "cts"]) {
    copyFileSync(
      new URL("package-types/consumer.ts", import.meta.url),
      join(consumer, `consumer.${extension}`)
    );
  }
  writeFileSync(
    join(consumer, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        lib: ["ES2022"],
        module: "Node16",
        moduleResolution: "Node16",
        strict: true,
        skipLibCheck: false,
        noEmit: true,
        types: ["node"],
      },
      include: ["consumer.mts", "consumer.cts"],
    })
  );
  execFileSync(
    process.execPath,
    [
      join(consumer, "node_modules/typescript/bin/tsc"),
      "--project",
      "tsconfig.json",
    ],
    { cwd: consumer, stdio: "inherit" }
  );
  console.log(
    `Packed ESM/CommonJS declarations passed with TypeScript ${typescript} and @types/node ${nodeTypes}`
  );
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
