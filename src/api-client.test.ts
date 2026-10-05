import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClient } from "./api-client";
import { Kit } from "./index";

describe("request query merging", () => {
  beforeEach(() => {
    fetchMock.resetMocks();
    fetchMock.mockResponseOnce("{}");
  });

  it.each(["get", "post", "put", "patch", "delete"] as const)(
    "merges an existing query for %s requests",
    async (method) => {
      const api = new ApiClient({ baseUrl: "https://example.com/v4" });

      await api[method]("/subscribers?status=active", {
        query: new URLSearchParams({ per_page: "10" }),
      });

      expect(fetchMock.requests()[0]!.url).toBe(
        "https://example.com/v4/subscribers?status=active&per_page=10"
      );
    }
  );

  it.each(["/subscribers#results", "/subscribers?status=active#results"])(
    "places query parameters before the fragment in %s",
    async (path) => {
      const api = new ApiClient({ baseUrl: "https://example.com/v4" });

      await api.get(path, { query: new URLSearchParams({ per_page: "10" }) });

      const url = new URL(fetchMock.requests()[0]!.url);
      expect(url.searchParams.get("per_page")).toBe("10");
      expect(url.searchParams.get("status")).toBe(
        path.includes("?") ? "active" : null
      );
      expect(url.hash).toBe("#results");
    }
  );

  it("preserves repeated parameters and encoded values without mutating the query", async () => {
    const api = new ApiClient({ baseUrl: "https://example.com/v4" });
    const query = new URLSearchParams([
      ["tag", "second"],
      ["tag", "third"],
      ["email", "a+b@example.com"],
      ["search", "a & b # c"],
      ["empty", ""],
    ]);
    const originalQuery = query.toString();

    await api.get("/subscribers?tag=first&name=Jane%20Doe", { query });

    const url = new URL(fetchMock.requests()[0]!.url);
    expect(url.searchParams.getAll("tag")).toEqual([
      "first",
      "second",
      "third",
    ]);
    expect(url.searchParams.get("name")).toBe("Jane Doe");
    expect(url.searchParams.get("email")).toBe("a+b@example.com");
    expect(url.searchParams.get("search")).toBe("a & b # c");
    expect(url.searchParams.get("empty")).toBe("");
    expect(query.toString()).toBe(originalQuery);
  });

  it.each([undefined, new URLSearchParams()])(
    "preserves an existing query and fragment with empty options %s",
    async (query) => {
      const api = new ApiClient({ baseUrl: "https://example.com/v4" });

      await api.get("/subscribers?status=active#results", { query });

      expect(fetchMock.requests()[0]!.url).toBe(
        "https://example.com/v4/subscribers?status=active#results"
      );
    }
  );

  it.each([
    ["https://example.com/v4", "subscribers"],
    ["https://example.com/v4/", "/subscribers"],
  ])("keeps the base path when joining %s and %s", async (baseUrl, path) => {
    const api = new ApiClient({ baseUrl });

    await api.get(path, { query: new URLSearchParams({ per_page: "10" }) });

    expect(fetchMock.requests()[0]!.url).toBe(
      "https://example.com/v4/subscribers?per_page=10"
    );
  });
});

