import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    includeSource: ["src/**/*.ts"],
    exclude: ["node_modules", "e2e"],
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "~": resolve(__dirname, "app"),
    },
  },
});
