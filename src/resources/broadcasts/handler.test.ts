import { beforeEach, describe, expect, expectTypeOf, it } from "vitest";
import {
  Kit,
  type BroadcastSubscriberFilterGroup,
  type CreateBroadcast,
  type CreateBroadcastParams,
  type GetBroadcastStats,
  type GetBroadcastStatsParams,
  type GetLinkClicks,
  type GetLinkClicksParams,
  type ListBroadcasts,
  type ListBroadcastsParams,
  type ListSlimBroadcasts,
  type UpdateBroadcastParams,
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

  it.each([
    {
      after: null,
      before: null,
      per_page: null,
      sent_after: null,
      sent_before: null,
    },
    {
      after: undefined,
      before: undefined,
      per_page: undefined,
      sent_after: undefined,
      sent_before: undefined,
    },
  ] satisfies ListBroadcastsParams[])(
    "omits nullable and undefined list filters: %j",
    async (params) => {
      const response = { broadcasts: [], pagination } satisfies ListBroadcasts;
      fetchMock.mockResponseOnce(JSON.stringify(response));
      const result = await kit.broadcasts.list(params);
      expectTypeOf(result).toEqualTypeOf<ListBroadcasts>();
      expectTypeOf<{ per_page: null }>().not.toExtend<GetLinkClicksParams>();
      expectTypeOf<{ after: null }>().not.toExtend<GetLinkClicksParams>();
      expectTypeOf<{ before: null }>().not.toExtend<GetLinkClicksParams>();
      expect(result).toEqual(response);
      expect(fetchMock.requests()).toHaveLength(1);
      const req = fetchMock.requests()[0]!;
      expect(req.method).toBe("GET");
      expect(req.url).toBe("https://api.kit.com/v4/broadcasts");
    }
  );

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
      before: null,
      sent_before: null,
    } satisfies ListBroadcastsParams & { slim: true });
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

  it("omits all nullable filters while preserving the slim response type", async () => {
    const response = {
      broadcasts: [broadcast],
      pagination,
    } satisfies ListSlimBroadcasts;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    const result = await kit.broadcasts.list({
      slim: true,
      after: null,
      before: null,
      per_page: null,
      sent_after: null,
      sent_before: null,
      status: "draft",
      include_total_count: false,
    } satisfies ListBroadcastsParams & { slim: true });
    expectTypeOf(result).toEqualTypeOf<ListSlimBroadcasts>();
    expect(result).toEqual(response);
    expect(
      Object.fromEntries(new URL(fetchMock.requests()[0]!.url).searchParams)
    ).toEqual({
      slim: "true",
      status: "draft",
      include_total_count: "false",
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
    const result = await kit.broadcasts.list({
      slim: false,
      after: null,
      before: null,
      per_page: null,
      sent_after: null,
      sent_before: null,
      status: "draft",
      include_total_count: false,
    } satisfies ListBroadcastsParams & { slim: false });
    expectTypeOf(result).toEqualTypeOf<ListBroadcasts>();
    expect(result).toEqual(response);
    expect(
      Object.fromEntries(new URL(fetchMock.requests()[0]!.url).searchParams)
    ).toEqual({ slim: "false", status: "draft", include_total_count: "false" });
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

  it.each([
    {
      after: null,
      before: null,
      per_page: null,
      sent_after: null,
      sent_before: null,
    },
    {
      after: undefined,
      before: undefined,
      per_page: undefined,
      sent_after: undefined,
      sent_before: undefined,
    },
  ] satisfies GetBroadcastStatsParams[])(
    "omits nullable and undefined stats filters: %j",
    async (params) => {
      const response = {
        broadcasts: [],
        pagination,
      } satisfies GetBroadcastStats;
      fetchMock.mockResponseOnce(JSON.stringify(response));
      expect(await kit.broadcasts.getAllStats(params)).toEqual(response);
      expect(fetchMock.requests()).toHaveLength(1);
      const req = fetchMock.requests()[0]!;
      expect(req.method).toBe("GET");
      expect(req.url).toBe("https://api.kit.com/v4/broadcasts/stats");
    }
  );

  it.each(["draft", "scheduled", "sending", "completed", "aborted"] as const)(
    "preserves %s status and false counts alongside nullable filters",
    async (status) => {
      const params = {
        after: null,
        before: null,
        per_page: null,
        sent_after: null,
        sent_before: null,
        status,
        include_total_count: false,
      } satisfies GetBroadcastStatsParams;
      fetchMock.mockResponseOnce(
        JSON.stringify({ broadcasts: [], pagination })
      );
      await kit.broadcasts.getAllStats(params);
      expect(
        Object.fromEntries(new URL(fetchMock.requests()[0]!.url).searchParams)
      ).toEqual({
        status,
        include_total_count: "false",
      });
    }
  );

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

  it("exposes optional subject and nullable send time without requiring metadata", async () => {
    const stats = {
      recipients: 0,
      open_rate: 0,
      emails_opened: 0,
      click_rate: 0,
      unsubscribe_rate: 0,
      unsubscribes: 0,
      total_clicks: 0,
      show_total_clicks: false,
      status: "draft",
      progress: 0,
      open_tracking_disabled: false,
      click_tracking_disabled: false,
    };
    const response = {
      broadcasts: [
        { id: 1, subject: "Draft", send_at: null, stats },
        { id: 2, subject: "Scheduled", send_at: "2026-10-10T12:00:00Z", stats },
        { id: 3, stats },
      ],
      pagination,
    } satisfies GetBroadcastStats;
    fetchMock.mockResponseOnce(JSON.stringify(response));

    const result = await kit.broadcasts.getAllStats();
    expectTypeOf(result.broadcasts[0]!.subject).toEqualTypeOf<
      string | undefined
    >();
    expectTypeOf(result.broadcasts[0]!.send_at).toEqualTypeOf<
      string | null | undefined
    >();
    expect(result).toEqual(response);
    expect(result.broadcasts.map((item) => item.subject)).toEqual([
      "Draft",
      "Scheduled",
      undefined,
    ]);
    expect(result.broadcasts.map((item) => item.send_at)).toEqual([
      null,
      "2026-10-10T12:00:00Z",
      undefined,
    ]);
    expect(result.broadcasts[2]).not.toHaveProperty("send_at");
  });

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
    expectTypeOf(result).toEqualTypeOf<GetLinkClicks>();
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

  it("throws for missing broadcasts and validates IDs before making a request", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ errors: ["Not found"] }), {
      status: 404,
    });
    await expect(
      kit.broadcasts.getLinkClicksById(171, { per_page: 25 })
    ).rejects.toMatchObject({ name: "ApiError", status: 404 });
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

  it.each([null, "2026-10-06T09:00:00Z"])(
    "does not retry broadcast creation with send_at %s",
    async (send_at) => {
      const params = {
        ...draft,
        send_at,
        subscriber_filter: null,
      } satisfies CreateBroadcastParams;
      for (const failure of ["network", 500, 503, 429] as const) {
        fetchMock.resetMocks();
        kit = new Kit({ apiKey: "test-key", maxRetries: 3, retryDelay: 0 });
        if (failure === "network") {
          fetchMock.mockRejectOnce(new Error("Connection lost"));
        } else {
          fetchMock.mockResponseOnce(JSON.stringify({ errors: ["Failed"] }), {
            status: failure,
          });
        }
        fetchMock.mockResponseOnce("{}");
        await expect(kit.broadcasts.create(params)).rejects.toThrow();
        expect(fetchMock.requests()).toHaveLength(1);
        expect(await fetchMock.requests()[0]!.json()).toEqual(params);
      }
    }
  );

  it.each([null, "2026-10-06T09:00:00Z"])(
    "honors an explicit retry override with send_at %s",
    async (send_at) => {
      kit = new Kit({ apiKey: "test-key", maxRetries: 0, retryDelay: 0 });
      const params = {
        ...draft,
        send_at,
        subscriber_filter: null,
      } satisfies CreateBroadcastParams;
      const response = {
        broadcast: {
          ...draft,
          send_at,
          id: 123,
          publication_id: 123,
          created_at: "2026-01-01T12:00:00Z",
          status: send_at ? "scheduled" : "draft",
          public_url: null,
          thumbnail_alt: null,
          thumbnail_url: null,
          email_address: "ada@example.com",
          email_template: { id: 2, name: "Classic" },
          subscriber_filter: [{ all: [{ type: "all_subscribers" }] }],
        },
      } satisfies CreateBroadcast;
      fetchMock.mockRejectOnce(new Error("Connection lost"));
      fetchMock.mockResponseOnce(JSON.stringify(response));
      expect(await kit.broadcasts.create(params, { maxRetries: 1 })).toEqual(
        response
      );
      expect(fetchMock.requests()).toHaveLength(2);
      for (const req of fetchMock.requests()) {
        expect(await req.json()).toEqual(params);
      }
      expect(kit.maxRetries).toBe(0);
    }
  );

  it("does not retry creation for an undefined override", async () => {
    kit = new Kit({ apiKey: "test-key", maxRetries: 3, retryDelay: 0 });
    fetchMock.mockRejectOnce(new Error("Connection lost"));
    await expect(
      kit.broadcasts.create(
        { ...draft, subscriber_filter: null },
        { maxRetries: undefined }
      )
    ).rejects.toThrow("Connection lost");
    expect(fetchMock.requests()).toHaveLength(1);
  });

  it("retains client retries for broadcast reads", async () => {
    kit = new Kit({ apiKey: "test-key", maxRetries: 1, retryDelay: 0 });
    const response = { broadcasts: [], pagination } satisfies ListBroadcasts;
    fetchMock.mockRejectOnce(new Error("Connection lost"));
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.broadcasts.list()).toEqual(response);
    expect(fetchMock.requests()).toHaveLength(2);
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

  it.each([null, "https://example.kit.com/posts/newsletter"])(
    "exposes the create response public URL (%s)",
    async (public_url) => {
      const params = {
        ...draft,
        public: public_url !== null,
        subscriber_filter: null,
      } satisfies CreateBroadcastParams;
      const response = {
        broadcast: {
          id: 123,
          publication_id: 123,
          created_at: "2026-01-01T12:00:00Z",
          ...draft,
          public: params.public,
          status: "draft",
          public_url,
          thumbnail_alt: null,
          thumbnail_url: null,
          email_address: "ada@example.com",
          email_template: { id: 2, name: "Classic" },
          subscriber_filter: [{ all: [{ type: "all_subscribers" }] }],
        },
      } satisfies CreateBroadcast;
      fetchMock.mockResponseOnce(JSON.stringify(response), { status: 201 });

      const result = await kit.broadcasts.create(params);
      expectTypeOf(result.broadcast.public_url).toEqualTypeOf<string | null>();
      expect(result.broadcast.public_url).toBe(public_url);
      expect(await fetchMock.requests()[0]!.json()).toEqual(params);
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

describe("broadcast Starting point option through Kit", () => {
  const draft = {
    email_template_id: 3,
    email_address: null,
    subject: "Newsletter",
    content:
      "<html><body>Hello {{ unsubscribe_url }} {{ address }}</body></html>",
    description: "Monthly update",
    public: false,
    published_at: "2026-01-01T12:00:00Z",
    send_at: null,
    thumbnail_alt: null,
    thumbnail_url: null,
    preview_text: "Our latest news",
    subscriber_filter: [
      { all: [{ type: "tag", ids: [7] }], any: null, none: null },
    ],
  };
  let kit: Kit;

  beforeEach(() => {
    fetchMock.resetMocks();
    kit = new Kit({ apiKey: "test-key", maxRetries: 0 });
  });

  describe.each(["create", "update"] as const)("%s", (method) => {
    it.each([
      {
        name: "enabled",
        option: { allow_starting_point: true },
        expected: true,
      },
      {
        name: "disabled",
        option: { allow_starting_point: false },
        expected: false,
      },
      { name: "omitted", option: {}, expected: undefined },
      {
        name: "undefined",
        option: { allow_starting_point: undefined },
        expected: undefined,
      },
    ])("serializes the $name option", async ({ option, expected }) => {
      const response = { broadcast: { id: 123, ...draft } };
      fetchMock.mockResponseOnce(JSON.stringify(response), {
        status: method === "create" ? 201 : 200,
      });

      const params = { ...draft, ...option } satisfies CreateBroadcastParams &
        UpdateBroadcastParams;
      const result =
        method === "create"
          ? await kit.broadcasts.create(params)
          : await kit.broadcasts.update(123, params);

      expect(result).toEqual(response);
      const requests = fetchMock.requests();
      expect(requests).toHaveLength(1);
      const req = requests[0]!;
      expect(req.method).toBe(method === "create" ? "POST" : "PUT");
      expect(req.url).toBe(
        `https://api.kit.com/v4/broadcasts${method === "update" ? "/123" : ""}`
      );
      expect(req.headers.get("Content-Type")).toBe("application/json");
      expect(await req.json()).toEqual({
        ...draft,
        ...(expected !== undefined && { allow_starting_point: expected }),
      });
    });
  });
});

describe("broadcast creation with a template design through Kit", () => {
  const draft = {
    email_template_id: 3,
    subject: "Newsletter",
    description: "Monthly update",
    public: false,
    published_at: "2026-01-01T12:00:00Z",
    send_at: null,
    preview_text: "Our latest news",
    subscriber_filter: [{ all: [{ type: "tag", ids: [7] }] }],
  } satisfies CreateBroadcastParams;
  let kit: Kit;

  beforeEach(() => {
    fetchMock.resetMocks();
    kit = new Kit({ apiKey: "test-key", maxRetries: 0 });
  });

  it.each([
    { name: "omitted content", option: {}, expected: {} },
    { name: "undefined content", option: { content: undefined }, expected: {} },
    {
      name: "empty content",
      option: { content: "" },
      expected: { content: "" },
    },
    {
      name: "custom HTML content",
      option: {
        content:
          "<html><body>Hello {{ unsubscribe_url }} {{ address }}</body></html>",
        allow_starting_point: true,
      },
      expected: {
        content:
          "<html><body>Hello {{ unsubscribe_url }} {{ address }}</body></html>",
        allow_starting_point: true,
      },
    },
  ])("preserves $name in the request", async ({ option, expected }) => {
    const params = { ...draft, ...option } satisfies CreateBroadcastParams;
    const response = {
      broadcast: { id: 123, content: "<p>Template design</p>" },
    };
    fetchMock.mockResponseOnce(JSON.stringify(response), { status: 201 });

    expect(await kit.broadcasts.create(params)).toEqual(response);
    const requests = fetchMock.requests();
    expect(requests).toHaveLength(1);
    const req = requests[0]!;
    expect(req.method).toBe("POST");
    expect(req.url).toBe("https://api.kit.com/v4/broadcasts");
    expect(req.headers.get("Content-Type")).toBe("application/json");
    expect(await req.json()).toEqual({ ...draft, ...expected });
  });
});
