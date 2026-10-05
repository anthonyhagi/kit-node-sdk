import {
  afterEach,
  beforeEach,
  describe,
  expect,
  expectTypeOf,
  it,
  vi,
} from "vitest";
import {
  Kit,
  type CreateBroadcastParams,
  type ListBroadcasts,
  type ListBroadcastsParams,
  type ListSlimBroadcasts,
  type RequestOptions,
  type UpdateBroadcastParams,
} from "~/index";

const create = {
  subject: "Test",
  preview_text: "Preview",
  description: "Description",
  content: "<p>Hello</p>",
  public: false,
  published_at: new Date("2026-01-01T00:00:00Z"),
  send_at: null,
  subscriber_filter: { any: [{ type: "tag", ids: [123] }] },
} satisfies CreateBroadcastParams;
const update = {
  ...create,
  email_template_id: null,
  email_address: null,
  thumbnail_alt: null,
  thumbnail_url: null,
  subscriber_filter: [
    { all: [{ type: "tag", ids: [123] }], any: null, none: null },
  ],
} satisfies UpdateBroadcastParams;
const pagination = {
  after: "next+/=",
  per_page: 25,
  include_total_count: false,
};
const paginationQuery = {
  after: "next+/=",
  per_page: "25",
  include_total_count: "false",
};
const sentFilters = {
  ...pagination,
  sent_after: "2026-01-01",
  sent_before: "2026-02-01",
  status: "completed",
} satisfies ListBroadcastsParams;
const sentQuery = {
  ...paginationQuery,
  sent_after: "2026-01-01",
  sent_before: "2026-02-01",
  status: "completed",
};

interface Scenario {
  name: string;
  run: (kit: Kit, options?: RequestOptions) => Promise<unknown>;
  method: string;
  path: string;
  body?: unknown;
  query?: Record<string, string>;
  response?: unknown;
  result?: unknown;
}

const scenarios: Scenario[] = [
  {
    name: "list",
    run: (kit, options) =>
      kit.broadcasts.list({ ...sentFilters, slim: true }, options),
    method: "GET",
    path: "/broadcasts",
    query: { ...sentQuery, slim: "true" },
  },
  {
    name: "list without filters",
    run: (kit, options) => kit.broadcasts.list(undefined, options),
    method: "GET",
    path: "/broadcasts",
  },
  {
    name: "create",
    run: (kit, options) => kit.broadcasts.create(create, options),
    method: "POST",
    path: "/broadcasts",
    body: { ...create, subscriber_filter: [create.subscriber_filter] },
  },
  {
    name: "update",
    run: (kit, options) => kit.broadcasts.update(123, update, options),
    method: "PUT",
    path: "/broadcasts/123",
    body: update,
  },
  {
    name: "get",
    run: (kit, options) => kit.broadcasts.get(123, options),
    method: "GET",
    path: "/broadcasts/123",
  },
  {
    name: "delete",
    result: undefined,
    run: (kit, options) => kit.broadcasts.delete(123, options),
    method: "DELETE",
    path: "/broadcasts/123",
  },
  {
    name: "getStats",
    run: (kit, options) => kit.broadcasts.getStats(123, options),
    method: "GET",
    path: "/broadcasts/123/stats",
  },
  {
    name: "getAllStats",
    run: (kit, options) => kit.broadcasts.getAllStats(sentFilters, options),
    method: "GET",
    path: "/broadcasts/stats",
    query: sentQuery,
  },
  {
    name: "getAllStats without filters",
    run: (kit, options) => kit.broadcasts.getAllStats(undefined, options),
    method: "GET",
    path: "/broadcasts/stats",
  },
  {
    name: "getLinkClicksById",
    run: (kit, options) =>
      kit.broadcasts.getLinkClicksById(123, pagination, options),
    method: "GET",
    path: "/broadcasts/123/clicks",
    query: paginationQuery,
  },
  {
    name: "getLinkClicksById without pagination",
    run: (kit, options) =>
      kit.broadcasts.getLinkClicksById(123, undefined, options),
    method: "GET",
    path: "/broadcasts/123/clicks",
  },
];

