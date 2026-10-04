import { beforeEach, describe, expect, expectTypeOf, it } from "vitest";
import {
  Kit,
  type BroadcastSubscriberFilterGroup,
  type CreateBroadcastParams,
  type GetBroadcastStatsParams,
  type GetLinkClicks,
  type GetLinkClicksParams,
  type ListBroadcasts,
  type ListBroadcastsParams,
  type ListSlimBroadcasts,
} from "~/index";

const pagination = {
  has_previous_page: false,
  has_next_page: true,
  start_cursor: "start",
  end_cursor: "next+/=",
  per_page: 25,
};

describe("broadcast list filters through Kit", () => {
  let kit: Kit;

  beforeEach(() => {
    fetchMock.resetMocks();
    kit = new Kit({ apiKey: "test-key", maxRetries: 0 });
  });

  it("preserves requests without options", async () => {
    const response = { broadcasts: [], pagination };
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.broadcasts.list()).toEqual(response);
    const requests = fetchMock.requests();
    expect(requests).toHaveLength(1);
    expect(requests[0]!.url).toBe("https://api.kit.com/v4/broadcasts");
    expect(requests[0]!.method).toBe("GET");
    expect(await requests[0]!.text()).toBe("");
  });

  it.each(["after", "before"] as const)(
    "combines %s pagination with status and both date bounds",
    async (cursor) => {
      const response = { broadcasts: [], pagination };
      fetchMock.mockResponseOnce(JSON.stringify(response));
      const params = {
        [cursor]: "next+/=",
        per_page: 25,
        include_total_count: true,
        status: "completed",
        sent_after: "2026-01-01",
        sent_before: "2026-02-01",
      } satisfies ListBroadcastsParams;

      expect(await kit.broadcasts.list(params)).toEqual(response);
      const requests = fetchMock.requests();
      expect(requests).toHaveLength(1);
      const req = requests[0]!;
      const url = new URL(req.url);
      expect(url.origin).toBe("https://api.kit.com");
      expect(url.pathname).toBe("/v4/broadcasts");
      expect(Object.fromEntries(url.searchParams)).toEqual({
        [cursor]: "next+/=",
        per_page: "25",
        include_total_count: "true",
        status: "completed",
        sent_after: "2026-01-01",
        sent_before: "2026-02-01",
      });
      expect(req.method).toBe("GET");
      expect(await req.text()).toBe("");
    }
  );

  it.each(["draft", "scheduled", "sending", "completed", "aborted"] as const)(
    "sends the %s lifecycle status without other filters",
    async (status) => {
      fetchMock.mockResponseOnce(
        JSON.stringify({ broadcasts: [], pagination })
      );
      await kit.broadcasts.list({ status });
      expect(
        Object.fromEntries(new URL(fetchMock.requests()[0]!.url).searchParams)
      ).toEqual({ status });
    }
  );

  it.each(["sent_after", "sent_before"] as const)(
    "sends %s without requiring the other date bound",
    async (bound) => {
      fetchMock.mockResponseOnce(
        JSON.stringify({ broadcasts: [], pagination })
      );
      await kit.broadcasts.list({ [bound]: "2026-01-01" });
      expect(
        Object.fromEntries(new URL(fetchMock.requests()[0]!.url).searchParams)
      ).toEqual({ [bound]: "2026-01-01" });
    }
  );
});

