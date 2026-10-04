import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClient } from "./api-client";
import { Kit } from "./index";

describe("request timeouts", () => {
  beforeEach(() => {
    fetchMock.resetMocks();
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  function stalledFetch() {
    return fetchMock.mockImplementation(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(init.signal?.reason),
            { once: true }
          );
        })
    );
  }

  it.each([undefined, 0])("disables the timeout for %s", async (timeoutMs) => {
    fetchMock.mockResponseOnce(JSON.stringify({ success: true }));
    const kit = new Kit({ apiKey: "test-key", timeoutMs });
    expect(await kit.get("/test")).toEqual({ success: true });
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("aborts a stalled request at the configured deadline", async () => {
    stalledFetch();
    const kit = new Kit({ apiKey: "test-key", timeoutMs: 100, maxRetries: 0 });
    const result = expect(
      kit.accounts.getCurrentAccount()
    ).rejects.toMatchObject({
      name: "TimeoutError",
      message: "Request timed out after 100ms",
    });
    await vi.advanceTimersByTimeAsync(99);
    expect(fetchMock.mock.calls[0]?.[1]?.signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await result;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("retries a timed-out fetch with a fresh signal", async () => {
    stalledFetch();
    fetchMock.mockImplementationOnce(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(init.signal?.reason),
            { once: true }
          );
        })
    );
    fetchMock.mockResponseOnce(JSON.stringify({ success: true }));
    const kit = new Kit({
      apiKey: "test-key",
      timeoutMs: 100,
      maxRetries: 1,
      retryDelay: 10,
    });
    const result = kit.get("/test");
    await vi.advanceTimersByTimeAsync(109);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(await result).toEqual({ success: true });
    const first = fetchMock.mock.calls[0]?.[1]?.signal;
    const second = fetchMock.mock.calls[1]?.[1]?.signal;
    expect(first?.aborted).toBe(true);
    expect(second?.aborted).toBe(false);
    expect(second).not.toBe(first);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("exhausts the configured attempts on repeated timeouts", async () => {
    stalledFetch();
    const kit = new Kit({
      apiKey: "test-key",
      timeoutMs: 100,
      maxRetries: 2,
      retryDelay: 10,
    });
    const result = expect(kit.get("/test")).rejects.toMatchObject({
      name: "TimeoutError",
    });
    await vi.runAllTimersAsync();
    await result;
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([200, 204])(
    "clears the timer after success with status %i",
    async (status) => {
      fetchMock.mockResolvedValueOnce(
        new Response(status === 204 ? null : "{}", { status })
      );
      const kit = new Kit({ apiKey: "test-key", timeoutMs: 100 });
      expect(await kit.get("/test")).toEqual({});
      expect(vi.getTimerCount()).toBe(0);
      await vi.advanceTimersByTimeAsync(100);
      expect(fetchMock.mock.calls[0]?.[1]?.signal?.aborted).toBe(false);
    }
  );

  it("clears the timer after an HTTP error", async () => {
    fetchMock.mockResponseOnce("", { status: 401 });
    const kit = new Kit({ apiKey: "test-key", timeoutMs: 100 });
    await expect(kit.get("/test")).rejects.toThrow("Authentication failed");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears the timer after a network error", async () => {
    fetchMock.mockRejectOnce(new TypeError("Network error"));
    const kit = new Kit({ apiKey: "test-key", timeoutMs: 100, maxRetries: 0 });
    await expect(kit.get("/test")).rejects.toThrow("Network error");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears the timer after invalid JSON without repeating a successful POST", async () => {
    fetchMock.mockResponseOnce("invalid JSON", { status: 201 });
    const kit = new Kit({ apiKey: "test-key", timeoutMs: 100 });
    await expect(kit.post("/test")).rejects.toBeInstanceOf(SyntaxError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("times out a stalled successful response body without repeating a POST", async () => {
    fetchMock.mockImplementation((_input, init) =>
      Promise.resolve(
        new Response(
          new ReadableStream({
            start(controller) {
              init?.signal?.addEventListener(
                "abort",
                () => controller.error(init.signal?.reason),
                { once: true }
              );
            },
          }),
          { status: 201 }
        )
      )
    );
    const kit = new Kit({ apiKey: "test-key", timeoutMs: 100 });
    const result = expect(kit.post("/test")).rejects.toMatchObject({
      name: "TimeoutError",
    });
    await vi.advanceTimersByTimeAsync(100);
    await result;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears the attempt timer before Retry-After backoff", async () => {
    fetchMock
      .mockResponseOnce("", { status: 429, headers: { "Retry-After": "1" } })
      .mockResponseOnce("{}");
    const kit = new Kit({
      apiKey: "test-key",
      timeoutMs: 100,
      maxRetries: 1,
      retryDelay: 0,
    });
    const result = kit.get("/test");
    await vi.advanceTimersByTimeAsync(999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[1]?.signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await result).toEqual({});
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe.each([
  {
    name: "Kit",
    create: (timeoutMs: number) => new Kit({ apiKey: "test-key", timeoutMs }),
  },
  {
    name: "ApiClient",
    create: (timeoutMs: number) =>
      new ApiClient({ baseUrl: "http://localhost", timeoutMs }),
  },
])("$name timeout validation", ({ create }) => {
  it.each([-1, 0.5, NaN, Infinity, -Infinity, 2 ** 31])(
    "rejects invalid timeout %s",
    (timeoutMs) => {
      expect(() => create(timeoutMs)).toThrow(
        "timeoutMs must be an integer between 0 and 2147483647"
      );
    }
  );
});
