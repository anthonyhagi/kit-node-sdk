import { beforeEach, describe, expect, it } from "vitest";
import { Kit } from "~/index";

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
