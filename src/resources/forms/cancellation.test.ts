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
  type ListFormSubscribers,
  type ListFormSubscribersParams,
  type ListSlimFormSubscribers,
  type RequestOptions,
} from "~/index";

const referrer = "https://example.com/?utm_source=test";
const email = { email_address: "test+form@example.com", referrer };
const bulk = { additions: [{ form_id: 123, subscriber_id: 456, referrer }] };
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
const filters = {
  ...pagination,
  created_after: new Date("2026-01-01T00:30:00+10:30"),
  created_before: "2026-02-01",
  added_after: "2026-01-01",
  added_before: new Date("2026-02-01T23:30:00-07:00"),
  slim: true,
  status: "active",
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
    name: "bulkAddSubscribers",
    run: (kit, options) => kit.forms.bulkAddSubscribers(bulk, options),
    method: "POST",
    path: "/bulk/forms/subscribers",
    body: bulk,
    response: { subscribers: [], failures: [] },
    result: { type: "synchronous", subscribers: [], failures: [] },
  },
  {
    name: "bulkAddSubscribers asynchronous",
    run: (kit, options) => kit.forms.bulkAddSubscribers(bulk, options),
    method: "POST",
    path: "/bulk/forms/subscribers",
    body: bulk,
    result: { type: "asynchronous" },
  },
  {
    name: "list",
    run: (kit, options) =>
      kit.forms.list(
        {
          ...pagination,
          include: "subscriber_count",
          status: "archived",
          type: "hosted",
        },
        options
      ),
    method: "GET",
    path: "/forms",
    query: {
      ...paginationQuery,
      include: "subscriber_count",
      status: "archived",
      type: "hosted",
    },
  },
  {
    name: "list without filters",
    run: (kit, options) => kit.forms.list(undefined, options),
    method: "GET",
    path: "/forms",
  },
  {
    name: "listSubscribers",
    run: (kit, options) => kit.forms.listSubscribers(123, filters, options),
    method: "GET",
    path: "/forms/123/subscribers",
    query: {
      ...paginationQuery,
      created_after: "2025-12-31",
      created_before: "2026-02-01",
      added_after: "2026-01-01",
      added_before: "2026-02-02",
      slim: "true",
      status: "active",
    },
  },
  {
    name: "listSubscribers without filters",
    run: (kit, options) => kit.forms.listSubscribers(123, undefined, options),
    method: "GET",
    path: "/forms/123/subscribers",
  },
  {
    name: "addSubscriberByEmail",
    run: (kit, options) => kit.forms.addSubscriberByEmail(123, email, options),
    method: "POST",
    path: "/forms/123/subscribers",
    body: email,
  },
  {
    name: "addSubscriber",
    run: (kit, options) =>
      kit.forms.addSubscriber(123, 456, { referrer }, options),
    method: "POST",
    path: "/forms/123/subscribers/456",
    body: { referrer },
  },
  {
    name: "addSubscriber without referral parameters",
    run: (kit, options) =>
      kit.forms.addSubscriber(123, 456, undefined, options),
    method: "POST",
    path: "/forms/123/subscribers/456",
    body: {},
  },
];

describe.each(scenarios)("form $name cancellation", (scenario) => {
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
        scenario.result ?? response
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
      scenario.run(kit, { signal: controller.signal })
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

describe("form subscriber cancellation return types", () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  it("preserves slim, full, and dynamic return types with request options", async () => {
    const kit = new Kit({ apiKey: "test-key" });
    const options = {
      signal: new AbortController().signal,
    } satisfies RequestOptions;
    const response = {
      subscribers: [],
      pagination: {
        has_previous_page: false,
        has_next_page: false,
        start_cursor: null,
        end_cursor: null,
        per_page: 25,
      },
    } satisfies ListFormSubscribers;
    fetchMock.mockResponse(JSON.stringify(response));
    const slim = await kit.forms.listSubscribers(123, { slim: true }, options);
    expectTypeOf(slim).toEqualTypeOf<ListSlimFormSubscribers | null>();
    const full = await kit.forms.listSubscribers(123, { slim: false }, options);
    expectTypeOf(full).toEqualTypeOf<ListFormSubscribers | null>();
    const omitted = await kit.forms.listSubscribers(123, undefined, options);
    expectTypeOf(omitted).toEqualTypeOf<ListFormSubscribers | null>();
    const explicitUndefined = await kit.forms.listSubscribers(
      123,
      { slim: undefined },
      options
    );
    expectTypeOf(explicitUndefined).toEqualTypeOf<ListFormSubscribers | null>();
    const dynamicParams: ListFormSubscribersParams = {
      slim: Math.random() > 0.5,
    };
    const dynamic = await kit.forms.listSubscribers(
      123,
      dynamicParams,
      options
    );
    expectTypeOf(dynamic).toEqualTypeOf<
      ListFormSubscribers | ListSlimFormSubscribers | null
    >();
    expect([slim, full, omitted, explicitUndefined, dynamic]).toEqual(
      Array.from({ length: 5 }, () => response)
    );
    expect(
      fetchMock.mock.calls.every(([, init]) => init?.signal === options.signal)
    ).toBe(true);
  });
});