describe("slim broadcast lists through Kit", () => {
  let kit: Kit;
  const broadcast = {
    status: "draft",
    id: 1,
    publication_id: 2,
    created_at: "2026-01-01T00:00:00Z",
    subject: "Hello",
    preview_text: null,
    description: null,
    public: false,
    published_at: null,
    send_at: null,
    thumbnail_alt: null,
    thumbnail_url: null,
  } satisfies ListSlimBroadcasts["broadcasts"][number];

  beforeEach(() => {
    fetchMock.resetMocks();
    kit = new Kit({ apiKey: "test-key", maxRetries: 0 });
  });

  it("returns slim types and combines slim with filters and pagination", async () => {
    const response = { broadcasts: [broadcast], pagination };
    fetchMock.mockResponseOnce(JSON.stringify(response));
    const result = await kit.broadcasts.list({
      slim: true,
      after: "next+/=",
      per_page: 25,
      status: "completed",
      sent_after: "2026-01-01",
    });
    expectTypeOf(result).toEqualTypeOf<ListSlimBroadcasts>();
    type OmittedFields = Extract<
      keyof ListSlimBroadcasts["broadcasts"][number],
      | "content"
      | "public_url"
      | "email_address"
      | "email_template"
      | "subscriber_filter"
    >;
    expectTypeOf<OmittedFields>().toEqualTypeOf<never>();
    expect(result).toEqual(response);
    expect(
      Object.fromEntries(new URL(fetchMock.requests()[0]!.url).searchParams)
    ).toEqual({
      slim: "true",
      after: "next+/=",
      per_page: "25",
      status: "completed",
      sent_after: "2026-01-01",
    });
  });

  it("sends explicit false and preserves the full response type", async () => {
    const response = {
      broadcasts: [
        {
          ...broadcast,
          content: "<p>Hello</p>",
          public_url: null,
          email_address: "hello@example.com",
          email_template: { id: 3, name: "Default" },
          subscriber_filter: [{ all: [{ type: "tag", ids: [7] }] }],
        },
      ],
      pagination,
    } satisfies ListBroadcasts;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    const result = await kit.broadcasts.list({ slim: false });
    expectTypeOf(result).toEqualTypeOf<ListBroadcasts>();
    expect(result).toEqual(response);
    expect(
      Object.fromEntries(new URL(fetchMock.requests()[0]!.url).searchParams)
    ).toEqual({ slim: "false" });
  });

  it("preserves the full response type for default calls", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ broadcasts: [], pagination }));
    const result = await kit.broadcasts.list();
    expectTypeOf(result).toEqualTypeOf<ListBroadcasts>();
  });

  it("returns a union for runtime boolean options", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({ broadcasts: [broadcast], pagination })
    );
    const params: ListBroadcastsParams = { slim: Boolean(1) };
    const result = await kit.broadcasts.list(params);
    expectTypeOf(result).toEqualTypeOf<ListBroadcasts | ListSlimBroadcasts>();
    expect(result.broadcasts).toEqual([broadcast]);
  });
});

describe("broadcast stats requests through Kit", () => {
  let kit: Kit;

  beforeEach(() => {
    fetchMock.resetMocks();
    kit = new Kit({ apiKey: "test-key", maxRetries: 0 });
  });

  it("preserves calls without options and returns pagination", async () => {
    const response = { broadcasts: [], pagination };
    fetchMock.mockResponseOnce(JSON.stringify(response));

    expect(await kit.broadcasts.getAllStats()).toEqual(response);
    const requests = fetchMock.requests();
    expect(requests).toHaveLength(1);
    const req = requests[0]!;
    expect(req.url).toBe("https://api.kit.com/v4/broadcasts/stats");
    expect(req.method).toBe("GET");
    expect(await req.text()).toBe("");
  });

  it.each(["after", "before"] as const)(
    "encodes the %s cursor with pagination and sent-date filters",
    async (cursor) => {
      const response = {
        broadcasts: [],
        pagination: { ...pagination, total_count: 501 },
      };
      fetchMock.mockResponseOnce(JSON.stringify(response));
      const params = {
        [cursor]: "next+/=",
        per_page: 25,
        include_total_count: true,
        sent_after: "2026-01-01",
        sent_before: "2026-02-01",
        status: "completed",
      } satisfies GetBroadcastStatsParams;

      const result = await kit.broadcasts.getAllStats(params);
      expectTypeOf(result.pagination.total_count).toEqualTypeOf<
        number | undefined
      >();
      expect(result).toEqual(response);
      const requests = fetchMock.requests();
      expect(requests).toHaveLength(1);
      const url = new URL(requests[0]!.url);
      expect(url.pathname).toBe("/v4/broadcasts/stats");
      expect(Object.fromEntries(url.searchParams)).toEqual({
        [cursor]: "next+/=",
        per_page: "25",
        include_total_count: "true",
        sent_after: "2026-01-01",
        sent_before: "2026-02-01",
        status: "completed",
      });
    }
  );

  it("sends an explicit false total-count option", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ broadcasts: [], pagination }));
    await kit.broadcasts.getAllStats({ include_total_count: false });
    const url = new URL(fetchMock.requests()[0]!.url);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      include_total_count: "false",
    });
  });

  it("retrieves the next stats page using the returned cursor", async () => {
    const finalPagination = {
      ...pagination,
      has_previous_page: true,
      has_next_page: false,
      end_cursor: "last",
    };
    fetchMock.mockResponseOnce(JSON.stringify({ broadcasts: [], pagination }));
    fetchMock.mockResponseOnce(
      JSON.stringify({ broadcasts: [], pagination: finalPagination })
    );

    const first = await kit.broadcasts.getAllStats({ per_page: 25 });
    const second = await kit.broadcasts.getAllStats({
      after: first.pagination.end_cursor!,
      per_page: 25,
    });

    expect(second.pagination.has_next_page).toBe(false);
    const requests = fetchMock.requests();
    expect(requests).toHaveLength(2);
    expect(Object.fromEntries(new URL(requests[1]!.url).searchParams)).toEqual({
      after: "next+/=",
      per_page: "25",
    });
  });
});

