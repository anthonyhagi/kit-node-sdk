import { beforeEach, describe, expect, expectTypeOf, it } from "vitest";
import {
  Kit,
  type BulkTagParams,
  type BulkTagSynchronous,
  type TagSubscriber,
  type TagSubscriberByEmail,
} from "~/index";

const tag = { id: 7, name: "Newsletter", created_at: "2026-01-01T00:00:00Z" };
const subscriber = {
  id: 42,
  first_name: "Ada",
  email_address: "ada+newsletter@example.com",
  state: "active",
  created_at: "2026-01-01T00:00:00Z",
  tagged_at: "2026-02-01T00:00:00Z",
  fields: { interest: "TypeScript" },
};
const pagination = {
  has_previous_page: false,
  has_next_page: true,
  start_cursor: "start",
  end_cursor: "next+/=",
  per_page: 25,
};

function singleRequest() {
  const requests = fetchMock.requests();
  expect(requests).toHaveLength(1);
  return requests[0]!;
}

function request(method: string, path: string, query = {}) {
  const req = singleRequest();
  const url = new URL(req.url);
  expect(req.method).toBe(method);
  expect(url.origin).toBe("https://api.kit.com");
  expect(url.pathname).toBe(`/v4${path}`);
  expect(Object.fromEntries(url.searchParams)).toEqual(query);
  return req;
}

