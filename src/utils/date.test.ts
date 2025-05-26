import { describe, it } from "vitest";
import { toDateString } from "./date";

describe("utils/date", () => {
  describe("toDateString()", () => {
    it("passes through a date string", ({ expect }) => {
      const string = "2025-01-01T12:34:05Z";

      expect(toDateString(string)).toBe(string);
    });

    it("correctly converts a Date object into an ISO string", ({ expect }) => {
      const date = new Date("2025-01-01T12:34:05Z");

      expect(toDateString(date)).toBe(date.toISOString());
    });
  });
});