describe("broadcast link click pagination through Kit", () => {
  let kit: Kit;
  const click = {
    id: 52,
    url: "https://example.com/52",
    unique_clicks: 3,
    click_to_delivery_rate: 0.006,
    click_to_open_rate: 0.03,
  };
  const response = {
    broadcast: { id: 171, clicks: [click] },
    pagination,
  } satisfies GetLinkClicks;

  beforeEach(() => {
    fetchMock.resetMocks();
    kit = new Kit({ apiKey: "test-key", maxRetries: 0 });
  });

  it("preserves single-ID requests and exposes tracked link IDs", async () => {
    fetchMock.mockResponseOnce(JSON.stringify(response));
    const result = await kit.broadcasts.getLinkClicksById(171);
    expectTypeOf(result).toEqualTypeOf<GetLinkClicks | null>();
    expectTypeOf(result!.broadcast.clicks[0]!.id).toEqualTypeOf<number>();
    expect(result).toEqual(response);
    const req = fetchMock.requests()[0]!;
    expect(req.url).toBe("https://api.kit.com/v4/broadcasts/171/clicks");
    expect(req.method).toBe("GET");
    expect(await req.text()).toBe("");
  });

  it.each(["after", "before"] as const)(
    "encodes the %s cursor and pagination options",
    async (cursor) => {
      fetchMock.mockResponseOnce(JSON.stringify(response));
      const params = {
        [cursor]: "next+/=",
        per_page: 25,
        include_total_count: true,
      } satisfies GetLinkClicksParams;
      await kit.broadcasts.getLinkClicksById(171, params);
      const url = new URL(fetchMock.requests()[0]!.url);
      expect(url.pathname).toBe("/v4/broadcasts/171/clicks");
      expect(Object.fromEntries(url.searchParams)).toEqual({
        [cursor]: "next+/=",
        per_page: "25",
        include_total_count: "true",
      });
    }
  );

  it("preserves an explicit false total-count option", async () => {
    fetchMock.mockResponseOnce(JSON.stringify(response));
    await kit.broadcasts.getLinkClicksById(171, { include_total_count: false });
    expect(
      Object.fromEntries(new URL(fetchMock.requests()[0]!.url).searchParams)
    ).toEqual({ include_total_count: "false" });
  });

  it("retrieves a second page using the returned cursor", async () => {
    const lastPage = {
      broadcast: {
        id: 171,
        clicks: [{ ...click, id: 53, url: "https://example.com/53" }],
      },
      pagination: {
        ...pagination,
        has_previous_page: true,
        has_next_page: false,
        total_count: 2,
      },
    } satisfies GetLinkClicks;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    fetchMock.mockResponseOnce(JSON.stringify(lastPage));
    const first = await kit.broadcasts.getLinkClicksById(171, { per_page: 1 });
    const second = await kit.broadcasts.getLinkClicksById(171, {
      after: first!.pagination.end_cursor!,
      per_page: 1,
      include_total_count: true,
    });
    expect(second).toEqual(lastPage);
    expectTypeOf(second!.pagination.total_count).toEqualTypeOf<
      number | undefined
    >();
    expect(
      new URL(fetchMock.requests()[1]!.url).searchParams.get("after")
    ).toBe("next+/=");
    expect(second!.broadcast.clicks[0]!.id).not.toBe(
      first!.broadcast.clicks[0]!.id
    );
  });

  it("preserves null responses and validates IDs before making a request", async () => {
    fetchMock.mockResponseOnce("null");
    expect(
      await kit.broadcasts.getLinkClicksById(171, { per_page: 25 })
    ).toBeNull();
    fetchMock.resetMocks();
    await expect(
      kit.broadcasts.getLinkClicksById(0, { after: "next" })
    ).rejects.toThrow("valid broadcast id");
    expect(fetchMock.requests()).toHaveLength(0);
  });
});

