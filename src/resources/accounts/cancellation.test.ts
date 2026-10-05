import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Kit, type RequestOptions } from "~/index";

const colors = { colors: ["#123456", "#abcdef"] };
const dates = {
  starting: new Date("2026-01-01T00:30:00+10:30"),
  ending: "2026-02-01",
};
const accountResponse = {
  user: { email: "test@example.com" },
  account: {
    id: 123,
    name: "Test",
    plan_type: "creator",
    primary_email_address: "test@example.com",
    created_at: "2026-01-01T00:00:00Z",
    timezone: {
      name: "America/Denver",
      friendly_name: "Mountain Time",
      utc_offset: "-07:00",
    },
  },
};
const profileResponse = {
  profile: {
    name: "Test",
    byline: "Test byline",
    bio: "Test bio",
    image_url: "https://example.com/image.png",
    profile_url: "https://example.com/profile",
  },
};
const emailResponse = {
  stats: {
    sent: 10,
    clicked: 1,
    opened: 5,
    open_rate: 0.5,
    click_rate: 0.1,
    unsubscribe_rate: 0,
    bounce_rate: 0,
    email_stats_mode: "last_90",
    open_tracking_enabled: true,
    click_tracking_enabled: true,
    starting: "2025-12-31",
    ending: "2026-02-01",
  },
};
const growthResponse = {
  stats: {
    cancellations: 1,
    net_new_subscribers: 4,
    new_subscribers: 5,
    subscribers: 10,
    starting: "2025-12-31",
    ending: "2026-02-01",
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
    name: "getCurrentAccount",
    run: (kit, options) => kit.accounts.getCurrentAccount(options),
    method: "GET",
    path: "/account",
    response: accountResponse,
  },
  {
    name: "getCreatorProfile",
    run: (kit, options) => kit.accounts.getCreatorProfile(options),
    method: "GET",
    path: "/account/creator_profile",
    response: profileResponse,
  },
  {
    name: "listColors",
    run: (kit, options) => kit.accounts.listColors(options),
    method: "GET",
    path: "/account/colors",
    response: colors,
  },
  {
    name: "updateColors",
    run: (kit, options) => kit.accounts.updateColors(colors, options),
    method: "PUT",
    path: "/account/colors",
    response: colors,
    body: colors,
  },
  {
    name: "getEmailStats",
    run: (kit, options) => kit.accounts.getEmailStats(options),
    method: "GET",
    path: "/account/email_stats",
    response: emailResponse,
  },
  {
    name: "getGrowthStats",
    run: (kit, options) => kit.accounts.getGrowthStats(dates, options),
    method: "GET",
    path: "/account/growth_stats",
    response: growthResponse,
    query: { starting: "2025-12-31", ending: "2026-02-01" },
  },
  {
    name: "getGrowthStats without filters",
    run: (kit, options) => kit.accounts.getGrowthStats(undefined, options),
    method: "GET",
    path: "/account/growth_stats",
    response: growthResponse,
  },
];

describe.each(scenarios)("account $name cancellation", (scenario) => {
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