describe.each(scenarios)("broadcast $name cancellation", (scenario) => {
  let kit: Kit;

  beforeEach(() => {
    fetchMock.resetMocks();
    vi.useFakeTimers();
    kit = new Kit({ apiKey: "test-key", maxRetries: 2, retryDelay: 1000 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it.each([false, true])(
    "preserves request and response with cancellation options: %s",
    async (withSignal) => {
      const controller = new AbortController();
      const options = withSignal ? { signal: controller.signal } : undefined;
      const response = scenario.response ?? {};
      fetchMock.mockResponseOnce(JSON.stringify(response));
      await expect(scenario.run(kit, options)).resolves.toEqual(
        "result" in scenario ? scenario.result : response
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0]!;
      const parsedUrl = new URL(String(url));
      expect(parsedUrl.pathname).toBe(`/v4${scenario.path}`);
      expect(Object.fromEntries(parsedUrl.searchParams)).toEqual(
        scenario.query ?? {}
      );
      expect(init?.method).toBe(scenario.method);
      expect(init?.body).toBe(
        scenario.body === undefined ? undefined : JSON.stringify(scenario.body)
      );
      expect(init?.signal).toBe(withSignal ? controller.signal : undefined);
      expect(vi.getTimerCount()).toBe(0);
    }
  );

  it("prevents a request with an already aborted signal", async () => {
    const controller = new AbortController();
    const reason = new Error("Already cancelled");
    controller.abort(reason);
    await expect(scenario.run(kit, { signal: controller.signal })).rejects.toBe(
      reason
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cancels a pending request without retrying", async () => {
    const controller = new AbortController();
    const reason = new Error("Cancelled request");
    fetchMock.mockImplementation(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(init.signal?.reason),
            { once: true }
          );
        })
    );
    const result = expect(
      scenario.run(kit, { signal: controller.signal })
    ).rejects.toBe(reason);
    controller.abort(reason);
    await result;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cancels a rate-limit retry wait", async () => {
    fetchMock.mockResponseOnce("", {
      status: 429,
      headers: { "Retry-After": "60" },
    });
    const controller = new AbortController();
    const reason = new Error("Cancelled retry");
    const result = expect(
      scenario.run(kit, { signal: controller.signal, maxRetries: 1 })
    ).rejects.toBe(reason);
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBe(1);
    controller.abort(reason);
    await result;
    await vi.advanceTimersByTimeAsync(60000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("broadcast list cancellation return types", () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  it("preserves slim, full, and dynamic return types with request options", async () => {
    const kit = new Kit({ apiKey: "test-key" });
    const options = {
      signal: new AbortController().signal,
    } satisfies RequestOptions;
    const response = {
      broadcasts: [],
      pagination: {
        has_previous_page: false,
        has_next_page: false,
        start_cursor: null,
        end_cursor: null,
        per_page: 25,
      },
    } satisfies ListBroadcasts;
    fetchMock.mockResponse(JSON.stringify(response));
    const slim = await kit.broadcasts.list({ slim: true }, options);
    expectTypeOf(slim).toEqualTypeOf<ListSlimBroadcasts>();
    const full = await kit.broadcasts.list({ slim: false }, options);
    expectTypeOf(full).toEqualTypeOf<ListBroadcasts>();
    const omitted = await kit.broadcasts.list(undefined, options);
    expectTypeOf(omitted).toEqualTypeOf<ListBroadcasts>();
    const explicitUndefined = await kit.broadcasts.list(
      { slim: undefined },
      options
    );
    expectTypeOf(explicitUndefined).toEqualTypeOf<ListBroadcasts>();
    const dynamicParams: ListBroadcastsParams = {
      slim: Math.random() > 0.5,
    };
    const dynamic = await kit.broadcasts.list(dynamicParams, options);
    expectTypeOf(dynamic).toEqualTypeOf<ListBroadcasts | ListSlimBroadcasts>();
    expect([slim, full, omitted, explicitUndefined, dynamic]).toEqual(
      Array.from({ length: 5 }, () => response)
    );
    expect(
      fetchMock.mock.calls.every(([, init]) => init?.signal === options.signal)
    ).toBe(true);
  });
});
