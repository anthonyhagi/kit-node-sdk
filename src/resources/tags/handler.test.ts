import { beforeEach, describe, expect, expectTypeOf, it } from "vitest";
import {
  Kit,
  type ApiError,
  type BulkDeleteTags,
  type BulkDeleteTagsAsynchronous,
  type BulkDeleteTagsParams,
  type BulkDeleteTagsSynchronous,
  type BulkTagParams,
  type BulkTagSynchronous,
  type ListSlimTagSubscribers,
  type ListTags,
  type ListTagsParams,
  type ListTagSubscribers,
  type ListTagSubscribersParams,
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

  it.each([
    { after: null, before: null, per_page: null },
    { after: undefined, before: undefined, per_page: undefined },
  ] satisfies ListTagsParams[])(
    "omits nullable and undefined tag pagination: %j",
    async (params) => {
      const response = { tags: [tag], pagination } satisfies ListTags;
      fetchMock.mockResponseOnce(JSON.stringify(response));
      const result = await kit.tags.list(params);
      expectTypeOf(result).toEqualTypeOf<ListTags>();
      expect(result).toEqual(response);
      expect(await request("GET", "/tags").text()).toBe("");
    }
  );

  it("preserves subscriber counts and false total counts with null tag pagination", async () => {
    const params = {
      after: null,
      before: null,
      per_page: null,
      include: "subscriber_count",
      include_total_count: false,
    } satisfies ListTagsParams;
    const response = {
      tags: [{ ...tag, subscriber_count: 0 }],
      pagination,
    } satisfies ListTags;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.tags.list(params)).toEqual(response);
    request("GET", "/tags", {
      include: "subscriber_count",
      include_total_count: "false",
    });
  });

  it.each([
    { failures: [] },
    { failures: [{ tag: { id: 92 }, errors: ["Tag does not exist"] }] },
  ] satisfies Omit<BulkDeleteTagsSynchronous, "type">[])(
    "bulk deletes tag definitions and preserves failures $failures",
    async (response) => {
      kit = new Kit({
        apiKey: "oauth-token",
        authType: "oauth",
        maxRetries: 0,
      });
      const body = {
        tags: [{ id: 91 }, { id: 92 }],
      } satisfies BulkDeleteTagsParams;
      fetchMock.mockResponseOnce(JSON.stringify(response));

      const result = await kit.tags.bulkDelete(body);
      expectTypeOf(result).toEqualTypeOf<BulkDeleteTags>();
      expect(result).toEqual({ type: "synchronous", ...response });
      if (result.type === "synchronous") {
        expectTypeOf(result).toEqualTypeOf<BulkDeleteTagsSynchronous>();
        expect(result.failures).toEqual(response.failures);
      } else {
        expect.unreachable("Expected a synchronous result");
      }
      const req = request("DELETE", "/bulk/tags");
      expect(req.headers.get("Authorization")).toBe("Bearer oauth-token");
      expect(req.headers.get("Content-Type")).toBe("application/json");
      expect(await req.json()).toEqual(body);
    }
  );

  it.each([
    { name: "omitted", callback: {} },
    { name: "null", callback: { callback_url: null } },
    {
      name: "URL",
      callback: { callback_url: "https://example.com/hooks/kit?source=tags" },
    },
  ] as const)(
    "bulk deletes tags asynchronously with callback $name",
    async ({ callback }) => {
      const body = {
        tags: Array.from({ length: 101 }, (_, i) => ({ id: i + 1 })),
        ...callback,
      } satisfies BulkDeleteTagsParams;
      fetchMock.mockResponseOnce("{}", { status: 202 });

      const result = await kit.tags.bulkDelete(body);
      expect(result).toEqual({ type: "asynchronous" });
      if (result.type === "asynchronous") {
        expectTypeOf(result).toEqualTypeOf<BulkDeleteTagsAsynchronous>();
      } else {
        expect.unreachable("Expected an asynchronous result");
      }
      expect(await request("DELETE", "/bulk/tags").json()).toEqual(body);
    }
  );

  it.each([
    { status: 401, message: "The access token is invalid", tags: [{ id: 91 }] },
    {
      status: 413,
      message: "This request exceeds your queued bulk requests limit",
      tags: [{ id: 91 }],
    },
    { status: 422, message: "No tags included for processing", tags: [] },
  ])(
    "preserves bulk tag deletion error $status",
    async ({ status, message, tags }) => {
      const details = { errors: [message] };
      fetchMock.mockResponseOnce(JSON.stringify(details), { status });

      await expect(kit.tags.bulkDelete({ tags })).rejects.toMatchObject({
        name: "ApiError",
        status,
        details,
      } satisfies Partial<ApiError>);
      expect(await request("DELETE", "/bulk/tags").json()).toEqual({ tags });
    }
  );

  it("lists tags without optional pagination", async () => {
    const response = { tags: [tag], pagination };
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.tags.list()).toEqual(response);
    expect(await request("GET", "/tags").text()).toBe("");
  });

  it.each([0, 42])(
    "requests and preserves a subscriber count of %i",
    async (subscriber_count) => {
      const response = {
        tags: [{ ...tag, subscriber_count }],
        pagination,
      } satisfies ListTags;
      const params = {
        include: "subscriber_count",
        after: "next+/=",
        per_page: 25,
        include_total_count: false,
      } satisfies ListTagsParams;
      fetchMock.mockResponseOnce(JSON.stringify(response));
      const result = await kit.tags.list(params);
      expect(result).toEqual(response);
      expectTypeOf(result.tags[0]!.subscriber_count).toEqualTypeOf<
        number | undefined
      >();
      request("GET", "/tags", {
        include: "subscriber_count",
        after: "next+/=",
        per_page: "25",
        include_total_count: "false",
      });
    }
  );

  it("omits undefined includes and accepts tags without subscriber counts", async () => {
    const response = { tags: [tag], pagination } satisfies ListTags;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    const result = await kit.tags.list({ include: undefined });
    expect(result).toEqual(response);
    expect(result.tags[0]!.subscriber_count).toBeUndefined();
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

  it.each([
    {
      tagged_after: null,
      tagged_before: null,
      created_after: null,
      created_before: null,
      after: null,
      before: null,
      per_page: null,
    },
    {
      tagged_after: undefined,
      tagged_before: undefined,
      created_after: undefined,
      created_before: undefined,
      after: undefined,
      before: undefined,
      per_page: undefined,
    },
  ] satisfies ListTagSubscribersParams[])(
    "omits nullable and undefined tag subscriber filters: %j",
    async (params) => {
      const response = {
        subscribers: [subscriber],
        pagination,
      } satisfies ListTagSubscribers;
      fetchMock.mockResponseOnce(JSON.stringify(response));
      const result = await kit.tags.listSubscribers(7, params);
      expectTypeOf(result).toEqualTypeOf<ListTagSubscribers>();
      expect(result).toEqual(response);
      expect(await request("GET", "/tags/7/subscribers").text()).toBe("");
    }
  );

  it.each([true, false])(
    "preserves slim: %s, status, and false counts alongside nullable filters",
    async (slim) => {
      const params = {
        tagged_after: null,
        tagged_before: null,
        created_after: null,
        created_before: null,
        after: null,
        before: null,
        per_page: null,
        slim,
        status: "all",
        include_total_count: false,
      } satisfies ListTagSubscribersParams;
      const response = {
        subscribers: [],
        pagination,
      } satisfies ListTagSubscribers;
      fetchMock.mockResponseOnce(JSON.stringify(response));
      expect(await kit.tags.listSubscribers(7, params)).toEqual(response);
      request("GET", "/tags/7/subscribers", {
        slim: String(slim),
        status: "all",
        include_total_count: "false",
      });
    }
  );

  it("accepts omitted fields in slim responses and retains pagination and filters", async () => {
    const slimSubscriber = {
      id: subscriber.id,
      first_name: subscriber.first_name,
      email_address: subscriber.email_address,
      state: subscriber.state,
      created_at: subscriber.created_at,
    };
    const response = {
      subscribers: [slimSubscriber],
      pagination,
    } satisfies ListSlimTagSubscribers;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    const result = await kit.tags.listSubscribers(7, {
      slim: true,
      after: "next+/=",
      per_page: 25,
      status: "all",
      include_total_count: false,
      tagged_before: null,
    });
    expectTypeOf(result).toEqualTypeOf<ListSlimTagSubscribers>();
    expectTypeOf(result!.subscribers[0]!.fields).toEqualTypeOf<
      Record<string, string | null> | undefined
    >();
    expectTypeOf(result!.subscribers[0]!.tagged_at).toEqualTypeOf<
      string | undefined
    >();
    expectTypeOf<typeof slimSubscriber>().not.toExtend<
      ListTagSubscribers["subscribers"][number]
    >();
    expect(result).toEqual(response);
    expect(result!.subscribers[0]).not.toHaveProperty("fields");
    expect(result!.subscribers[0]).not.toHaveProperty("tagged_at");
    request("GET", "/tags/7/subscribers", {
      slim: "true",
      after: "next+/=",
      per_page: "25",
      status: "all",
      include_total_count: "false",
    });
  });

  it("preserves optional metadata when slim responses include it", async () => {
    const response = {
      subscribers: [subscriber],
      pagination,
    } satisfies ListSlimTagSubscribers;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    const result = await kit.tags.listSubscribers(7, { slim: true });
    expectTypeOf(result).toEqualTypeOf<ListSlimTagSubscribers>();
    expect(result).toEqual(response);
    request("GET", "/tags/7/subscribers", { slim: "true" });
  });

  it.each([false, undefined] as const)(
    "retains full response types with slim: %s",
    async (slim) => {
      const response = {
        subscribers: [subscriber],
        pagination,
      } satisfies ListTagSubscribers;
      fetchMock.mockResponseOnce(JSON.stringify(response));
      const result = await kit.tags.listSubscribers(7, { slim });
      expectTypeOf(result).toEqualTypeOf<ListTagSubscribers>();
      expectTypeOf(result!.subscribers[0]!.fields).toEqualTypeOf<
        Record<string, string | null>
      >();
      expectTypeOf(result!.subscribers[0]!.tagged_at).toEqualTypeOf<string>();
      expect(result).toEqual(response);
      request(
        "GET",
        "/tags/7/subscribers",
        slim === undefined ? {} : { slim: "false" }
      );
    }
  );

  it("throws ApiError when a slim tag subscriber list is not found", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ errors: ["Not Found"] }), {
      status: 404,
    });
    await expect(
      kit.tags.listSubscribers(404, { slim: true })
    ).rejects.toMatchObject({ name: "ApiError", status: 404 });
    request("GET", "/tags/404/subscribers", { slim: "true" });
  });

  it("lists tagged subscribers without optional filters", async () => {
    const response = { subscribers: [subscriber], pagination };
    fetchMock.mockResponseOnce(JSON.stringify(response));
    const result = await kit.tags.listSubscribers(7);
    expectTypeOf(result).toEqualTypeOf<ListTagSubscribers>();
    expect(result).toEqual(response);
    expect(await request("GET", "/tags/7/subscribers").text()).toBe("");
  });

  it.each([
    { name: "true", params: { slim: true }, query: { slim: "true" } },
    { name: "false", params: { slim: false }, query: { slim: "false" } },
    { name: "omitted", params: {}, query: {} },
    { name: "explicit undefined", params: { slim: undefined }, query: {} },
  ] satisfies {
    name: string;
    params: ListTagSubscribersParams;
    query: Record<string, string>;
  }[])(
    "lists tagged subscribers with slim $name",
    async ({ params, query }) => {
      const response = {
        subscribers: [],
        pagination,
      } satisfies ListTagSubscribers;
      fetchMock.mockResponseOnce(JSON.stringify(response));

      const result = await kit.tags.listSubscribers(7, params);
      expectTypeOf(result).toEqualTypeOf<
        ListTagSubscribers | ListSlimTagSubscribers
      >();
      expect(result).toEqual(response);
      expect(await request("GET", "/tags/7/subscribers", query).text()).toBe(
        ""
      );
    }
  );

  it.each(["after", "before"] as const)(
    "combines slim with the %s cursor and tagged subscriber filters",
    async (cursor) => {
      const params = {
        slim: true,
        [cursor]: "next+/=",
        per_page: 25,
        include_total_count: false,
        status: "inactive",
        created_after: new Date("2026-01-01T00:00:00Z"),
        created_before: "2026-02-01",
        tagged_after: "2026-03-01",
        tagged_before: new Date("2026-04-01T00:00:00Z"),
      } satisfies ListTagSubscribersParams;
      const response = {
        subscribers: [],
        pagination,
      } satisfies ListTagSubscribers;
      fetchMock.mockResponseOnce(JSON.stringify(response));

      expect(await kit.tags.listSubscribers(7, params)).toEqual(response);
      request("GET", "/tags/7/subscribers", {
        slim: "true",
        [cursor]: "next+/=",
        per_page: "25",
        include_total_count: "false",
        status: "inactive",
        created_after: "2026-01-01",
        created_before: "2026-02-01",
        tagged_after: "2026-03-01",
        tagged_before: "2026-04-01",
      });
    }
  );

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
        created_after: "2026-01-01",
        created_before: "2026-02-01",
        tagged_after: "2026-03-01",
        tagged_before: "2026-04-01",
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

  describe.each([
    "created_after",
    "created_before",
    "tagged_after",
    "tagged_before",
  ] as const)("tag subscriber date filter %s", (field) => {
    it.each([
      {
        name: "positive offset crossing to the previous UTC day",
        value: new Date("2026-01-01T00:30:00+10:30"),
        expected: "2025-12-31",
      },
      {
        name: "negative offset crossing to the next UTC day",
        value: new Date("2026-01-01T23:30:00-08:00"),
        expected: "2026-01-02",
      },
      {
        name: "date string passthrough",
        value: "2026-03-15",
        expected: "2026-03-15",
      },
    ])("formats $name", async ({ value, expected }) => {
      const params = { [field]: value } satisfies ListTagSubscribersParams;
      const response = {
        subscribers: [],
        pagination,
      } satisfies ListTagSubscribers;
      fetchMock.mockResponseOnce(JSON.stringify(response));

      expect(await kit.tags.listSubscribers(7, params)).toEqual(response);
      expect(
        await request("GET", "/tags/7/subscribers", {
          [field]: expected,
        }).text()
      ).toBe("");
    });
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
      expectTypeOf(result).toEqualTypeOf<TagSubscriber>();
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
      expectTypeOf(result).toEqualTypeOf<TagSubscriberByEmail>();
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
    "throws ApiError from %s when the tag or subscriber is missing",
    async (method) => {
      fetchMock.mockResponseOnce(JSON.stringify({ errors: ["Not found"] }), {
        status: 404,
      });
      let result;
      switch (method) {
        case "update":
          result = kit.tags.update(7, { name: "Renamed" });
          break;
        case "listSubscribers":
          result = kit.tags.listSubscribers(7);
          break;
        case "tagSubscriber":
          result = kit.tags.tagSubscriber(7, 42);
          break;
        case "removeSubscriber":
          result = kit.tags.removeSubscriber(7, 42);
          break;
        case "tagSubscriberByEmail":
          result = kit.tags.tagSubscriberByEmail(7, {
            email_address: subscriber.email_address,
          });
          break;
        case "removeSubscriberByEmail":
          result = kit.tags.removeSubscriberByEmail(7, {
            email_address: subscriber.email_address,
          });
          expect(
            await request("DELETE", "/tags/7/subscribers", {
              email_address: subscriber.email_address,
            }).text()
          ).toBe("");
          break;
      }
      await expect(result).rejects.toMatchObject({
        name: "ApiError",
        status: 404,
      });
      expect(fetchMock.requests()).toHaveLength(1);
    }
  );
});
