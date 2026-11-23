import { beforeEach, describe, expect, expectTypeOf, it } from "vitest";
import { ApiClient } from "./api-client";
import { ApiError, Kit, NotFoundError, revokeOAuthToken } from "./index";

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
        name: "NotFoundError",
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

  it("throws NotFoundError, which is still an ApiError", async () => {
    const details = { errors: ["Not Found"] };
    fetchMock.mockResponseOnce(JSON.stringify(details), { status: 404 });
    const kit = new Kit({ apiKey: "test", maxRetries: 0 });
    const error: unknown = await kit.broadcasts.get(1).catch((e) => e);
    expect(error).toBeInstanceOf(NotFoundError);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({
      name: "NotFoundError",
      status: 404,
      details,
    });
    if (error instanceof NotFoundError) {
      expectTypeOf(error.status).toEqualTypeOf<404>();
      expectTypeOf(error.details).toEqualTypeOf<unknown>();
    }
  });

  it("does not use NotFoundError for other statuses", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ errors: ["Forbidden"] }), {
      status: 403,
    });
    const kit = new Kit({ apiKey: "test", maxRetries: 0 });
    const error: unknown = await kit.broadcasts.get(1).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).not.toBeInstanceOf(NotFoundError);
  });

  it("throws NotFoundError from OAuth token helpers on 404", async () => {
    fetchMock.mockResponseOnce("Not Found", { status: 404 });
    const result = revokeOAuthToken({
      token: "token",
      client_id: "client",
      client_secret: "secret",
    });
    await expect(result).rejects.toBeInstanceOf(NotFoundError);
    await expect(result).rejects.toMatchObject({
      status: 404,
      details: "Not Found",
    });
  });
});
