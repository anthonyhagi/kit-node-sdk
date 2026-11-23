import { beforeEach, describe, expect, it } from "vitest";
import {
  ApiError,
  Kit,
  type FilterSubscriberBody,
  type FilterSubscriberBodyAllState,
} from "~/index";

// Fixed dates: these tests cover what the SDK sends and how it surfaces Kit's
// 400, not Kit's moving three-year boundary.
const earliest = "2023-11-23";
const active: FilterSubscriberBodyAllState = {
  type: "subscriber_state",
  states: ["active"],
};
const response = {
  subscribers: [],
  pagination: {
    has_previous_page: false,
    has_next_page: false,
    start_cursor: null,
    end_cursor: null,
    per_page: 50,
  },
};
const rejection = {
  errors: [`Date must be on or after ${earliest} (the last 3 years)`],
};

describe("subscriber filter date limits through Kit", () => {
  let kit: Kit;
  beforeEach(() => {
    fetchMock.resetMocks();
    kit = new Kit({ apiKey: "test-key", maxRetries: 3, retryDelay: 0 });
  });

  async function sentBody(): Promise<unknown> {
    return await fetchMock.requests()[0]!.json();
  }

  it.each(["opens", "clicks", "sent", "delivered"] as const)(
    "sends %s boundary dates unchanged without clamping",
    async (type) => {
      fetchMock.mockResponseOnce(JSON.stringify(response));
      const body = {
        all: [{ type, after: earliest, before: "2026-11-23" }],
      } satisfies FilterSubscriberBody;
      await kit.subscribers.filter(body);
      expect(await sentBody()).toEqual(body);
    }
  );

  it("sends uncapped signup dates unchanged", async () => {
    fetchMock.mockResponseOnce(JSON.stringify(response));
    const body = {
      all: [{ type: "subscribed", after: "2012-01-01", before: "2015-12-31" }],
    } satisfies FilterSubscriberBody;
    await kit.subscribers.filter(body);
    expect(await sentBody()).toEqual(body);
  });

  it("sends a stats include range unchanged", async () => {
    fetchMock.mockResponseOnce(JSON.stringify(response));
    const body = {
      all: [active],
      include: [
        { type: "stats", range: { start: earliest, end: "2026-11-23" } },
      ],
    } satisfies FilterSubscriberBody;
    await kit.subscribers.filter(body);
    expect(await sentBody()).toEqual(body);
  });

  it.each([
    {
      name: "engagement dates",
      body: { all: [{ type: "opens", after: "2020-01-01" }] },
    },
    {
      name: "a stats include range",
      body: {
        all: [active],
        include: [{ type: "stats", range: { start: "2020-01-01" } }],
      },
    },
  ] satisfies { name: string; body: FilterSubscriberBody }[])(
    "throws Kit's 400 for older $name with details and no retry",
    async ({ body }) => {
      fetchMock.mockResponseOnce(JSON.stringify(rejection), { status: 400 });
      const result = kit.subscribers.filter(body);
      await expect(result).rejects.toBeInstanceOf(ApiError);
      await expect(result).rejects.toMatchObject({
        status: 400,
        details: rejection,
      });
      expect(fetchMock.requests()).toHaveLength(1);
      expect(await sentBody()).toEqual(body);
    }
  );
});
