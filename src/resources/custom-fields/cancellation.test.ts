import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Kit, type RequestOptions } from "~/index";

const field = { label: "Company" };
const response = {
  custom_field: {
    id: 123,
    label: "Company",
    key: "company",
    name: "ck_field_123_company",
  },
};
const bulk = {
  custom_fields: [field],
  callback_url: "https://example.com/callback",
};
const values = {
  custom_field_values: [
    { subscriber_id: 456, subscriber_custom_field_id: 123, value: "" },
  ],
  callback_url: null,
};
const bulkResponse = {
  custom_fields: [
    { ...response.custom_field, created_at: "2026-01-01T00:00:00Z" },
  ],
  failures: [],
};
const valuesResponse = {
  custom_field_values: values.custom_field_values,
  failures: [],
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
const listResponse = {
  custom_fields: [response.custom_field],
  pagination: {
    has_previous_page: false,
    has_next_page: false,
    start_cursor: null,
    end_cursor: null,
    per_page: 25,
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
    run: (kit, options) => kit.customFields.create(field, options),
    method: "POST",
    path: "/custom_fields",
    response,
    body: field,
  },
  {
    name: "update",
    run: (kit, options) => kit.customFields.update(123, field, options),
    method: "PUT",
    path: "/custom_fields/123",
    response,
    body: field,
  },
  {
    name: "delete",
    run: (kit, options) => kit.customFields.delete(123, options),
    method: "DELETE",
    path: "/custom_fields/123",
    response: {},
  },
  {
    name: "list",
    run: (kit, options) => kit.customFields.list(pagination, options),
    method: "GET",
    path: "/custom_fields",
    response: listResponse,
    query: paginationQuery,
  },
  {
    name: "list without filters",
    run: (kit, options) => kit.customFields.list(undefined, options),
    method: "GET",
    path: "/custom_fields",
    response: listResponse,
  },
  {
    name: "bulkCreate",
    run: (kit, options) => kit.customFields.bulkCreate(bulk, options),
    method: "POST",
    path: "/bulk/custom_fields",
    response: bulkResponse,
    body: bulk,
    result: { type: "synchronous", ...bulkResponse },
  },
  {
    name: "bulkCreate asynchronous",
    run: (kit, options) => kit.customFields.bulkCreate(bulk, options),
    method: "POST",
    path: "/bulk/custom_fields",
    response: {},
    body: bulk,
    result: { type: "asynchronous" },
  },
  {
    name: "bulkUpdateSubscriberValues",
    run: (kit, options) =>
      kit.customFields.bulkUpdateSubscriberValues(values, options),
    method: "POST",
    path: "/bulk/custom_fields/subscribers",
    response: valuesResponse,
    body: values,
    result: { type: "synchronous", ...valuesResponse },
  },
  {
    name: "bulkUpdateSubscriberValues asynchronous",
    run: (kit, options) =>
      kit.customFields.bulkUpdateSubscriberValues(values, options),
    method: "POST",
    path: "/bulk/custom_fields/subscribers",
    response: {},
    body: values,
    result: { type: "asynchronous" },
  },
];

describe.each(scenarios)("custom-field $name cancellation", (scenario) => {
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
