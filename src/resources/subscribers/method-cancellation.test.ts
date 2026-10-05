import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Kit, type RequestOptions } from "~/index";

const subscriber = { email_address: "test@example.com", first_name: "Test" };
const bulk = { subscribers: [subscriber] };
const filter = { all: [] };
const location = {
  location: {
    city: "Denver",
    state_province: "Colorado",
    country_code: "US",
    latitude: 39.74,
    longitude: -104.99,
    timezone: "America/Denver",
  },
};
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
const stats = {
  email_sent_after: "2026-01-01",
  email_sent_before: "2026-02-01",
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
    name: "bulkCreate",
    run: (kit, options) => kit.subscribers.bulkCreate(bulk, options),
    method: "POST",
    path: "/bulk/subscribers",
    body: bulk,
    response: { subscribers: [], failures: [] },
    result: { type: "synchronous", subscribers: [], failures: [] },
  },
  {
    name: "create",
    run: (kit, options) => kit.subscribers.create(subscriber, options),
    method: "POST",
    path: "/subscribers",
    body: subscriber,
  },
  {
    name: "filter",
    run: (kit, options) => kit.subscribers.filter(filter, pagination, options),
    method: "POST",
    path: "/subscribers/filter",
    body: filter,
    query: paginationQuery,
  },
  {
    name: "filter without pagination",
    run: (kit, options) => kit.subscribers.filter(filter, undefined, options),
    method: "POST",
    path: "/subscribers/filter",
    body: filter,
  },
  {
    name: "get",
    run: (kit, options) => kit.subscribers.get(123, options),
    method: "GET",
    path: "/subscribers/123",
  },
  {
    name: "update",
    run: (kit, options) => kit.subscribers.update(123, subscriber, options),
    method: "PUT",
    path: "/subscribers/123",
    body: subscriber,
  },
  {
    name: "unsubscribe",
    result: undefined,
    run: (kit, options) => kit.subscribers.unsubscribe(123, options),
    method: "POST",
    path: "/subscribers/123/unsubscribe",
  },
  {
    name: "pinLocation",
    run: (kit, options) => kit.subscribers.pinLocation(123, location, options),
    method: "POST",
    path: "/subscribers/123/location",
    body: location,
  },
  {
    name: "updateLocation",
    run: (kit, options) =>
      kit.subscribers.updateLocation(123, location, options),
    method: "PATCH",
    path: "/subscribers/123/location",
    body: location,
  },
  {
    name: "deleteLocation",
    result: undefined,
    run: (kit, options) => kit.subscribers.deleteLocation(123, options),
    method: "DELETE",
    path: "/subscribers/123/location",
  },
  {
    name: "getStats",
    run: (kit, options) => kit.subscribers.getStats(123, stats, options),
    method: "GET",
    path: "/subscribers/123/stats",
    query: stats,
  },
  {
    name: "getStats without filters",
    run: (kit, options) => kit.subscribers.getStats(123, undefined, options),
    method: "GET",
    path: "/subscribers/123/stats",
  },
  {
    name: "getTags",
    run: (kit, options) => kit.subscribers.getTags(123, pagination, options),
    method: "GET",
    path: "/subscribers/123/tags",
    query: paginationQuery,
  },
  {
    name: "getTags without pagination",
    run: (kit, options) => kit.subscribers.getTags(123, undefined, options),
    method: "GET",
    path: "/subscribers/123/tags",
  },
];

describe.each(scenarios)("subscriber $name cancellation", (scenario) => {
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
