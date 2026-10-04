import { beforeEach, describe, expect, expectTypeOf, it } from "vitest";
import {
  Kit,
  type BroadcastSubscriberFilterGroup,
  type CreateBroadcastParams,
  type GetBroadcastStatsParams,
} from "~/index";

const pagination = {
  has_previous_page: false,
  has_next_page: true,
  start_cursor: "start",
  end_cursor: "next+/=",
  per_page: 25,
};

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
