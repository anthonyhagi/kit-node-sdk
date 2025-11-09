import { describe, it } from "vitest";
import { delay } from "./helpers";

describe("utils/helpers", () => {
  describe("delay()", () => {
    it("should delay execution", async ({ expect }) => {
      const start = Date.now();

      await delay(100);

      const end = Date.now();

      expect(end - start).toBeGreaterThanOrEqual(99);
    });

    it("should return a promise", async ({ expect }) => {
      const result = delay(100);

      expect(result).toBeInstanceOf(Promise);
      expect(await result).toBeUndefined();
    });
  });
});
