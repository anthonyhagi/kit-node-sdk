import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClient } from "./api-client";

describe("safe retry backoff", () => {
  beforeEach(() => {
    fetchMock.resetMocks();
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it.each(["network", "http"])(
    "preserves long %s retry delays across timer chunks",
    async (failure) => {
      if (failure === "network") {
        fetchMock.mockRejectOnce(new TypeError("Network failed"));
      } else {
        fetchMock.mockResponseOnce("", { status: 503 });
      }
      fetchMock.mockResponseOnce(JSON.stringify({ success: true }));
      const api = new ApiClient({
        baseUrl: "http://localhost",
        maxRetries: 1,
        retryDelay: 2 ** 31 + 1000,
      });

      const result = api.get("/retry");
      await vi.advanceTimersByTimeAsync(2 ** 31 - 1);
      expect(fetchMock.requests()).toHaveLength(1);
      await vi.advanceTimersByTimeAsync(1000);
      expect(fetchMock.requests()).toHaveLength(1);
      await vi.advanceTimersByTimeAsync(1);
      await expect(result).resolves.toEqual({ success: true });
      expect(fetchMock.requests()).toHaveLength(2);
    }
  );

  it.each([0, 0.5, 1])(
    "schedules finite timer chunks for extreme backoff with random value %s",
    async (random) => {
      vi.mocked(Math.random).mockReturnValue(random);
      const timer = vi.spyOn(globalThis, "setTimeout");
      fetchMock.mockRejectOnce(new TypeError("Network failed"));
      const api = new ApiClient({
        baseUrl: "http://localhost",
        maxRetries: 1,
        retryDelay: Number.MAX_VALUE,
      });

      const result = api.get("/retry");
      expect(result).toBeInstanceOf(Promise);
      await vi.advanceTimersByTimeAsync(0);
      expect(timer).toHaveBeenLastCalledWith(expect.any(Function), 2 ** 31 - 1);
      await vi.advanceTimersByTimeAsync(2 ** 31 - 1);
      expect(fetchMock.requests()).toHaveLength(1);
      expect(timer).toHaveBeenLastCalledWith(expect.any(Function), 2 ** 31 - 1);
    }
  );

  it("keeps zero backoff disabled beyond exponential numeric overflow", async () => {
    for (let attempt = 0; attempt < 1025; attempt++) {
      fetchMock.mockRejectOnce(new TypeError("Network failed"));
    }
    fetchMock.mockResponseOnce(JSON.stringify({ success: true }));
    const timer = vi.spyOn(globalThis, "setTimeout");
    const api = new ApiClient({
      baseUrl: "http://localhost",
      maxRetries: 1025,
      retryDelay: 0,
    });

    const result = api.get("/retry");
    await vi.runAllTimersAsync();
    await expect(result).resolves.toEqual({ success: true });
    expect(fetchMock.requests()).toHaveLength(1026);
    expect(
      timer.mock.calls.every(([, milliseconds]) => milliseconds === 0)
    ).toBe(true);
  });
});

describe("Retry-After", () => {
  beforeEach(() => {
    fetchMock.resetMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    vi.spyOn(Math, "random").mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  async function expectRetryAfter(
    status: number,
    header: string | undefined,
    wait: number,
    retryDelay = 1000
  ) {
    fetchMock
      .mockResponseOnce("", {
        status,
        headers: header === undefined ? {} : { "Retry-After": header },
      })
      .mockResponseOnce(JSON.stringify({ success: true }));
    const api = new ApiClient({
      baseUrl: "http://localhost",
      maxRetries: 1,
      retryDelay,
    });
    const result = api.get("/some/route");
    await vi.advanceTimersByTimeAsync(wait - 1);
    expect(fetchMock.requests()).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    await expect(result).resolves.toEqual({ success: true });
    expect(fetchMock.requests()).toHaveLength(2);
  }

  it.each([429, 503])(
    "waits for delta seconds on status %i",
    async (status) => {
      await expectRetryAfter(status, "5", 5000);
    }
  );

  it.each([
    "Thu, 01 Jan 2026 00:00:05 GMT",
    "Thursday, 01-Jan-26 00:00:05 GMT",
    "Thu Jan  1 00:00:05 2026",
  ])("waits until HTTP date %s", async (header) => {
    await expectRetryAfter(429, header, 5000);
  });

  it("accepts whitespace around seconds", async () => {
    await expectRetryAfter(429, " 5 ", 5000);
  });

  it.each([429, 500, 503])(
    "cancels the discarded %i response before waiting to retry",
    async (status) => {
      const cancel = vi.fn();
      const body = new ReadableStream({ cancel });
      const response = new Response(body, {
        status,
        headers: { "Retry-After": "2" },
      });
      fetchMock
        .mockResolvedValueOnce(response)
        .mockResponseOnce(JSON.stringify({ success: true }));
      const api = new ApiClient({
        baseUrl: "http://localhost",
        maxRetries: 1,
        retryDelay: 0,
        timeoutMs: 100,
      });

      const result = api.get("/some/route");
      await vi.advanceTimersByTimeAsync(0);
      expect(cancel).toHaveBeenCalledOnce();
      expect(fetchMock.requests()).toHaveLength(1);
      await vi.advanceTimersByTimeAsync(1999);
      expect(fetchMock.requests()).toHaveLength(1);
      await vi.advanceTimersByTimeAsync(1);
      await expect(result).resolves.toEqual({ success: true });
      expect(fetchMock.requests()).toHaveLength(2);
      expect(vi.getTimerCount()).toBe(0);
    }
  );

  it("continues retrying when cancellation of the discarded body fails", async () => {
    const cancel = vi
      .fn()
      .mockRejectedValue(new Error("Stream cleanup failed"));
    fetchMock
      .mockResolvedValueOnce(
        new Response(new ReadableStream({ cancel }), { status: 503 })
      )
      .mockResponseOnce(JSON.stringify({ success: true }));
    const api = new ApiClient({
      baseUrl: "http://localhost",
      maxRetries: 1,
      retryDelay: 0,
    });

    const result = api.get("/some/route");
    await vi.runAllTimersAsync();
    await expect(result).resolves.toEqual({ success: true });
    expect(cancel).toHaveBeenCalledOnce();
    expect(fetchMock.requests()).toHaveLength(2);
  });

  it("retries responses with no body", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResponseOnce(JSON.stringify({ success: true }));
    const api = new ApiClient({
      baseUrl: "http://localhost",
      maxRetries: 1,
      retryDelay: 0,
    });

    const result = api.get("/some/route");
    await vi.runAllTimersAsync();
    await expect(result).resolves.toEqual({ success: true });
    expect(fetchMock.requests()).toHaveLength(2);
  });

  it("honors the server delay even when configured backoff is zero", async () => {
    await expectRetryAfter(429, "2", 2000, 0);
  });

  it.each([
    undefined,
    "",
    "not a date",
    "Thu, not a date",
    "-1",
    "1.5",
    "1e3",
    "Infinity",
    "999999999999999999999999999999999999",
    "Thu, 01 Jan 2026 00:00:00 GMT",
    "Wed, 31 Dec 2025 23:59:59 GMT",
    "0",
  ])(
    "preserves backoff for missing, invalid, or expired value %j",
    async (header) => {
      await expectRetryAfter(429, header, 1000);
    }
  );

  it("does not shorten a longer configured backoff", async () => {
    await expectRetryAfter(503, "1", 2000, 2000);
  });

  it("honors delays beyond the Node timer limit without overflowing", async () => {
    await expectRetryAfter(429, "2147484", 2147484000);
  });

  it.each([0, 1])("respects a retry limit of %i", async (maxRetries) => {
    fetchMock.mockResponse(JSON.stringify({ errors: ["Rate limited"] }), {
      status: 429,
      headers: { "Retry-After": "2" },
    });
    const api = new ApiClient({ baseUrl: "http://localhost", maxRetries });
    const result = expect(api.get("/some/route")).rejects.toThrow(
      "Rate limit exceeded"
    );
    await vi.runAllTimersAsync();
    await result;
    expect(fetchMock.requests()).toHaveLength(maxRetries + 1);
    expect(Date.now()).toBe(
      new Date("2026-01-01T00:00:00Z").getTime() + maxRetries * 2000
    );
  });

  it("does not retry a non-retryable response with the header", async () => {
    fetchMock.mockResponseOnce("", {
      status: 401,
      headers: { "Retry-After": "5" },
    });
    const api = new ApiClient({ baseUrl: "http://localhost" });
    await expect(api.get("/some/route")).rejects.toThrow(
      "Authentication failed"
    );
    expect(fetchMock.requests()).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("api-client", () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initialises correctly", () => {
    const api = new ApiClient({ baseUrl: "" });

    expect(api).toBeDefined();
    expect(api).toBeInstanceOf(ApiClient);
  });

  it("sets the baseUrl parameter correctly", () => {
    const api = new ApiClient({ baseUrl: "http://localhost" });

    expect(api.baseUrl).toBe("http://localhost");
  });

  it("correctly sends a GET request using the base url and path", async ({
    expect,
  }) => {
    fetchMock.mockResponseOnce(JSON.stringify({}));

    const api = new ApiClient({ baseUrl: "http://localhost" });

    await api.get("/some/route");

    expect(fetchMock.requests().length).toBe(1);
    expect(fetchMock.requests()[0]?.url).toBe("http://localhost/some/route");
    expect(fetchMock.requests()[0]?.method).toBe("GET");
  });

  it("correctly sends a POST request using the base url and path", async ({
    expect,
  }) => {
    fetchMock.mockResponseOnce(JSON.stringify({}));

    const api = new ApiClient({ baseUrl: "http://localhost" });

    await api.post("/some/route");

    expect(fetchMock.requests().length).toBe(1);
    expect(fetchMock.requests()[0]?.url).toBe("http://localhost/some/route");
    expect(fetchMock.requests()[0]?.method).toBe("POST");
  });

  it("correctly sends a PUT request using the base url and path", async ({
    expect,
  }) => {
    fetchMock.mockResponseOnce(JSON.stringify({}));

    const api = new ApiClient({ baseUrl: "http://localhost" });

    await api.put("/some/route");

    expect(fetchMock.requests().length).toBe(1);
    expect(fetchMock.requests()[0]?.url).toBe("http://localhost/some/route");
    expect(fetchMock.requests()[0]?.method).toBe("PUT");
  });

  it("correctly sends a DELETE request using the base url and path", async ({
    expect,
  }) => {
    fetchMock.mockResponseOnce(JSON.stringify({}));

    const api = new ApiClient({ baseUrl: "http://localhost" });

    await api.delete("/some/route");

    expect(fetchMock.requests().length).toBe(1);
    expect(fetchMock.requests()[0]?.url).toBe("http://localhost/some/route");
    expect(fetchMock.requests()[0]?.method).toBe("DELETE");
  });

  it("returns `null` for a 404 response", async () => {
    fetchMock.mockResponseOnce({ status: 404 });

    const api = new ApiClient({ baseUrl: "http://localhost" });

    const resp = await api.get("/some/route");

    expect(fetchMock.requests().length).toBe(1);
    expect(resp).toBe(null);
  });

  describe("successful response bodies", () => {
    it.each([200, 201, 202, 204, 205])(
      "returns an empty object for an empty %i response without repeating a POST",
      async (status) => {
        fetchMock.mockResolvedValue(new Response(null, { status }));
        const api = new ApiClient({
          baseUrl: "http://localhost",
          retryDelay: 0,
        });

        await expect(api.post("/some/route")).resolves.toEqual({});
        expect(fetchMock.requests()).toHaveLength(1);
      }
    );

    it("throws for invalid JSON without repeating a successful POST", async () => {
      fetchMock.mockResponse("not json", { status: 201 });
      const api = new ApiClient({
        baseUrl: "http://localhost",
        retryDelay: 0,
      });

      await expect(api.post("/some/route")).rejects.toBeInstanceOf(SyntaxError);
      expect(fetchMock.requests()).toHaveLength(1);
    });

    it("does not repeat a POST when reading its successful response fails", async () => {
      const response = new Response("{}", { status: 201 });
      const error = new TypeError("Response body stream failed");
      vi.spyOn(response, "json").mockRejectedValue(error);
      vi.spyOn(response, "text").mockRejectedValue(error);
      fetchMock.mockResolvedValue(response);
      const api = new ApiClient({
        baseUrl: "http://localhost",
        retryDelay: 0,
      });

      await expect(api.post("/some/route")).rejects.toBe(error);
      expect(fetchMock.requests()).toHaveLength(1);
    });

    it.each([null, false, 0, "", [], { success: true }])(
      "preserves the JSON value %j",
      async (value) => {
        fetchMock.mockResponseOnce(JSON.stringify(value));
        const api = new ApiClient({ baseUrl: "http://localhost" });

        await expect(api.post("/some/route")).resolves.toEqual(value);
        expect(fetchMock.requests()).toHaveLength(1);
      }
    );
  });

  describe("retry logic", () => {
    it("retries on 500 server errors and succeeds on retry", async () => {
      fetchMock
        .mockResponseOnce("", { status: 500 })
        .mockResponseOnce(JSON.stringify({ success: true }));

      const api = new ApiClient({
        baseUrl: "http://localhost",
        maxRetries: 2,
        retryDelay: 10,
      });

      const resp = await api.get("/some/route");

      expect(fetchMock.requests().length).toBe(2);
      expect(resp).toEqual({ success: true });
    });

    it("retries on 429 rate limit errors and succeeds on retry", async () => {
      fetchMock
        .mockResponseOnce("", { status: 429 })
        .mockResponseOnce(JSON.stringify({ success: true }));

      const api = new ApiClient({
        baseUrl: "http://localhost",
        maxRetries: 2,
        retryDelay: 10,
      });

      const resp = await api.get("/some/route");

      expect(fetchMock.requests().length).toBe(2);
      expect(resp).toEqual({ success: true });
    });

    it("exhausts all retries and throws error for 500", async () => {
      fetchMock
        .mockResponseOnce(JSON.stringify({ error: "Server Error" }), {
          status: 500,
        })
        .mockResponseOnce(JSON.stringify({ error: "Server Error" }), {
          status: 500,
        })
        .mockResponseOnce(JSON.stringify({ error: "Server Error" }), {
          status: 500,
        })
        .mockResponseOnce(JSON.stringify({ error: "Server Error" }), {
          status: 500,
        });

      const api = new ApiClient({
        baseUrl: "http://localhost",
        maxRetries: 3,
        retryDelay: 10,
      });

      await expect(api.get("/some/route")).rejects.toThrow(
        "Internal server error. Status: 500"
      );

      expect(fetchMock.requests().length).toBe(4);
    });

    it("exhausts all retries and throws error for 429", async () => {
      fetchMock
        .mockResponseOnce(JSON.stringify({ error: "Rate Limited" }), {
          status: 429,
        })
        .mockResponseOnce(JSON.stringify({ error: "Rate Limited" }), {
          status: 429,
        })
        .mockResponseOnce(JSON.stringify({ error: "Rate Limited" }), {
          status: 429,
        });

      const api = new ApiClient({
        baseUrl: "http://localhost",
        maxRetries: 2,
        retryDelay: 10,
      });

      await expect(api.get("/some/route")).rejects.toThrow(
        "Rate limit exceeded. Status: 429"
      );

      expect(fetchMock.requests().length).toBe(3);
    });

    it("does not retry on 400 bad request", async () => {
      fetchMock.mockResponseOnce("", { status: 400 });

      const api = new ApiClient({
        baseUrl: "http://localhost",
        maxRetries: 3,
        retryDelay: 10,
      });

      await expect(api.get("/some/route")).rejects.toThrow(
        "Unknown error. Status: 400"
      );

      expect(fetchMock.requests().length).toBe(1);
    });

    it("does not retry on 401 unauthorized", async () => {
      fetchMock.mockResponseOnce("", { status: 401 });

      const api = new ApiClient({
        baseUrl: "http://localhost",
        maxRetries: 3,
        retryDelay: 10,
      });

      await expect(api.get("/some/route")).rejects.toThrow(
        "Authentication failed"
      );

      expect(fetchMock.requests().length).toBe(1);
    });

    it("does not retry on 422 unprocessable entity", async () => {
      fetchMock.mockResponseOnce("", { status: 422 });

      const api = new ApiClient({
        baseUrl: "http://localhost",
        maxRetries: 3,
        retryDelay: 10,
      });

      await expect(api.get("/some/route")).rejects.toThrow(
        "Bad data in request. Status: 422"
      );

      expect(fetchMock.requests().length).toBe(1);
    });

    it("retries on network errors and succeeds", async () => {
      fetchMock
        .mockRejectOnce(new Error("Network error"))
        .mockResponseOnce(JSON.stringify({ success: true }));

      const api = new ApiClient({
        baseUrl: "http://localhost",
        maxRetries: 2,
        retryDelay: 10,
      });

      const resp = await api.get("/some/route");

      expect(fetchMock.requests().length).toBe(2);
      expect(resp).toEqual({ success: true });
    });

    it("exhausts all retries on network errors and throws", async () => {
      fetchMock.mockReject(new Error("Network error"));

      const api = new ApiClient({
        baseUrl: "http://localhost",
        maxRetries: 2,
        retryDelay: 10,
      });

      await expect(api.get("/some/route")).rejects.toThrow("Network error");

      expect(fetchMock.requests().length).toBe(3);
    });

    it("uses exponential backoff for retry delays", async () => {
      const startTime = Date.now();

      fetchMock
        .mockResponseOnce(JSON.stringify({ error: "Server Error" }), {
          status: 500,
        })
        .mockResponseOnce(JSON.stringify({ error: "Server Error" }), {
          status: 500,
        })
        .mockResponseOnce(JSON.stringify({ error: "Server Error" }), {
          status: 500,
        });

      const api = new ApiClient({
        baseUrl: "http://localhost",
        maxRetries: 2,
        retryDelay: 100,
      });

      await expect(api.get("/some/route")).rejects.toThrow();

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should have waited approximately: 100ms + 200ms = 300ms (plus jitter)
      // Allow for some variance due to jitter and execution time
      expect(totalTime).toBeGreaterThan(200); // At least some delay occurred
      expect(totalTime).toBeLessThan(800); // But not too much
    });

    it("works with different HTTP methods", async () => {
      fetchMock
        .mockResponseOnce("", { status: 500 })
        .mockResponseOnce(JSON.stringify({ created: true }));

      const api = new ApiClient({
        baseUrl: "http://localhost",
        maxRetries: 1,
        retryDelay: 10,
      });

      const resp = await api.post("/some/route", {
        body: JSON.stringify({ data: "test" }),
      });

      expect(fetchMock.requests().length).toBe(2);
      expect(resp).toEqual({ created: true });
    });

    it("respects custom maxRetries setting", async () => {
      fetchMock
        .mockResponseOnce(JSON.stringify({ error: "Server Error" }), {
          status: 500,
        })
        .mockResponseOnce(JSON.stringify({ error: "Server Error" }), {
          status: 500,
        })
        .mockResponseOnce(JSON.stringify({ error: "Server Error" }), {
          status: 500,
        })
        .mockResponseOnce(JSON.stringify({ error: "Server Error" }), {
          status: 500,
        })
        .mockResponseOnce(JSON.stringify({ error: "Server Error" }), {
          status: 500,
        })
        .mockResponseOnce(JSON.stringify({ error: "Server Error" }), {
          status: 500,
        });

      const api = new ApiClient({
        baseUrl: "http://localhost",
        maxRetries: 5,
        retryDelay: 10,
      });

      await expect(api.get("/some/route")).rejects.toThrow();

      expect(fetchMock.requests().length).toBe(6);
    });

    it("works with zero retries", async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ error: "Server Error" }), {
        status: 500,
      });

      const api = new ApiClient({
        baseUrl: "http://localhost",
        maxRetries: 0,
        retryDelay: 10,
      });

      await expect(api.get("/some/route")).rejects.toThrow();

      expect(fetchMock.requests().length).toBe(1);
    });
  });
});
