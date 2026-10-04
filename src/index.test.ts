import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Kit } from "./index";

describe("Kit retry configuration", () => {
  beforeEach(() => {
    fetchMock.resetMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("uses default retry options when omitted", () => {
    const kit = new Kit({ apiKey: "test-key" });

    expect(kit.maxRetries).toBe(3);
    expect(kit.retryDelay).toBe(1000);
  });

  it("uses default retry options when explicitly undefined", () => {
    const kit = new Kit({
      apiKey: "test-key",
      maxRetries: undefined,
      retryDelay: undefined,
    });

    expect(kit.maxRetries).toBe(3);
    expect(kit.retryDelay).toBe(1000);
  });

  it("preserves positive retry options", () => {
    const kit = new Kit({
      apiKey: "test-key",
      maxRetries: 5,
      retryDelay: 2000,
    });

    expect(kit.maxRetries).toBe(5);
    expect(kit.retryDelay).toBe(2000);
  });

  it("makes only one request when retries are disabled", async () => {
    fetchMock.mockResponse(JSON.stringify({ errors: ["Server error"] }), {
      status: 500,
    });
    const kit = new Kit({ apiKey: "test-key", maxRetries: 0 });
    const result = expect(kit.accounts.getCurrentAccount()).rejects.toThrow(
      "Internal server error. Status: 500"
    );

    await vi.runAllTimersAsync();
    await result;

    expect(fetchMock.requests()).toHaveLength(1);
  });

  it("retries with zero delay when explicitly configured", async () => {
    fetchMock
      .mockResponseOnce("", { status: 500 })
      .mockResponseOnce(JSON.stringify({ account: { name: "Test account" } }));
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    const kit = new Kit({
      apiKey: "test-key",
      maxRetries: 1,
      retryDelay: 0,
    });
    const result = kit.accounts.getCurrentAccount();

    await vi.runAllTimersAsync();

    expect(await result).toEqual({ account: { name: "Test account" } });
    expect(fetchMock.requests()).toHaveLength(2);
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 0);
  });
});
