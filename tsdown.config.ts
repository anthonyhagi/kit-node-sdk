import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  dts: true,
  format: ["esm", "cjs"],
  platform: "neutral",
  entry: ["./src"],
});
