import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { ApiError, Kit } from "./index";

describe("public API errors", () => {
  let kit: Kit;
  beforeEach(() => {
    fetchMock.resetMocks();
    kit = new Kit({ apiKey: "test-key", maxRetries: 0 });
  });

  async function getError(): Promise<ApiError> {
    try {
      await kit.accounts.getCurrentAccount();
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      if (error instanceof ApiError) return error;
      throw error;
    }
    throw new Error("Expected an API failure");
  }

  it.each([
    { status: 400, prefix: "Unknown error", label: "Details: " },
    {
      status: 401,
      prefix: "Authentication failed: Invalid or expired access token",
      label: "",
    },
    { status: 403, prefix: "Unknown error", label: "Details: " },
    { status: 409, prefix: "Unknown error", label: "Details: " },
    { status: 422, prefix: "Bad data in request", label: "" },
    { status: 429, prefix: "Rate limit exceeded", label: "" },
    { status: 500, prefix: "Internal server error", label: "Details: " },
    { status: 503, prefix: "Unknown error", label: "Details: " },
  ])(
    "exposes status $status and JSON details while preserving the message",
    async ({ status, prefix, label }) => {
      const details = {
        errors: ["First error", "Second error"],
        extra: { code: "invalid" },
      };
      fetchMock.mockResponseOnce(JSON.stringify(details), { status });
      const error = await getError();
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("ApiError");
      expect(error.status).toBe(status);
      expect(error.details).toEqual(details);
      expectTypeOf(error.details).toEqualTypeOf<unknown>();
      const formatted =
        status < 500
          ? "Errors: First error, Second error"
          : JSON.stringify(details);
      expect(error.message).toBe(
        `${prefix}. Status: ${status} - ${label}${formatted}`
      );
      expect(fetchMock.requests()).toHaveLength(1);
    }
  );

  it.each([null, false, 0, "error", ["error"]])(
    "preserves JSON details %j",
    async (details) => {
      fetchMock.mockResponseOnce(JSON.stringify(details), { status: 422 });
      const error = await getError();
      expect(error.details).toEqual(details);
      expect(error.message).toBe(
        `Bad data in request. Status: 422 - ${JSON.stringify(details)}`
      );
    }
  );

  it.each(["<html>Unavailable</html>", ""])(
    "preserves non-JSON details %j",
    async (details) => {
      fetchMock.mockResponseOnce(details, { status: 503 });
      const error = await getError();
      expect(error.status).toBe(503);
      expect(error.details).toBe(details);
      expect(error.message).toBe(
        `Unknown error. Status: 503 - Details: ${details}`
      );
    }
  );

  it.each([429, 503])(
    "exposes the final status %i response after retries",
    async (status) => {
      kit = new Kit({ apiKey: "test-key", maxRetries: 1, retryDelay: 0 });
      fetchMock
        .mockResponseOnce(JSON.stringify({ errors: ["First failure"] }), {
          status,
        })
        .mockResponseOnce(JSON.stringify({ errors: ["Final failure"] }), {
          status,
        });
      const error = await getError();
      expect(error.status).toBe(status);
      expect(error.details).toEqual({ errors: ["Final failure"] });
      expect(fetchMock.requests()).toHaveLength(2);
    }
  );

  it.each([
    { body: '{ "errors": ["Invalid"] }', details: { errors: ["Invalid"] } },
    { body: "<html>Invalid</html>", details: "<html>Invalid</html>" },
    { body: "", details: "" },
  ])(
    "reads error body $body once without cloning it",
    async ({ body, details }) => {
      const response = new Response(body, { status: 422 });
      const clone = vi.spyOn(response, "clone");
      const text = vi.spyOn(response, "text");
      fetchMock.mockResolvedValueOnce(response);

      const error = await getError();
      expect(error.details).toEqual(details);
      expect(error.message).toBe(
        `Bad data in request. Status: 422 - ${body.startsWith("{") ? "Errors: Invalid" : body}`
      );
      expect(clone).not.toHaveBeenCalled();
      expect(text).toHaveBeenCalledOnce();
      expect(response.bodyUsed).toBe(true);
    }
  );

  it("preserves error response stream failures without cloning or retrying", async () => {
    const failure = new TypeError("Error response stream failed");
    const response = new Response(
      new ReadableStream({
        start(controller) {
          controller.error(failure);
        },
      }),
      { status: 422 }
    );
    const clone = vi.spyOn(response, "clone");
    const text = vi.spyOn(response, "text");
    fetchMock.mockResolvedValueOnce(response);
    kit = new Kit({ apiKey: "test-key", maxRetries: 2, retryDelay: 0 });

    await expect(kit.accounts.getCurrentAccount()).rejects.toBe(failure);
    expect(clone).not.toHaveBeenCalled();
    expect(text).toHaveBeenCalledOnce();
    expect(fetchMock.requests()).toHaveLength(1);
  });

  it("continues returning null for 404 responses", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ errors: ["Not found"] }), {
      status: 404,
    });
    expect(await kit.accounts.getCurrentAccount()).toBeNull();
  });

  it("preserves network errors without wrapping them as ApiError", async () => {
    const error = new TypeError("Network failure");
    fetchMock.mockRejectOnce(error);
    await expect(kit.accounts.getCurrentAccount()).rejects.toBe(error);
  });

  it("preserves successful response parse errors", async () => {
    fetchMock.mockResponseOnce("invalid JSON");
    await expect(kit.accounts.getCurrentAccount()).rejects.toBeInstanceOf(
      SyntaxError
    );
    expect(fetchMock.requests()).toHaveLength(1);
  });
});
