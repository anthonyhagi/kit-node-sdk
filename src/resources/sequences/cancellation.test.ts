import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Kit, type CreateSequenceParams, type RequestOptions } from "~/index";

const sequence = {
  name: "Welcome",
  active: false,
  repeat: false,
  send_days: ["monday"],
  send_hour: 9,
  time_zone: "America/Denver",
  exclude_subscriber_sources: [{ type: "tag", ids: [123] }],
} satisfies CreateSequenceParams;
const email = { email_address: "test+sequence@example.com" };
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
    name: "list",
    run: (kit, options) =>
      kit.sequences.list({ ...pagination, include: "stats" }, options),
    method: "GET",
    path: "/sequences",
    query: { ...paginationQuery, include: "stats" },
  },
  {
    name: "list without filters",
    run: (kit, options) => kit.sequences.list(undefined, options),
    method: "GET",
    path: "/sequences",
  },
  {
    name: "create",
    run: (kit, options) => kit.sequences.create(sequence, options),
    method: "POST",
    path: "/sequences",
    body: sequence,
  },
  {
    name: "get",
    run: (kit, options) =>
      kit.sequences.get(123, { include: "stats" }, options),
    method: "GET",
    path: "/sequences/123",
    query: { include: "stats" },
  },
  {
    name: "get without inclusion options",
    run: (kit, options) => kit.sequences.get(123, undefined, options),
    method: "GET",
    path: "/sequences/123",
  },
  {
    name: "update",
    run: (kit, options) =>
      kit.sequences.update(123, { active: false }, options),
    method: "PUT",
    path: "/sequences/123",
    body: { active: false },
  },
  {
    name: "delete",
    run: (kit, options) => kit.sequences.delete(123, options),
    method: "DELETE",
    path: "/sequences/123",
  },
  {
    name: "listSubscribers",
    run: (kit, options) => kit.sequences.listSubscribers(123, filters, options),
    method: "GET",
    path: "/sequences/123/subscribers",
    query: {
      ...paginationQuery,
      created_after: "2025-12-31",
      created_before: "2026-02-01",
      added_after: "2026-01-01",
      added_before: "2026-02-02",
      status: "active",
    },
  },
  {
    name: "listSubscribers without filters",
    run: (kit, options) =>
      kit.sequences.listSubscribers(123, undefined, options),
    method: "GET",
    path: "/sequences/123/subscribers",
  },
  {
    name: "addSubscriberByEmail",
    run: (kit, options) =>
      kit.sequences.addSubscriberByEmail(123, email, options),
    method: "POST",
    path: "/sequences/123/subscribers",
    body: email,
  },
  {
    name: "addSubscriberById",
    run: (kit, options) => kit.sequences.addSubscriberById(123, 456, options),
    method: "POST",
    path: "/sequences/123/subscribers/456",
  },
];

describe.each(scenarios)("sequence $name cancellation", (scenario) => {
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