describe("request header overrides", () => {
  beforeEach(() => {
    fetchMock.resetMocks();
    fetchMock.mockResponseOnce("{}");
  });

  it.each([
    ["Content-Type", "Accept", "User-Agent", "X-Kit-Api-Key"],
    ["content-type", "accept", "user-agent", "x-kit-api-key"],
    ["CONTENT-TYPE", "ACCEPT", "USER-AGENT", "X-KIT-API-KEY"],
    ["CoNtEnT-TyPe", "AcCePt", "UsEr-AgEnT", "X-KiT-ApI-KeY"],
  ])(
    "replaces default and API key headers with casing %s",
    async (contentType, accept, userAgent, apiKey) => {
      const headers = {
        [contentType]: "text/plain",
        [accept]: "text/plain",
        [userAgent]: "custom-client",
        [apiKey]: "replacement-key",
        "X-Custom": "custom-value",
      };
      const kit = new Kit({ apiKey: "original-key", maxRetries: 0 });

      await kit.post("/test", { headers, body: "hello" });

      const request = fetchMock.requests()[0]!;
      expect(request.headers.get("content-type")).toBe("text/plain");
      expect(request.headers.get("accept")).toBe("text/plain");
      expect(request.headers.get("user-agent")).toBe("custom-client");
      expect(request.headers.get("x-kit-api-key")).toBe("replacement-key");
      expect(request.headers.get("x-custom")).toBe("custom-value");
      expect(await request.text()).toBe("hello");
    }
  );

  it.each(["Authorization", "authorization", "AUTHORIZATION"])(
    "replaces the OAuth header with casing %s",
    async (name) => {
      const kit = new Kit({
        apiKey: "original-token",
        authType: "oauth",
        maxRetries: 0,
      });

      await kit.get("/test", {
        headers: { [name]: "Bearer replacement-token" },
      });

      expect(fetchMock.requests()[0]!.headers.get("authorization")).toBe(
        "Bearer replacement-token"
      );
    }
  );

  it("applies auth headers after defaults regardless of casing", async () => {
    class AuthClient extends ApiClient {
      protected override defaultHeaders() {
        return { ...super.defaultHeaders(), authorization: "default-token" };
      }

      protected override authHeaders() {
        return { Authorization: "Bearer auth-token" };
      }
    }
    const api = new AuthClient({ baseUrl: "http://localhost" });

    await api.get("/test");

    expect(fetchMock.requests()[0]!.headers.get("authorization")).toBe(
      "Bearer auth-token"
    );
    expect(fetchMock.requests()[0]!.headers.get("content-type")).toBe(
      "application/json"
    );
  });
});

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

  it("sends PATCH requests with body, query, and custom headers", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ updated: true }));
    const api = new ApiClient({ baseUrl: "http://localhost" });
    const body = JSON.stringify({ name: "Updated" });
    const result = await api.patch<{ updated: boolean }>("/some/route", {
      body,
      query: new URLSearchParams({ include: "details" }),
      headers: { "X-Custom": "test" },
    });
    expect(result).toEqual({ updated: true });
    expect(fetchMock.requests()).toHaveLength(1);
    const req = fetchMock.requests()[0]!;
    expect(req.method).toBe("PATCH");
    expect(req.url).toBe("http://localhost/some/route?include=details");
    expect(req.headers.get("X-Custom")).toBe("test");
    expect(await req.text()).toBe(body);
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

describe("per-request retry limits", () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  it.each(["get", "post", "put", "patch", "delete"] as const)(
    "honors zero retries for %s without changing the client default",
    async (method) => {
      const api = new ApiClient({
        baseUrl: "http://localhost",
        maxRetries: 3,
        retryDelay: 0,
      });
      fetchMock.mockRejectOnce(new Error("Connection lost"));
      await expect(api[method]("/route", { maxRetries: 0 })).rejects.toThrow(
        "Connection lost"
      );
      expect(fetchMock.requests()).toHaveLength(1);
      expect(api.maxRetries).toBe(3);
    }
  );

  it.each([-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid request retry limit %s before sending",
    async (maxRetries) => {
      const api = new ApiClient({ baseUrl: "http://localhost" });
      await expect(api.get("/route", { maxRetries })).rejects.toThrow(
        RangeError
      );
      expect(fetchMock.requests()).toHaveLength(0);
    }
  );

  it("forwards the override from another resource and falls back for undefined", async () => {
    const kit = new Kit({ apiKey: "test-key", maxRetries: 1, retryDelay: 0 });
    fetchMock.mockRejectOnce(new Error("Connection lost"));
    await expect(
      kit.segments.list(undefined, { maxRetries: 0 })
    ).rejects.toThrow("Connection lost");
    expect(fetchMock.requests()).toHaveLength(1);
    fetchMock.resetMocks();
    fetchMock.mockRejectOnce(new Error("Connection lost"));
    fetchMock.mockResponseOnce(
      JSON.stringify({ segments: [], pagination: {} })
    );
    await kit.segments.list(undefined, { maxRetries: undefined });
    expect(fetchMock.requests()).toHaveLength(2);
  });
});
