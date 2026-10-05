import { beforeEach, describe, expect, it } from "vitest";
import { ApiClient } from "./api-client";
import { ApiError, Kit } from "./index";

describe("not found responses", () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  it.each(["get", "post", "put", "patch", "delete"] as const)(
    "throws with preserved details and no retries for %s",
    async (method) => {
      const details = { errors: ["Not Found"] };
      fetchMock.mockResponseOnce(JSON.stringify(details), { status: 404 });
      const api = new ApiClient({
        baseUrl: "https://api.kit.com/v4",
        maxRetries: 3,
        retryDelay: 0,
      });
      await expect(api[method]("/missing")).rejects.toMatchObject({
        name: "ApiError",
        status: 404,
        details,
      });
      expect(fetchMock.requests()).toHaveLength(1);
    }
  );

  it.each(["Not Found", ""])(
    "preserves raw 404 details %j",
    async (details) => {
      fetchMock.mockResponseOnce(details, { status: 404 });
      const kit = new Kit({ apiKey: "test", maxRetries: 3, retryDelay: 0 });
      await expect(kit.tags.list()).rejects.toMatchObject({
        status: 404,
        details,
      });
      expect(fetchMock.requests()).toHaveLength(1);
    }
  );

  it("throws ApiError from bulk operations before inspecting a success payload", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ errors: ["Not Found"] }), {
      status: 404,
    });
    const kit = new Kit({ apiKey: "test", maxRetries: 3, retryDelay: 0 });
    await expect(
      kit.tags.bulkCreate({ tags: [{ name: "missing" }] })
    ).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock.requests()).toHaveLength(1);
  });
});
