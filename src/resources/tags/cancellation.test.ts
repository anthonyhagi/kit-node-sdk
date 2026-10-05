import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Kit, type RequestOptions } from "~/index";

const tag = { name: "Test" };
const taggings = { taggings: [{ tag_id: 123, subscriber_id: 456 }] };
const email = { email_address: "test+tag@example.com" };
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
  tagged_after: "2026-01-01",
  tagged_before: new Date("2026-02-01T23:30:00-07:00"),
  slim: false,
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
    name: "bulkDelete",
    run: (kit, options) =>
      kit.tags.bulkDelete({ tags: [{ id: 123 }] }, options),
    method: "DELETE",
    path: "/bulk/tags",
    body: { tags: [{ id: 123 }] },
    response: { failures: [] },
    result: { type: "synchronous", failures: [] },
  },
  {
    name: "bulkCreate",
    run: (kit, options) => kit.tags.bulkCreate({ tags: [tag] }, options),
    method: "POST",
    path: "/bulk/tags",
    body: { tags: [tag] },
    response: { tags: [], failures: [] },
    result: { type: "synchronous", tags: [], failures: [] },
  },
  {
    name: "bulkRemove",
    run: (kit, options) => kit.tags.bulkRemove(taggings, options),
    method: "DELETE",
    path: "/bulk/tags/subscribers",
    body: taggings,
    response: { failures: [] },
    result: { type: "synchronous", failures: [] },
  },
  {
    name: "bulkTag",
    run: (kit, options) => kit.tags.bulkTag(taggings, options),
    method: "POST",
    path: "/bulk/tags/subscribers",
    body: taggings,
    response: { subscribers: [], failures: [] },
    result: { type: "synchronous", subscribers: [], failures: [] },
  },
  {
    name: "list",
    run: (kit, options) =>
      kit.tags.list({ ...pagination, include: "subscriber_count" }, options),
    method: "GET",
    path: "/tags",
    query: { ...paginationQuery, include: "subscriber_count" },
  },
  {
    name: "list without pagination",
    run: (kit, options) => kit.tags.list(undefined, options),
    method: "GET",
    path: "/tags",
  },
  {
    name: "create",
    run: (kit, options) => kit.tags.create(tag, options),
    method: "POST",
    path: "/tags",
    body: tag,
  },
  {
    name: "update",
    run: (kit, options) => kit.tags.update(123, tag, options),
    method: "PUT",
    path: "/tags/123",
    body: tag,
  },
  {
    name: "removeSubscriberByEmail",
    run: (kit, options) =>
      kit.tags.removeSubscriberByEmail(123, email, options),
    method: "DELETE",
    path: "/tags/123/subscribers",
    query: email,
  },
  {
    name: "listSubscribers",
    run: (kit, options) => kit.tags.listSubscribers(123, filters, options),
    method: "GET",
    path: "/tags/123/subscribers",
    query: {
      ...paginationQuery,
      created_after: "2025-12-31",
      created_before: "2026-02-01",
      tagged_after: "2026-01-01",
      tagged_before: "2026-02-02",
      slim: "false",
      status: "active",
    },
  },
  {
    name: "listSubscribers without filters",
    run: (kit, options) => kit.tags.listSubscribers(123, undefined, options),
    method: "GET",
    path: "/tags/123/subscribers",
  },
  {
    name: "tagSubscriberByEmail",
    run: (kit, options) => kit.tags.tagSubscriberByEmail(123, email, options),
    method: "POST",
    path: "/tags/123/subscribers",
    body: email,
  },
  {
    name: "removeSubscriber",
    run: (kit, options) => kit.tags.removeSubscriber(123, 456, options),
    method: "DELETE",
    path: "/tags/123/subscribers/456",
  },
  {
    name: "tagSubscriber",
    run: (kit, options) => kit.tags.tagSubscriber(123, 456, options),
    method: "POST",
    path: "/tags/123/subscribers/456",
  },
  {
    name: "bulkDelete asynchronous",
    run: (kit, options) =>
      kit.tags.bulkDelete({ tags: [{ id: 123 }] }, options),
    method: "DELETE",
    path: "/bulk/tags",
    body: { tags: [{ id: 123 }] },
    result: { type: "asynchronous" },
  },
  {
    name: "bulkCreate asynchronous",
    run: (kit, options) => kit.tags.bulkCreate({ tags: [tag] }, options),
    method: "POST",
    path: "/bulk/tags",
    body: { tags: [tag] },
    result: { type: "asynchronous" },
  },
  {
    name: "bulkRemove asynchronous",
    run: (kit, options) => kit.tags.bulkRemove(taggings, options),
    method: "DELETE",
    path: "/bulk/tags/subscribers",
    body: taggings,
    result: { type: "asynchronous" },
  },
  {
    name: "bulkTag asynchronous",
    run: (kit, options) => kit.tags.bulkTag(taggings, options),
    method: "POST",
    path: "/bulk/tags/subscribers",
    body: taggings,
    result: { type: "asynchronous" },
  },
];

describe.each(scenarios)("tag $name cancellation", (scenario) => {
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
