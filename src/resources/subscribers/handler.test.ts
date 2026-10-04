import { beforeEach, describe, expect, expectTypeOf, it } from "vitest";
import {
  Kit,
  type CreateSubscriber,
  type FilterSubscriberBody,
  type FilterSubscriberParams,
  type FilterSubscribers,
  type GetSubscriber,
  type GetSubscriberStats,
  type GetSubscriberStatsParams,
  type ListSubscribers,
  type UpdateSubscriber,
} from "~/index";

const subscriber = {
  id: 42,
  first_name: "Ada",
  email_address: "ada+newsletter@example.com",
  state: "active",
  created_at: "2026-01-01T00:00:00Z",
  fields: { interest: "TypeScript" },
} satisfies GetSubscriber["subscriber"];
const pagination = {
  has_previous_page: false,
  has_next_page: true,
  start_cursor: "start",
  end_cursor: "next+/=",
  per_page: 25,
};

const namelessSubscriber = {
  ...subscriber,
  first_name: null,
  fields: { interest: "TypeScript", birthday: null },
};

function request(method: string, path: string, query = {}) {
  const requests = fetchMock.requests();
  expect(requests).toHaveLength(1);
  const req = requests[0]!;
  const url = new URL(req.url);
  expect(req.method).toBe(method);
  expect(url.origin).toBe("https://api.kit.com");
  expect(url.pathname).toBe(`/v4${path}`);
  expect(Object.fromEntries(url.searchParams)).toEqual(query);
  return req;
}