describe("broadcast creation filters through Kit", () => {
  let kit: Kit;
  const draft = {
    subject: "Newsletter",
    content: "<p>Hello</p>",
    description: "Monthly update",
    public: false,
    published_at: "2026-01-01T12:00:00Z",
    send_at: null,
    preview_text: "Our latest news",
  };

  beforeEach(() => {
    fetchMock.resetMocks();
    kit = new Kit({ apiKey: "test-key", maxRetries: 0 });
  });

  it.each(["all", "any", "none"] as const)(
    "sends an array with a %s group targeting tags and segments",
    async (mode) => {
      const group = {
        [mode]: [
          { type: "tag", ids: [7, 8] },
          { type: "segment", ids: [42] },
        ],
      } satisfies BroadcastSubscriberFilterGroup;
      const params = {
        ...draft,
        subscriber_filter: [group],
      } satisfies CreateBroadcastParams;
      const response = { broadcast: { id: 123, ...params } };
      fetchMock.mockResponseOnce(JSON.stringify(response), { status: 201 });

      expect(await kit.broadcasts.create(params)).toEqual(response);
      const requests = fetchMock.requests();
      expect(requests).toHaveLength(1);
      const req = requests[0]!;
      expect(req.method).toBe("POST");
      expect(req.url).toBe("https://api.kit.com/v4/broadcasts");
      expect(req.headers.get("Content-Type")).toBe("application/json");
      expect(await req.json()).toEqual(params);
    }
  );

  it("wraps a legacy object without mutating the input", async () => {
    const group = Object.freeze({
      all: [{ type: "tag", ids: [7] }],
      any: null,
      none: null,
    });
    const params = Object.freeze({
      ...draft,
      subscriber_filter: group,
    }) satisfies CreateBroadcastParams;
    const response = {
      broadcast: { id: 123, ...draft, subscriber_filter: [group] },
    };
    fetchMock.mockResponseOnce(JSON.stringify(response), { status: 201 });

    expect(await kit.broadcasts.create(params)).toEqual(response);
    expect(await fetchMock.requests()[0]!.json()).toEqual({
      ...draft,
      subscriber_filter: [group],
    });
    expect(params.subscriber_filter).toBe(group);
    expect(Array.isArray(params.subscriber_filter)).toBe(false);
  });

  it.each([null, []])("preserves a filter of %j", async (subscriber_filter) => {
    const params = {
      ...draft,
      subscriber_filter,
    } satisfies CreateBroadcastParams;
    fetchMock.mockResponseOnce(JSON.stringify({ broadcast: { id: 123 } }), {
      status: 201,
    });

    await kit.broadcasts.create(params);
    expect(await fetchMock.requests()[0]!.json()).toEqual(params);
  });

  it("preserves timestamp serialization alongside a legacy filter", async () => {
    const group = {
      all: [{ type: "segment", ids: [42] }],
      any: null,
      none: null,
    };
    fetchMock.mockResponseOnce(JSON.stringify({ broadcast: { id: 123 } }), {
      status: 201,
    });

    await kit.broadcasts.create({
      ...draft,
      public: true,
      published_at: new Date("2026-01-01T12:00:00Z"),
      send_at: new Date("2026-02-01T12:00:00Z"),
      subscriber_filter: group,
    });
    expect(await fetchMock.requests()[0]!.json()).toEqual({
      ...draft,
      public: true,
      published_at: "2026-01-01T12:00:00.000Z",
      send_at: "2026-02-01T12:00:00.000Z",
      subscriber_filter: [group],
    });
  });
});
