import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClient } from "./api-client";

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
