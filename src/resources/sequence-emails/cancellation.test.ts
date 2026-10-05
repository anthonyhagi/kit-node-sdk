import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  Kit,
  type CreateSequenceEmailParams,
  type RequestOptions,
} from "~/index";

const email = {
  subject: "Welcome",
  delay_value: 0,
  delay_unit: "hours",
  published: false,
  content: null,
  position: null,
} satisfies CreateSequenceEmailParams;
const update = { content: "<p>Hello</p>", published: false, position: null };
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
    name: "create",
    run: (kit, options) => kit.sequenceEmails.create(123, email, options),
    method: "POST",
    path: "/sequences/123/emails",
    body: email,
  },
  {
    name: "update",
    run: (kit, options) => kit.sequenceEmails.update(123, 456, update, options),
    method: "PUT",
    path: "/sequences/123/emails/456",
    body: update,
  },
  {
    name: "delete",
    run: (kit, options) => kit.sequenceEmails.delete(123, 456, options),
    method: "DELETE",
    path: "/sequences/123/emails/456",
  },
  {
    name: "get",
    run: (kit, options) =>
      kit.sequenceEmails.get(123, 456, { include: "stats" }, options),
    method: "GET",
    path: "/sequences/123/emails/456",
    query: { include: "stats" },
  },
  {
    name: "get without inclusion options",
    run: (kit, options) => kit.sequenceEmails.get(123, 456, undefined, options),
    method: "GET",
    path: "/sequences/123/emails/456",
  },
  {
    name: "list",
    run: (kit, options) =>
      kit.sequenceEmails.list(
        123,
        { ...pagination, include: "stats", include_content: false },
        options
      ),
    method: "GET",
    path: "/sequences/123/emails",
    query: { ...paginationQuery, include: "stats", include_content: "false" },
  },
  {
    name: "list without filters",
    run: (kit, options) => kit.sequenceEmails.list(123, undefined, options),
    method: "GET",
    path: "/sequences/123/emails",
  },
];

describe.each(scenarios)("sequence-email $name cancellation", (scenario) => {
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
