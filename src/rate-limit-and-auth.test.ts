import { beforeEach, describe, expect, it } from "vitest";
import { ApiError, Kit } from "./index";

// Kit's documented 429: plain-text body, no Retry-After header.
const rateLimited = ["Retry later", { status: 429 }] as const;
const oauthRequired = {
  errors: ["This endpoint requires OAuth authentication"],
};

describe("Kit's plain-text 429 responses", () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  it("retries a header-less 429 and returns the next success", async () => {
    const kit = new Kit({ apiKey: "test", maxRetries: 2, retryDelay: 0 });
    fetchMock.mockResponses(
      [...rateLimited],
      [JSON.stringify({ tags: [], pagination: {} }), { status: 200 }]
    );
    await expect(kit.tags.list()).resolves.toEqual({
      tags: [],
      pagination: {},
    });
    expect(fetchMock.requests()).toHaveLength(2);
  });

  it("throws the raw text after exhausting retries", async () => {
    const kit = new Kit({ apiKey: "test", maxRetries: 2, retryDelay: 0 });
    fetchMock.mockResponse(...rateLimited);
    const result = kit.tags.list();
    await expect(result).rejects.toBeInstanceOf(ApiError);
    await expect(result).rejects.toMatchObject({
      status: 429,
      details: "Retry later",
    });
    expect(fetchMock.requests()).toHaveLength(3);
  });

  it("makes one attempt with maxRetries: 0", async () => {
    const kit = new Kit({ apiKey: "test", maxRetries: 3, retryDelay: 0 });
    fetchMock.mockResponse(...rateLimited);
    await expect(
      kit.tags.list(undefined, { maxRetries: 0 })
    ).rejects.toMatchObject({ status: 429, details: "Retry later" });
    expect(fetchMock.requests()).toHaveLength(1);
  });
});

describe("OAuth-only endpoints with an API key", () => {
  let kit: Kit;
  beforeEach(() => {
    fetchMock.resetMocks();
    kit = new Kit({ apiKey: "api-key", maxRetries: 3, retryDelay: 0 });
  });

  it.each([
    {
      name: "subscribers.bulkCreate",
      run: (k: Kit) =>
        k.subscribers.bulkCreate({
          subscribers: [{ email_address: "ada@example.com" }],
        }),
    },
    {
      name: "tags.bulkTag",
      run: (k: Kit) =>
        k.tags.bulkTag({ taggings: [{ tag_id: 1, subscriber_id: 2 }] }),
    },
    { name: "purchases.list", run: (k: Kit) => k.purchases.list() },
    { name: "purchases.get", run: (k: Kit) => k.purchases.get(1) },
  ])(
    "$name throws Kit's 401 once without switching credentials",
    async ({ run }) => {
      fetchMock.mockResponseOnce(JSON.stringify(oauthRequired), {
        status: 401,
      });
      const result = run(kit);
      await expect(result).rejects.toBeInstanceOf(ApiError);
      await expect(result).rejects.toMatchObject({
        status: 401,
        details: oauthRequired,
      });
      const requests = fetchMock.requests();
      expect(requests).toHaveLength(1);
      expect(requests[0]!.headers.get("X-Kit-Api-Key")).toBe("api-key");
      expect(requests[0]!.headers.get("Authorization")).toBeNull();
    }
  );
});