describe("tag requests through Kit", () => {
  let kit: Kit;
  beforeEach(() => {
    fetchMock.resetMocks();
    kit = new Kit({ apiKey: "test-key", maxRetries: 0 });
  });

  it("lists tags without optional pagination", async () => {
    const response = { tags: [tag], pagination };
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.tags.list()).toEqual(response);
    expect(await request("GET", "/tags").text()).toBe("");
  });

  it.each(["after", "before"] as const)(
    "encodes the %s tag cursor",
    async (cursor) => {
      fetchMock.mockResponseOnce(JSON.stringify({ tags: [], pagination }));
      await kit.tags.list({
        [cursor]: "next+/=",
        include_total_count: true,
        per_page: 25,
      });
      request("GET", "/tags", {
        [cursor]: "next+/=",
        include_total_count: "true",
        per_page: "25",
      });
    }
  );

  it("creates a tag with a JSON name", async () => {
    const body = { name: "News & updates ✨" };
    const response = { tag: { ...tag, ...body } };
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.tags.create(body)).toEqual(response);
    const req = request("POST", "/tags");
    expect(req.headers.get("Content-Type")).toBe("application/json");
    expect(await req.json()).toEqual(body);
  });

  it("updates a tag with PUT and its ID only in the path", async () => {
    const body = { name: "Renamed" };
    const response = { tag: { ...tag, ...body } };
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.tags.update(7, body)).toEqual(response);
    expect(await request("PUT", "/tags/7").json()).toEqual(body);
  });

  it("lists tagged subscribers without optional filters", async () => {
    const response = { subscribers: [subscriber], pagination };
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.tags.listSubscribers(7)).toEqual(response);
    expect(await request("GET", "/tags/7/subscribers").text()).toBe("");
  });

  it.each(["after", "before"] as const)(
    "paginates tagged subscribers with %s and normalizes date filters",
    async (cursor) => {
      fetchMock.mockResponseOnce(
        JSON.stringify({ subscribers: [], pagination })
      );
      await kit.tags.listSubscribers(7, {
        [cursor]: "next+/=",
        per_page: 25,
        include_total_count: true,
        status: "all",
        created_after: new Date("2026-01-01T00:00:00Z"),
        created_before: "2026-02-01",
        tagged_after: "2026-03-01",
        tagged_before: new Date("2026-04-01T00:00:00Z"),
      });
      request("GET", "/tags/7/subscribers", {
        [cursor]: "next+/=",
        per_page: "25",
        include_total_count: "true",
        status: "all",
        created_after: "2026-01-01T00:00:00.000Z",
        created_before: "2026-02-01",
        tagged_after: "2026-03-01",
        tagged_before: "2026-04-01T00:00:00.000Z",
      });
    }
  );

  it("tags a subscriber by email with a JSON body", async () => {
    const body = { email_address: subscriber.email_address };
    const response = { subscriber };
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.tags.tagSubscriberByEmail(7, body)).toEqual(response);
    expect(await request("POST", "/tags/7/subscribers").json()).toEqual(body);
  });

  it("tags a subscriber by ID with a bodyless POST", async () => {
    const response = { subscriber };
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.tags.tagSubscriber(7, 42)).toEqual(response);
    expect(await request("POST", "/tags/7/subscribers/42").text()).toBe("");
  });

  it.each([200, 201])(
    "returns a nullable first name when tagging by ID with status %s",
    async (status) => {
      const response = {
        subscriber: { ...subscriber, first_name: null },
      } satisfies TagSubscriber;
      fetchMock.mockResponseOnce(JSON.stringify(response), { status });

      const result = await kit.tags.tagSubscriber(7, 42);
      expectTypeOf(result).toEqualTypeOf<TagSubscriber | null>();
      expectTypeOf(result!.subscriber.first_name).toEqualTypeOf<
        string | null
      >();
      expect(result).toEqual(response);
      expect(result?.subscriber.first_name).toBeNull();
      expect(await request("POST", "/tags/7/subscribers/42").text()).toBe("");
    }
  );

  it.each([200, 201])(
    "returns a nullable first name when tagging by email with status %s",
    async (status) => {
      const body = { email_address: subscriber.email_address };
      const response = {
        subscriber: { ...subscriber, first_name: null },
      } satisfies TagSubscriberByEmail;
      fetchMock.mockResponseOnce(JSON.stringify(response), { status });

      const result = await kit.tags.tagSubscriberByEmail(7, body);
      expectTypeOf(result).toEqualTypeOf<TagSubscriberByEmail | null>();
      expectTypeOf(result!.subscriber.first_name).toEqualTypeOf<
        string | null
      >();
      expect(result).toEqual(response);
      expect(result?.subscriber.first_name).toBeNull();
      expect(await request("POST", "/tags/7/subscribers").json()).toEqual(body);
    }
  );

  it.each([
    "ada@example.com",
    "ada+newsletter@example.com",
    "ada&news=updates@example.com",
  ])(
    "removes a tag with a bodyless DELETE and encoded email %s",
    async (email_address) => {
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
      expect(
        await kit.tags.removeSubscriberByEmail(7, { email_address })
      ).toEqual({});
      const req = request("DELETE", "/tags/7/subscribers", { email_address });
      expect(await req.text()).toBe("");
    }
  );

  it("removes a tag by subscriber ID with a bodyless DELETE", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    expect(await kit.tags.removeSubscriber(7, 42)).toEqual({});
    expect(await request("DELETE", "/tags/7/subscribers/42").text()).toBe("");
  });

  it("bulk creates tags and preserves synchronous failures", async () => {
    kit = new Kit({ apiKey: "oauth-token", authType: "oauth", maxRetries: 0 });
    const body = { tags: [{ name: "Newsletter" }], callback_url: null };
    const response = {
      tags: [tag],
      failures: [{ tag: { name: "" }, errors: ["Name is required"] }],
    };
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.tags.bulkCreate(body)).toEqual({
      type: "synchronous",
      ...response,
    });
    const req = request("POST", "/bulk/tags");
    expect(req.headers.get("Authorization")).toBe("Bearer oauth-token");
    expect(await req.json()).toEqual(body);
  });

  it("bulk creates tags at the documented /bulk/tags endpoint", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ tags: [tag], failures: [] }));
    await kit.tags.bulkCreate({ tags: [{ name: "Newsletter" }] });
    request("POST", "/bulk/tags");
  });

  it("bulk creates tags asynchronously and preserves the callback", async () => {
    const body = {
      tags: Array.from({ length: 101 }, (_, i) => ({ name: `Tag ${i}` })),
      callback_url: "https://example.com/hooks/kit?source=tags",
    };
    fetchMock.mockResponseOnce("{}", { status: 202 });
    expect(await kit.tags.bulkCreate(body)).toEqual({ type: "asynchronous" });
    expect(await request("POST", "/bulk/tags").json()).toEqual(body);
  });

  it("bulk tags subscribers and preserves synchronous results and failures", async () => {
    const body = { taggings: [{ tag_id: 7, subscriber_id: 42 }] };
    const response = {
      subscribers: [subscriber],
      failures: [
        {
          tagging: { tag_id: 8, subscriber_id: 99 },
          errors: ["Subscriber not found"],
        },
      ],
    };
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.tags.bulkTag(body)).toEqual({
      type: "synchronous",
      ...response,
    });
    expect(await request("POST", "/bulk/tags/subscribers").json()).toEqual(
      body
    );
  });

  it("preserves nullable bulk tagging IDs and mixed results", async () => {
    const body = {
      taggings: [
        { tag_id: null, subscriber_id: 42 },
        { tag_id: 7, subscriber_id: null },
        { tag_id: null, subscriber_id: null },
        { tag_id: 7, subscriber_id: 42 },
      ],
      callback_url: null,
    } satisfies BulkTagParams;
    const response = {
      subscribers: [subscriber],
      failures: [
        {
          tagging: { tag_id: null, subscriber_id: 42 },
          errors: ["Tag does not exist"],
        },
        {
          tagging: { tag_id: 7, subscriber_id: null },
          errors: ["Subscriber does not exist"],
        },
        {
          tagging: { tag_id: null, subscriber_id: null },
          errors: ["Tag does not exist", "Subscriber does not exist"],
        },
      ],
    } satisfies Omit<BulkTagSynchronous, "type">;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.tags.bulkTag(body)).toEqual({
      type: "synchronous",
      ...response,
    });
    expectTypeOf<BulkTagParams["taggings"][number]["tag_id"]>().toEqualTypeOf<
      number | null
    >();
    expectTypeOf<
      BulkTagParams["taggings"][number]["subscriber_id"]
    >().toEqualTypeOf<number | null>();
    expect(await request("POST", "/bulk/tags/subscribers").json()).toEqual(
      body
    );
  });

  it("bulk removes tags and recognizes an empty failures array as synchronous", async () => {
    const body = { taggings: [{ tag_id: 7, subscriber_id: 42 }] };
    fetchMock.mockResponseOnce(JSON.stringify({ failures: [] }));
    expect(await kit.tags.bulkRemove(body)).toEqual({
      type: "synchronous",
      failures: [],
    });
    expect(await request("DELETE", "/bulk/tags/subscribers").json()).toEqual(
      body
    );
  });

  it.each(["bulkTag", "bulkRemove"] as const)(
    "sends the callback and handles an async %s result",
    async (method) => {
      const body = {
        taggings: Array.from({ length: 101 }, (_, i) => ({
          tag_id: 7,
          subscriber_id: i + 1,
        })),
        callback_url: "https://example.com/hooks/kit?source=taggings",
      };
      fetchMock.mockResponseOnce("{}", { status: 202 });
      expect(await kit.tags[method](body)).toEqual({ type: "asynchronous" });
      expect(
        await request(
          method === "bulkTag" ? "POST" : "DELETE",
          "/bulk/tags/subscribers"
        ).json()
      ).toEqual(body);
    }
  );

  it.each([
    "update",
    "listSubscribers",
    "tagSubscriber",
    "tagSubscriberByEmail",
    "removeSubscriber",
    "removeSubscriberByEmail",
  ] as const)(
    "returns null from %s when the tag or subscriber is missing",
    async (method) => {
      fetchMock.mockResponseOnce(JSON.stringify({ errors: ["Not found"] }), {
        status: 404,
      });
      let result;
      switch (method) {
        case "update":
          result = await kit.tags.update(7, { name: "Renamed" });
          break;
        case "listSubscribers":
          result = await kit.tags.listSubscribers(7);
          break;
        case "tagSubscriber":
          result = await kit.tags.tagSubscriber(7, 42);
          break;
        case "removeSubscriber":
          result = await kit.tags.removeSubscriber(7, 42);
          break;
        case "tagSubscriberByEmail":
          result = await kit.tags.tagSubscriberByEmail(7, {
            email_address: subscriber.email_address,
          });
          break;
        case "removeSubscriberByEmail":
          result = await kit.tags.removeSubscriberByEmail(7, {
            email_address: subscriber.email_address,
          });
          expect(
            await request("DELETE", "/tags/7/subscribers", {
              email_address: subscriber.email_address,
            }).text()
          ).toBe("");
          break;
      }
      expect(result).toBeNull();
      expect(fetchMock.requests()).toHaveLength(1);
    }
  );
});