describe("subscriber requests through Kit", () => {
  let kit: Kit;

  beforeEach(() => {
    fetchMock.resetMocks();
    kit = new Kit({ apiKey: "test-key", maxRetries: 0 });
  });

  it("lists subscribers without optional query parameters", async () => {
    const response = { subscribers: [subscriber], pagination };
    fetchMock.mockResponseOnce(JSON.stringify(response));

    expect(await kit.subscribers.list()).toEqual(response);
    expect(await request("GET", "/subscribers").text()).toBe("");
  });

  it.each(["after", "before"] as const)(
    "encodes the %s cursor and list filters, normalizing Date values",
    async (cursor) => {
      fetchMock.mockResponseOnce(
        JSON.stringify({ subscribers: [], pagination })
      );
      await kit.subscribers.list({
        [cursor]: "next+/=",
        created_after: new Date("2026-01-01T00:00:00Z"),
        created_before: "2026-02-01T00:00:00Z",
        updated_after: "2026-03-01T00:00:00Z",
        updated_before: new Date("2026-04-01T00:00:00Z"),
        email_address: "ada+newsletter@example.com",
        include_total_count: true,
        per_page: 25,
        sort_field: "updated_at",
        sort_order: "desc",
        status: "all",
      });

      request("GET", "/subscribers", {
        [cursor]: "next+/=",
        created_after: "2026-01-01T00:00:00.000Z",
        created_before: "2026-02-01T00:00:00Z",
        updated_after: "2026-03-01T00:00:00Z",
        updated_before: "2026-04-01T00:00:00.000Z",
        email_address: "ada+newsletter@example.com",
        include_total_count: "true",
        per_page: "25",
        sort_field: "updated_at",
        sort_order: "desc",
        status: "all",
      });
    }
  );

  it("creates a subscriber with fields and explicit null values", async () => {
    const body = {
      email_address: subscriber.email_address,
      first_name: null,
      state: null,
      fields: subscriber.fields,
    };
    const response = { subscriber };
    fetchMock.mockResponseOnce(JSON.stringify(response));

    expect(await kit.subscribers.create(body)).toEqual(response);
    const req = request("POST", "/subscribers");
    expect(req.headers.get("Content-Type")).toBe("application/json");
    expect(await req.json()).toEqual(body);
  });

  it("gets a subscriber by ID", async () => {
    const response = { subscriber };
    fetchMock.mockResponseOnce(JSON.stringify(response));

    expect(await kit.subscribers.get(42)).toEqual(response);
    expect(await request("GET", "/subscribers/42").text()).toBe("");
  });

  it("lists subscribers with null names and unset custom fields", async () => {
    const response = {
      subscribers: [namelessSubscriber],
      pagination,
    } satisfies ListSubscribers;
    fetchMock.mockResponseOnce(JSON.stringify(response));

    const result = await kit.subscribers.list();
    expectTypeOf(result).toEqualTypeOf<ListSubscribers>();
    expect(result).toEqual(response);
    request("GET", "/subscribers");
  });

  it("gets a subscriber with a null name and unset custom fields", async () => {
    const response = { subscriber: namelessSubscriber } satisfies GetSubscriber;
    fetchMock.mockResponseOnce(JSON.stringify(response));

    const result = await kit.subscribers.get(42);
    expectTypeOf(result).toEqualTypeOf<GetSubscriber | null>();
    expect(result).toEqual(response);
    request("GET", "/subscribers/42");
  });

  it("creates a subscriber with a null name and unset custom fields in the response", async () => {
    const body = { email_address: subscriber.email_address, first_name: null };
    const response = {
      subscriber: namelessSubscriber,
    } satisfies CreateSubscriber;
    fetchMock.mockResponseOnce(JSON.stringify(response));

    const result = await kit.subscribers.create(body);
    expectTypeOf(result).toEqualTypeOf<CreateSubscriber>();
    expect(result).toEqual(response);
    expect(await request("POST", "/subscribers").json()).toEqual(body);
  });

  it("updates a subscriber with a null name and unset custom fields in the response", async () => {
    const body = { email_address: subscriber.email_address, first_name: null };
    const response = {
      subscriber: namelessSubscriber,
    } satisfies UpdateSubscriber;
    fetchMock.mockResponseOnce(JSON.stringify(response));

    const result = await kit.subscribers.update(42, body);
    expectTypeOf(result).toEqualTypeOf<UpdateSubscriber | null>();
    expect(result).toEqual(response);
    expect(await request("PUT", "/subscribers/42").json()).toEqual(body);
  });

  it("updates a subscriber using PUT with the ID only in the path", async () => {
    const body = {
      email_address: "updated@example.com",
      first_name: null,
      fields: null,
    };
    const response = {
      subscriber: { ...subscriber, first_name: null },
    };
    fetchMock.mockResponseOnce(JSON.stringify(response));

    expect(await kit.subscribers.update(42, body)).toEqual(response);
    expect(await request("PUT", "/subscribers/42").json()).toEqual(body);
  });

  it("unsubscribes with a bodyless POST and handles a 204 response", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    expect(await kit.subscribers.unsubscribe(42)).toEqual({});
    expect(await request("POST", "/subscribers/42/unsubscribe").text()).toBe(
      ""
    );
  });

  const filterBody: FilterSubscriberBody = {
    all: [
      { type: "subscribed", after: "2026-01-01", before: "2026-02-01" },
      {
        type: "clicks",
        count_greater_than: 0,
        any: [
          {
            type: "urls",
            ids: [7, 8],
            urls: ["kit.com"],
            matching: "contains",
          },
        ],
      },
    ],
  };

  it("filters using a nested JSON body without optional pagination", async () => {
    const response = {
      subscribers: [
        {
          id: "42",
          first_name: "Ada",
          email_address: "ada@example.com",
          created_at: "2026-01-01T00:00:00Z",
          tag_names: ["Newsletter"],
          tag_ids: ["7"],
        },
        {
          id: "43",
          first_name: null,
          email_address: "anonymous@example.com",
          created_at: "2026-01-02T00:00:00Z",
          tag_names: [],
          tag_ids: [],
        },
      ],
      pagination: { ...pagination, total_count: 2 },
    } satisfies FilterSubscribers;
    fetchMock.mockResponseOnce(JSON.stringify(response));

    const result = await kit.subscribers.filter(filterBody);
    expectTypeOf(result).toEqualTypeOf<FilterSubscribers>();
    expect(result).toEqual(response);
    expect(await request("POST", "/subscribers/filter").json()).toEqual(
      filterBody
    );
  });

  it("filters engagement by broadcast IDs using the API's plural discriminator", async () => {
    const body: FilterSubscriberBody = {
      all: [
        {
          type: "clicks",
          count_greater_than: 2,
          any: [{ type: "broadcasts", ids: [7, 8] }],
        },
      ],
    };
    const response = { subscribers: [], pagination };
    fetchMock.mockResponseOnce(JSON.stringify(response));

    expect(await kit.subscribers.filter(body)).toEqual(response);
    expect(await request("POST", "/subscribers/filter").json()).toEqual(body);
  });

  it("filters clicks by URL patterns without requiring URL IDs", async () => {
    const body = {
      all: [
        {
          type: "clicks",
          count_greater_than: 2,
          any: [
            {
              type: "urls",
              urls: ["kit.com", "amazon.com"],
              matching: "contains",
            },
          ],
        },
      ],
    } satisfies FilterSubscriberBody;
    const response = { subscribers: [], pagination };
    fetchMock.mockResponseOnce(JSON.stringify(response));

    expect(await kit.subscribers.filter(body)).toEqual(response);
    expect(await request("POST", "/subscribers/filter").json()).toEqual(body);
  });

  it.each(["after", "before"] as const)(
    "paginates filter results with %s",
    async (cursor) => {
      fetchMock.mockResponseOnce(
        JSON.stringify({ subscribers: [], pagination })
      );
      const params: FilterSubscriberParams = {
        [cursor]: "next+/=",
        per_page: 25,
        include_total_count: true,
      };
      // This is the API filter endpoint, not Array.prototype.filter.
      // eslint-disable-next-line unicorn/no-array-method-this-argument
      await kit.subscribers.filter(filterBody, params);

      const req = request("POST", "/subscribers/filter", {
        [cursor]: "next+/=",
        per_page: "25",
        include_total_count: "true",
      });
      expect(await req.json()).toEqual(filterBody);
    }
  );

  it("gets stats with sent-date filters", async () => {
    const response = {
      subscriber: {
        id: 42,
        stats: {
          sent: 10,
          opened: 5,
          clicked: 2,
          bounced: 0,
          open_rate: 0.5,
          click_rate: 0.2,
          last_sent: "2026-01-31T12:00:00Z",
          last_opened: "2026-01-31T12:01:00Z",
          last_clicked: "2026-01-31T12:02:00Z",
          sends_since_last_open: 0,
          sends_since_last_click: 0,
        },
      },
    } satisfies GetSubscriberStats;
    const params = {
      email_sent_after: "2026-01-01",
      email_sent_before: "2026-02-01",
    } satisfies GetSubscriberStatsParams;
    fetchMock.mockResponseOnce(JSON.stringify(response));

    const result = await kit.subscribers.getStats(42, params);
    expectTypeOf(result).toEqualTypeOf<GetSubscriberStats | null>();
    expect(result).toEqual(response);
    request("GET", "/subscribers/42/stats", {
      email_sent_after: "2026-01-01",
      email_sent_before: "2026-02-01",
    });
  });

  it("gets stats without optional filters", async () => {
    fetchMock.mockResponseOnce("{}");
    await kit.subscribers.getStats(42);
    request("GET", "/subscribers/42/stats");
  });

  it.each(["after", "before"] as const)(
    "paginates subscriber tags with %s",
    async (cursor) => {
      const response = { tags: [{ id: 7, name: "Newsletter" }], pagination };
      fetchMock.mockResponseOnce(JSON.stringify(response));

      expect(
        await kit.subscribers.getTags(42, {
          [cursor]: "next+/=",
          per_page: 25,
          include_total_count: true,
        })
      ).toEqual(response);
      request("GET", "/subscribers/42/tags", {
        [cursor]: "next+/=",
        per_page: "25",
        include_total_count: "true",
      });
    }
  );

  it("gets subscriber tags without optional pagination", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ tags: [], pagination }));
    await kit.subscribers.getTags(42);
    request("GET", "/subscribers/42/tags");
  });

  it("bulk creates subscribers and marks a synchronous response", async () => {
    const body = {
      subscribers: [
        {
          first_name: "Ada",
          email_address: subscriber.email_address,
          state: "active" as const,
        },
      ],
    };
    const response = { subscribers: [subscriber], failures: [] };
    fetchMock.mockResponseOnce(JSON.stringify(response));

    expect(await kit.subscribers.bulkCreate(body)).toEqual({
      type: "synchronous",
      ...response,
    });
    expect(await request("POST", "/bulk/subscribers").json()).toEqual(body);
  });

  it("preserves the bulk callback URL and marks an empty async response", async () => {
    const body = {
      subscribers: Array.from({ length: 101 }, (_, i) => ({
        first_name: "Ada",
        email_address: `ada${i}@example.com`,
        state: "active" as const,
      })),
      callback_url: "https://example.com/hooks/kit?source=bulk",
    };
    fetchMock.mockResponseOnce("", { status: 202 });

    expect(await kit.subscribers.bulkCreate(body)).toEqual({
      type: "asynchronous",
    });
    expect(await request("POST", "/bulk/subscribers").json()).toEqual(body);
  });

  it.each(["get", "update", "unsubscribe", "getStats", "getTags"] as const)(
    "returns null from %s when the subscriber is missing",
    async (method) => {
      fetchMock.mockResponseOnce(
        JSON.stringify({ errors: ["Subscriber not found"] }),
        { status: 404 }
      );
      const result =
        method === "update"
          ? await kit.subscribers.update(42, {
              email_address: subscriber.email_address,
            })
          : await kit.subscribers[method](42);
      expect(result).toBeNull();
      expect(fetchMock.requests()).toHaveLength(1);
    }
  );
});
