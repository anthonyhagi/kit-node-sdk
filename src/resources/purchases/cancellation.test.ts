import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  Kit,
  type CreatePurchase,
  type CreatePurchaseParams,
  type ListPurchases,
  type RequestOptions,
} from "~/index";

const purchase = {
  purchase: {
    email_address: "test+purchase@example.com",
    first_name: null,
    transaction_id: "order-123",
    currency: "USD",
    transaction_time: new Date("2026-01-01T00:00:00Z"),
    subtotal: 25,
    discount: 0,
    tax: 0,
    shipping: 0,
    total: 25,
    products: [
      {
        name: "Test product",
        pid: "product-123",
        lid: "line-1",
        quantity: 1,
        sku: null,
        unit_price: 25,
      },
    ],
  },
} satisfies CreatePurchaseParams;
const response = {
  purchase: {
    id: 123,
    email_address: "test+purchase@example.com",
    transaction_id: "order-123",
    currency: "USD",
    status: "paid",
    subscriber_id: 456,
    transaction_time: "2026-01-01T00:00:00.000Z",
    subtotal: 25,
    discount: 0,
    tax: 0,
    total: 25,
    products: purchase.purchase.products,
  },
} satisfies CreatePurchase;
const listResponse = {
  purchases: [response.purchase],
  pagination: {
    has_previous_page: false,
    has_next_page: false,
    start_cursor: null,
    end_cursor: null,
    per_page: 25,
  },
} satisfies ListPurchases;
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
    run: (kit, options) => kit.purchases.create(purchase, options),
    method: "POST",
    path: "/purchases",
    response,
    body: purchase,
  },
  {
    name: "get",
    run: (kit, options) => kit.purchases.get(123, options),
    method: "GET",
    path: "/purchases/123",
    response,
  },
  {
    name: "list",
    run: (kit, options) => kit.purchases.list(pagination, options),
    method: "GET",
    path: "/purchases",
    response: listResponse,
    query: paginationQuery,
  },
  {
    name: "list without filters",
    run: (kit, options) => kit.purchases.list(undefined, options),
    method: "GET",
    path: "/purchases",
    response: listResponse,
  },
];

describe.each(scenarios)("purchase $name cancellation", (scenario) => {
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
