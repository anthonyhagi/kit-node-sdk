import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Kit, type RequestOptions, type WebhookEndpoint } from "~/index";

const create = {
  url: "https://example.com/webhook",
  events: ["subscriber.activated"],
  name: "Test",
  description: "Test endpoint",
};
const update = { status: "disabled" } as const;
const endpoint = {
  id: 123,
  ...create,
  status: "active",
  source: "api",
  created_by_app: null,
  created_at: "2026-01-01T00:00:00Z",
  previous_secret_expires_at: null,
} satisfies WebhookEndpoint;
const response = { webhook_endpoint: endpoint };
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
const listResponse = {
  webhook_endpoints: [endpoint],
  pagination: {
    has_previous_page: false,
    has_next_page: false,
    start_cursor: null,
    end_cursor: null,
    per_page: 25,
  },
};
const createdResponse = {
  webhook_endpoint: { ...endpoint, secret: "test-signing-secret" },
};
const rotatedResponse = {
  webhook_endpoint: {
    ...endpoint,
    secret: "test-rotated-secret",
    previous_secret_expires_at: "2026-01-02T00:00:00Z",
  },
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
    run: (kit, options) => kit.webhookEndpoints.create(create, options),
    method: "POST",
    path: "/webhook_endpoints",
    response: createdResponse,
    body: create,
  },
  {
    name: "update",
    run: (kit, options) => kit.webhookEndpoints.update(123, update, options),
    method: "PATCH",
    path: "/webhook_endpoints/123",
    response,
    body: update,
  },
  {
    name: "delete",
    run: (kit, options) => kit.webhookEndpoints.delete(123, options),
    method: "DELETE",
    path: "/webhook_endpoints/123",
    response: {},
  },
  {
    name: "get",
    run: (kit, options) => kit.webhookEndpoints.get(123, options),
    method: "GET",
    path: "/webhook_endpoints/123",
    response,
  },
  {
    name: "list",
    run: (kit, options) =>
      kit.webhookEndpoints.list({ ...pagination, status: "disabled" }, options),
    method: "GET",
    path: "/webhook_endpoints",
    response: listResponse,
    query: { ...paginationQuery, status: "disabled" },
  },
  {
    name: "list without filters",
    run: (kit, options) => kit.webhookEndpoints.list(undefined, options),
    method: "GET",
    path: "/webhook_endpoints",
    response: listResponse,
  },
  {
    name: "rotateSecret",
    run: (kit, options) =>
      kit.webhookEndpoints.rotateSecret(123, { force: false }, options),
    method: "POST",
    path: "/webhook_endpoints/123/rotate_secret",
    response: rotatedResponse,
    body: { force: false },
  },
  {
    name: "rotateSecret without force options",
    run: (kit, options) =>
      kit.webhookEndpoints.rotateSecret(123, undefined, options),
    method: "POST",
    path: "/webhook_endpoints/123/rotate_secret",
    response: rotatedResponse,
    body: {},
  },
  {
    name: "revokePreviousSecret",
    run: (kit, options) =>
      kit.webhookEndpoints.revokePreviousSecret(123, options),
    method: "POST",
    path: "/webhook_endpoints/123/revoke_previous_secret",
    response,
  },
];

describe.each(scenarios)("webhook endpoint $name cancellation", (scenario) => {
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
