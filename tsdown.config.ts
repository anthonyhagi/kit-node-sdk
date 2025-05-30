import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  dts: true,
  format: ["esm", "cjs"],
  platform: "node",
  entry: ["./src/index.ts"],
});
