import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Kit, type GetPost, type RequestOptions } from "~/index";

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
const page = {
  has_previous_page: false,
  has_next_page: false,
  start_cursor: null,
  end_cursor: null,
  per_page: 25,
};
const postResponse = {
  post: {
    id: 123,
    publication_id: 456,
    created_at: "2026-01-01T00:00:00Z",
    title: "Test post",
    slug: "test-post",
    description: null,
    meta_description: null,
    status: "published",
    published_at: "2026-01-01T00:00:00Z",
    sent_at: null,
    thumbnail_alt: null,
    thumbnail_url: null,
    is_paid: false,
    public_url: "https://example.com/post",
    content: "<p>Hello</p>",
  },
} satisfies GetPost;
const postsResponse = { posts: [postResponse.post], pagination: page };
const segmentsResponse = {
  segments: [{ id: 123, name: "Test", created_at: "2026-01-01T00:00:00Z" }],
  pagination: page,
};
const templatesResponse = {
  email_templates: [
    { id: 123, name: "Test", is_default: false, category: "starting_point" },
  ],
  pagination: page,
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
    name: "posts.get",
    run: (kit, options) => kit.posts.get(123, options),
    method: "GET",
    path: "/posts/123",
    response: postResponse,
  },
  {
    name: "posts.list",
    run: (kit, options) =>
      kit.posts.list({ ...pagination, include_content: false }, options),
    method: "GET",
    path: "/posts",
    response: postsResponse,
    query: { ...paginationQuery, include_content: "false" },
  },
  {
    name: "posts.list without filters",
    run: (kit, options) => kit.posts.list(undefined, options),
    method: "GET",
    path: "/posts",
    response: postsResponse,
  },
  {
    name: "segments.list",
    run: (kit, options) => kit.segments.list(pagination, options),
    method: "GET",
    path: "/segments",
    response: segmentsResponse,
    query: paginationQuery,
  },
  {
    name: "segments.list without filters",
    run: (kit, options) => kit.segments.list(undefined, options),
    method: "GET",
    path: "/segments",
    response: segmentsResponse,
  },
  {
    name: "emailTemplates.list",
    run: (kit, options) => kit.emailTemplates.list(pagination, options),
    method: "GET",
    path: "/email_templates",
    response: templatesResponse,
    query: paginationQuery,
  },
  {
    name: "emailTemplates.list without filters",
    run: (kit, options) => kit.emailTemplates.list(undefined, options),
    method: "GET",
    path: "/email_templates",
    response: templatesResponse,
  },
];

describe.each(scenarios)("resource $name cancellation", (scenario) => {
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
