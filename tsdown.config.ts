import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  dts: true,
  format: ["esm", "cjs"],
  cjsDefault: false,
  attw: {
    level: "error",
    profile: "node16",
  },
  platform: "node",
  entry: ["./src/index.ts"],
});
