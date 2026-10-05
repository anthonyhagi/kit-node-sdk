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
  type ListSubscribers,
  type ListSubscribersParams,
  type RequestOptions,
} from "~/index";

const response = {
  subscribers: [],
  pagination: {
    has_previous_page: false,
    has_next_page: false,
    start_cursor: null,
    end_cursor: null,
    per_page: 25,
  },
} satisfies ListSubscribers;

const params = {
  after: "next+/=",
  created_after: new Date("2026-01-01T00:30:00+10:30"),
  created_before: "2026-02-01",
  per_page: 25,
  include_total_count: false,
  slim: true,
  status: "active",
  sort_field: "created_at",
  sort_order: "desc",
} satisfies ListSubscribersParams;

describe("subscriber list cancellation", () => {
  let kit: Kit;

  beforeEach(() => {
    fetchMock.resetMocks();
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    kit = new Kit({ apiKey: "test-key", maxRetries: 2, retryDelay: 1000 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it.each([undefined, params])(
    "forwards cancellation separately from filters %j",
    async (filters) => {
      const controller = new AbortController();
      const options = { signal: controller.signal } satisfies RequestOptions;
      fetchMock.mockResponseOnce(JSON.stringify(response));
      const result = await kit.subscribers.list(filters, options);
      expectTypeOf(result).toEqualTypeOf<ListSubscribers>();
      expect(result).toEqual(response);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0]!;
      const parsedUrl = new URL(String(url));
      expect(parsedUrl.pathname).toBe("/v4/subscribers");
      expect(init?.method).toBe("GET");
      expect(init?.signal).toBe(controller.signal);
      expect(Object.fromEntries(parsedUrl.searchParams)).toEqual(
        filters
          ? {
              after: "next+/=",
              created_after: "2025-12-31",
              created_before: "2026-02-01",
              per_page: "25",
              include_total_count: "false",
              slim: "true",
              status: "active",
              sort_field: "created_at",
              sort_order: "desc",
            }
          : {}
      );
      expect(vi.getTimerCount()).toBe(0);
    }
  );

  it("prevents a request when its signal is already aborted", async () => {
    const controller = new AbortController();
    const reason = new Error("Already cancelled");
    controller.abort(reason);
    await expect(
      kit.subscribers.list(params, { signal: controller.signal })
    ).rejects.toBe(reason);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cancels a pending filtered request without retrying", async () => {
    const controller = new AbortController();
    const reason = new Error("Cancelled list");
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
      kit.subscribers.list(params, { signal: controller.signal })
    ).rejects.toBe(reason);
    controller.abort(reason);
    await result;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["network", "429", "503"])(
    "cancels a retry wait after %s",
    async (failure) => {
      if (failure === "network")
        fetchMock.mockRejectOnce(new TypeError("Network failure"));
      else
        fetchMock.mockResponseOnce("", {
          status: Number(failure),
          headers: { "Retry-After": "60" },
        });
      const controller = new AbortController();
      const reason = new Error("Cancel list retries");
      const result = expect(
        kit.subscribers.list(params, { signal: controller.signal })
      ).rejects.toBe(reason);
      await vi.advanceTimersByTimeAsync(0);
      expect(vi.getTimerCount()).toBe(1);
      controller.abort(reason);
      await result;
      await vi.advanceTimersByTimeAsync(60000);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
    }
  );
});
