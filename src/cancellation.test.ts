import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Kit } from "./index";

const methods = ["get", "post", "put", "patch", "delete"] as const;

describe("API request cancellation", () => {
  beforeEach(() => {
    fetchMock.resetMocks();
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  function client(timeoutMs = 0, retryDelay = 1000) {
    return new Kit({
      apiKey: "test-key",
      timeoutMs,
      retryDelay,
      maxRetries: 2,
    });
  }

  function stalledFetch() {
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
  }

  it.each(methods)(
    "passes the signal through %s and preserves the request",
    async (method) => {
      const controller = new AbortController();
      fetchMock.mockResponseOnce('{"success":true}');
      expect(
        await client()[method]("/test", {
          signal: controller.signal,
          headers: { "X-Test": "header" },
          query: new URLSearchParams({ value: "a+b" }),
        })
      ).toEqual({ success: true });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0]!;
      expect(url).toBe("https://api.kit.com/v4/test?value=a%2Bb");
      expect(init?.method).toBe(method.toUpperCase());
      expect(init?.signal).toBe(controller.signal);
      expect(new Headers(init?.headers).get("X-Test")).toBe("header");
      expect(controller.signal.aborted).toBe(false);
      expect(vi.getTimerCount()).toBe(0);
    }
  );

  it.each(methods)("does not fetch for a pre-aborted %s", async (method) => {
    const controller = new AbortController();
    const reason = new Error("Cancelled before starting");
    controller.abort(reason);
    await expect(
      client(100)[method]("/test", { signal: controller.signal })
    ).rejects.toBe(reason);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  describe.each([0, 100])("with timeoutMs %s", (timeoutMs) => {
    it("cancels a pending fetch without retrying", async () => {
      stalledFetch();
      const controller = new AbortController();
      const remove = vi.spyOn(controller.signal, "removeEventListener");
      const reason = new Error("Caller cancelled");
      const result = expect(
        client(timeoutMs).post("/test", {
          signal: controller.signal,
          body: "payload",
        })
      ).rejects.toBe(reason);
      const requestSignal = fetchMock.mock.calls[0]?.[1]?.signal;
      expect(await fetchMock.requests()[0]!.text()).toBe("payload");
      controller.abort(reason);
      await result;
      expect(requestSignal?.aborted).toBe(true);
      expect(requestSignal?.reason).toBe(reason);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
      if (timeoutMs) expect(remove).toHaveBeenCalled();
    });

    it.each([200, 401])(
      "cancels a stalled %s response body without retrying",
      async (status) => {
        const controller = new AbortController();
        const reason = "body cancelled";
        fetchMock.mockImplementation((_input, init) =>
          Promise.resolve(
            new Response(
              new ReadableStream({
                start(stream) {
                  init?.signal?.addEventListener(
                    "abort",
                    () =>
                      stream.error(new DOMException("Aborted", "AbortError")),
                    { once: true }
                  );
                },
              }),
              { status }
            )
          )
        );
        const result = expect(
          client(timeoutMs).post("/test", { signal: controller.signal })
        ).rejects.toBe(reason);
        await Promise.resolve();
        controller.abort(reason);
        await result;
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(vi.getTimerCount()).toBe(0);
      }
    );
  });

  it.each(["network", "429", "503", "timeout"])(
    "cancels the retry wait after %s",
    async (failure) => {
      if (failure === "network")
        fetchMock.mockRejectOnce(new TypeError("Network failed"));
      else if (failure === "timeout") stalledFetch();
      else
        fetchMock.mockResponseOnce("", {
          status: Number(failure),
          headers: { "Retry-After": "60" },
        });
      const controller = new AbortController();
      const reason = new Error("Cancel retry wait");
      const result = expect(
        client(100).get("/retry", { signal: controller.signal })
      ).rejects.toBe(reason);
      await vi.advanceTimersByTimeAsync(failure === "timeout" ? 100 : 0);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(1);
      controller.abort(reason);
      await result;
      await vi.advanceTimersByTimeAsync(60000);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
    }
  );

  it("cancels a later chunk of a long retry wait", async () => {
    fetchMock.mockRejectOnce(new TypeError("Network failed"));
    const controller = new AbortController();
    const reason = new Error("Cancel long wait");
    const result = expect(
      client(0, 2 ** 31 + 1000).get("/retry", { signal: controller.signal })
    ).rejects.toBe(reason);
    await vi.advanceTimersByTimeAsync(2 ** 31 - 1);
    expect(vi.getTimerCount()).toBe(1);
    controller.abort(reason);
    await result;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("retries attempt timeouts with fresh signals and cleans up listeners", async () => {
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
    fetchMock.mockResponseOnce('{"success":true}');
    const controller = new AbortController();
    const add = vi.spyOn(controller.signal, "addEventListener");
    const remove = vi.spyOn(controller.signal, "removeEventListener");
    const result = client(100).get("/retry", { signal: controller.signal });
    await vi.advanceTimersByTimeAsync(1100);
    expect(await result).toEqual({ success: true });
    const first = fetchMock.mock.calls[0]?.[1]?.signal;
    const second = fetchMock.mock.calls[1]?.[1]?.signal;
    expect(first?.reason).toMatchObject({ name: "TimeoutError" });
    expect(second).not.toBe(first);
    expect(second?.aborted).toBe(false);
    expect(controller.signal.aborted).toBe(false);
    expect(remove.mock.calls).toHaveLength(add.mock.calls.length);
    expect(vi.getTimerCount()).toBe(0);
  });
});
