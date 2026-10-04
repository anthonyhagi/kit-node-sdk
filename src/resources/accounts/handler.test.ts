import { beforeEach, describe, expect, expectTypeOf, it } from "vitest";
import { Kit, type GetEmailStats } from "~/index";

const response = {
  stats: {
    cancellations: 2,
    net_new_subscribers: 8,
    new_subscribers: 10,
    subscribers: 100,
    starting: "2026-01-01T00:00:00-05:00",
    ending: "2026-02-01T23:59:59-05:00",
  },
};

describe("growth stats requests through Kit", () => {
  let kit: Kit;

  beforeEach(() => {
    fetchMock.resetMocks();
    kit = new Kit({ apiKey: "test-key", maxRetries: 0 });
    fetchMock.mockResponseOnce(JSON.stringify(response));
  });

  it("preserves default requests and the account-timezone response", async () => {
    expect(await kit.accounts.getGrowthStats()).toEqual(response);
    const requests = fetchMock.requests();
    expect(requests).toHaveLength(1);
    expect(requests[0]!.url).toBe(
      "https://api.kit.com/v4/account/growth_stats"
    );
    expect(requests[0]!.method).toBe("GET");
    expect(await requests[0]!.text()).toBe("");
  });

  it.each([
    {
      name: "Date inputs with non-midnight times",
      starting: new Date("2026-01-01T12:34:56Z"),
      ending: new Date("2026-02-01T23:59:59Z"),
    },
    {
      name: "date-only strings",
      starting: "2026-01-01",
      ending: "2026-02-01",
    },
    {
      name: "mixed strings and Dates",
      starting: "2026-01-01",
      ending: new Date("2026-02-01T12:00:00Z"),
    },
    {
      name: "Dates whose offsets cross a UTC date boundary",
      starting: new Date("2026-01-02T00:30:00+10:30"),
      ending: new Date("2026-01-31T23:30:00-05:00"),
    },
  ])("sends YYYY-MM-DD for $name", async ({ starting, ending }) => {
    expect(await kit.accounts.getGrowthStats({ starting, ending })).toEqual(
      response
    );
    const requests = fetchMock.requests();
    expect(requests).toHaveLength(1);
    const url = new URL(requests[0]!.url);
    expect(url.pathname).toBe("/v4/account/growth_stats");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      starting: "2026-01-01",
      ending: "2026-02-01",
    });
  });

  it.each(["starting", "ending"] as const)(
    "omits the other bound when only %s is supplied",
    async (bound) => {
      await kit.accounts.getGrowthStats({
        [bound]: new Date("2026-01-01T12:00:00Z"),
      });
      const url = new URL(fetchMock.requests()[0]!.url);
      expect(Object.fromEntries(url.searchParams)).toEqual({
        [bound]: "2026-01-01",
      });
    }
  );
});

function request(method: string, path: string, query = {}) {
  const requests = fetchMock.requests();
  expect(requests).toHaveLength(1);
  const req = requests[0]!;
  const url = new URL(req.url);
  expect(req.method).toBe(method);
  expect(url.origin).toBe("https://api.kit.com");
  expect(url.pathname).toBe(`/v4${path}`);
  expect(Object.fromEntries(url.searchParams)).toEqual(query);
  return req;
}

