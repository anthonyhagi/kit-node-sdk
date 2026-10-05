import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  Kit,
  type CreateSnippetParams,
  type GetSnippet,
  type RequestOptions,
} from "~/index";

const inline = {
  name: "Greeting",
  snippet_type: "inline",
  content: "Hello!",
} satisfies CreateSnippetParams;
const block = {
  name: "Greeting",
  snippet_type: "block",
  document_attributes: { value_html: "<p>Hello!</p>" },
} satisfies CreateSnippetParams;
const response = {
  snippet: {
    id: 123,
    name: "Greeting",
    snippet_type: "inline",
    archived: false,
    key: "greeting",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    content: "Hello!",
    document: {
      id: 456,
      value: null,
      value_html: "<p>Hello!</p>",
      value_plain: null,
      version: 1,
    },
  },
} satisfies GetSnippet;
const blockResponse = {
  snippet: { ...response.snippet, snippet_type: "block" },
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
  snippets: [response.snippet],
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
    name: "create inline",
    run: (kit, options) => kit.snippets.create(inline, options),
    method: "POST",
    path: "/snippets",
    response,
    body: inline,
  },
  {
    name: "create block",
    run: (kit, options) => kit.snippets.create(block, options),
    method: "POST",
    path: "/snippets",
    response: blockResponse,
    body: block,
  },
  {
    name: "update inline",
    run: (kit, options) =>
      kit.snippets.update(123, { content: "Hello!", archived: false }, options),
    method: "PUT",
    path: "/snippets/123",
    response,
    body: { content: "Hello!", archived: false },
  },
  {
    name: "update block",
    run: (kit, options) =>
      kit.snippets.update(
        123,
        { document_attributes: block.document_attributes },
        options
      ),
    method: "PUT",
    path: "/snippets/123",
    response: blockResponse,
    body: { document_attributes: block.document_attributes },
  },
  {
    name: "get",
    run: (kit, options) => kit.snippets.get(123, options),
    method: "GET",
    path: "/snippets/123",
    response,
  },
  {
    name: "list",
    run: (kit, options) =>
      kit.snippets.list(
        {
          ...pagination,
          archived: false,
          include_content: false,
          snippet_type: "inline",
        },
        options
      ),
    method: "GET",
    path: "/snippets",
    response: listResponse,
    query: {
      ...paginationQuery,
      archived: "false",
      include_content: "false",
      snippet_type: "inline",
    },
  },
  {
    name: "list without filters",
    run: (kit, options) => kit.snippets.list(undefined, options),
    method: "GET",
    path: "/snippets",
    response: listResponse,
  },
  {
    name: "list with nullable filters",
    run: (kit, options) =>
      kit.snippets.list(
        {
          after: null,
          before: null,
          per_page: null,
          archived: null,
          snippet_type: null,
        },
        options
      ),
    method: "GET",
    path: "/snippets",
    response: listResponse,
  },
];

describe.each(scenarios)("snippet $name cancellation", (scenario) => {
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