describe("account requests through Kit", () => {
  let kit: Kit;
  beforeEach(() => {
    fetchMock.resetMocks();
    kit = new Kit({ apiKey: "test-key", maxRetries: 0 });
  });

  it("gets the current account and preserves user and timezone data", async () => {
    const response = {
      user: { email: "ada@example.com" },
      account: {
        id: 7,
        name: "Ada's newsletter",
        plan_type: "creator",
        primary_email_address: "ada@example.com",
        created_at: "2026-01-01T00:00:00Z",
        timezone: {
          name: "Australia/Adelaide",
          friendly_name: "Adelaide",
          utc_offset: "+10:30",
        },
      },
    };
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.accounts.getCurrentAccount()).toEqual(response);
    const req = request("GET", "/account");
    expect(req.headers.get("X-Kit-Api-Key")).toBe("test-key");
    expect(await req.text()).toBe("");
  });

  it("lists the account colors", async () => {
    const response = { colors: ["#000000", "#ffffff"] };
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.accounts.listColors()).toEqual(response);
    expect(await request("GET", "/account/colors").text()).toBe("");
  });

  it("gets the creator profile", async () => {
    const response = {
      profile: {
        name: "Ada",
        byline: "Creator",
        bio: "Writing about TypeScript",
        image_url: "https://example.com/ada.png",
        profile_url: "https://example.com/ada",
      },
    };
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.accounts.getCreatorProfile()).toEqual(response);
    expect(await request("GET", "/account/creator_profile").text()).toBe("");
  });

  it("returns null when the creator profile does not exist", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ errors: ["Not found"] }), {
      status: 404,
    });
    expect(await kit.accounts.getCreatorProfile()).toBeNull();
    request("GET", "/account/creator_profile");
  });

  it("gets email stats and preserves disabled tracking flags", async () => {
    const response = {
      stats: {
        sent: 100,
        clicked: 0,
        opened: 0,
        open_rate: 0,
        click_rate: 0,
        unsubscribe_rate: 0,
        bounce_rate: 0,
        email_stats_mode: "last_90",
        open_tracking_enabled: false,
        click_tracking_enabled: false,
        starting: "2026-01-01",
        ending: "2026-04-01",
      },
    } satisfies GetEmailStats;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.accounts.getEmailStats()).toEqual(response);
    expect(await request("GET", "/account/email_stats").text()).toBe("");
  });

  it("exposes numeric engagement, unsubscribe, and bounce rates", async () => {
    // https://developers.kit.com/api-reference/accounts/get-email-stats
    const response = {
      stats: {
        sent: 6,
        clicked: 3,
        opened: 6,
        open_rate: 100,
        click_rate: 50,
        unsubscribe_rate: 16.67,
        bounce_rate: 16.67,
        email_stats_mode: "last_90",
        open_tracking_enabled: true,
        click_tracking_enabled: true,
        starting: "2022-11-19T11:43:55Z",
        ending: "2023-02-17T11:43:55Z",
      },
    } satisfies GetEmailStats;
    fetchMock.mockResponseOnce(JSON.stringify(response));

    const result = await kit.accounts.getEmailStats();
    expectTypeOf(result).toEqualTypeOf<GetEmailStats>();
    expectTypeOf(result.stats.open_rate).toEqualTypeOf<number>();
    expectTypeOf(result.stats.click_rate).toEqualTypeOf<number>();
    expectTypeOf(result.stats.unsubscribe_rate).toEqualTypeOf<number>();
    expectTypeOf(result.stats.bounce_rate).toEqualTypeOf<number>();
    expect(result).toEqual(response);
    expect(await request("GET", "/account/email_stats").text()).toBe("");
  });

  it.each([1, 5, 10])(
    "updates the palette with %i colors using PUT",
    async (count) => {
      const colors = Array.from(
        { length: count },
        (_, i) => `#${i.toString(16).padStart(6, "0")}`
      );
      fetchMock.mockResponseOnce(JSON.stringify({ colors }));
      expect(await kit.accounts.updateColors({ colors })).toEqual({ colors });
      const req = request("PUT", "/account/colors");
      expect(req.headers.get("Content-Type")).toBe("application/json");
      expect(await req.json()).toEqual({ colors });
    }
  );

  it("rejects an empty palette before sending a request", async () => {
    await expect(kit.accounts.updateColors({ colors: [] })).rejects.toThrow(
      "Cannot update colors to an empty list"
    );
    expect(fetchMock.requests()).toHaveLength(0);
  });

  it("rejects more than ten colors before sending a request", async () => {
    await expect(
      kit.accounts.updateColors({
        colors: Array.from({ length: 11 }, () => "#000000"),
      })
    ).rejects.toThrow(
      "Cannot update colors with more than 10 colors specified"
    );
    expect(fetchMock.requests()).toHaveLength(0);
  });

  it("surfaces API validation errors for an invalid color", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({ errors: ["Invalid hex color"] }),
      { status: 422 }
    );
    await expect(
      kit.accounts.updateColors({ colors: ["invalid"] })
    ).rejects.toThrow("Invalid hex color");
    expect(await request("PUT", "/account/colors").json()).toEqual({
      colors: ["invalid"],
    });
  });
});
