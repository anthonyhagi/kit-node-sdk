import { beforeEach, describe, expect, expectTypeOf, it } from "vitest";
import {
  Kit,
  type AddSubscriberToSequence,
  type GetSequence,
  type ListSequences,
  type ListSequenceSubscribers,
  type SequenceListItem,
  type SequenceStats,
} from "~/index";

const sequence = {
  id: 7,
  name: "Welcome",
  hold: false,
  repeat: true,
  created_at: "2026-01-01T00:00:00Z",
};
const subscriber = {
  id: 42,
  first_name: "Ada",
  email_address: "ada+newsletter@example.com",
  state: "active",
  created_at: "2026-01-01T00:00:00Z",
  added_at: "2026-02-01T00:00:00Z",
  fields: { interest: "TypeScript" },
};
const pagination = {
  has_previous_page: false,
  has_next_page: true,
  start_cursor: "start",
  end_cursor: "next+/=",
  per_page: 25,
};

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

describe("sequence requests through Kit", () => {
  let kit: Kit;
  beforeEach(() => {
    fetchMock.resetMocks();
    kit = new Kit({ apiKey: "test-key", maxRetries: 0 });
  });

  it("lists sequences without optional pagination", async () => {
    const response = {
      sequences: [sequence],
      pagination,
    } satisfies ListSequences;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.sequences.list()).toEqual(response);
    expect(await request("GET", "/sequences").text()).toBe("");
  });

  const details = {
    ...sequence,
    updated_at: "2026-02-01T00:00:00Z",
    email_address: null,
    email_template_id: null,
    send_days: ["monday", "wednesday"],
    send_hour: 11,
    time_zone: "America/New_York",
    active: true,
    exclude_subscriber_sources: [
      { type: "tag", ids: [3] },
      { type: "sequence", ids: [30] },
    ],
    email_count: 2,
    subscriber_count: 10,
  } satisfies GetSequence["sequence"];

  it("fetches full sequence details without requesting stats", async () => {
    const response = { sequence: details } satisfies GetSequence;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    const result = await kit.sequences.get(7);
    expectTypeOf(result).toEqualTypeOf<GetSequence | null>();
    expectTypeOf(result!.sequence.email_address).toEqualTypeOf<string | null>();
    expectTypeOf(result!.sequence.email_template_id).toEqualTypeOf<
      number | null
    >();
    expectTypeOf(result!.sequence.stats).toEqualTypeOf<
      SequenceStats | undefined
    >();
    expect(result).toEqual(response);
    expect(await request("GET", "/sequences/7").text()).toBe("");
  });

  it.each([false, true])(
    "requests stats with nullable delivery data: %s",
    async (empty) => {
      const metric = empty ? null : 5;
      const stats = {
        unsubscribers: 2,
        recipients: metric,
        opens: metric,
        clicks: metric,
        email_unsubscribes: metric,
        bounces: metric,
        complaints: metric,
        open_rate: empty ? null : 0.5,
        click_rate: empty ? null : 0.25,
        click_to_open_rate: empty ? null : 0.5,
        unsubscribe_rate: empty ? null : 0.01,
        bounce_rate: empty ? null : 0.02,
        complaint_rate: empty ? null : 0.001,
      } satisfies SequenceStats;
      const response = {
        sequence: {
          ...details,
          email_address: "hello@example.com",
          email_template_id: 6,
          stats,
        },
      } satisfies GetSequence;
      fetchMock.mockResponseOnce(JSON.stringify(response));
      const result = await kit.sequences.get(7, { include: "stats" });
      expect(result).toEqual(response);
      expectTypeOf(result!.sequence.stats?.open_rate).toEqualTypeOf<
        number | null | undefined
      >();
      expect(
        await request("GET", "/sequences/7", { include: "stats" }).text()
      ).toBe("");
    }
  );

  it("handles omitted counts and stats with an empty options object", async () => {
    const { email_count, subscriber_count, ...withoutCounts } = details;
    const response = { sequence: withoutCounts } satisfies GetSequence;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.sequences.get(7, {})).toEqual(response);
    request("GET", "/sequences/7");
  });

  it("returns null for a missing sequence", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ errors: ["Not Found"] }), {
      status: 404,
    });
    expect(await kit.sequences.get(404, { include: "stats" })).toBeNull();
    request("GET", "/sequences/404", { include: "stats" });
  });

  it.each(["after", "before"] as const)(
    "encodes the %s sequence cursor and pagination options",
    async (cursor) => {
      const response = { sequences: [], pagination };
      fetchMock.mockResponseOnce(JSON.stringify(response));
      expect(
        await kit.sequences.list({
          [cursor]: "next+/=",
          include_total_count: true,
          per_page: 25,
        })
      ).toEqual(response);
      request("GET", "/sequences", {
        [cursor]: "next+/=",
        include_total_count: "true",
        per_page: "25",
      });
    }
  );

  it.each(["after", "before"] as const)(
    "combines included stats with %s pagination and exposes sequence settings",
    async (cursor) => {
      const response = {
        sequences: [
          {
            ...details,
            stats: { unsubscribers: 2, recipients: 10, open_rate: 0.5 },
          },
        ],
        pagination: { ...pagination, total_count: 1 },
      } satisfies ListSequences;
      fetchMock.mockResponseOnce(JSON.stringify(response));
      const result = await kit.sequences.list({
        [cursor]: "next+/=",
        per_page: 25,
        include_total_count: true,
        include: "stats",
      });
      expect(result).toEqual(response);
      expectTypeOf(result.sequences[0]!).toEqualTypeOf<SequenceListItem>();
      expectTypeOf(result.sequences[0]!.stats).toEqualTypeOf<
        SequenceStats | undefined
      >();
      expectTypeOf(result.sequences[0]!.email_address).toEqualTypeOf<
        string | null | undefined
      >();
      expectTypeOf(result.sequences[0]!.send_days).toEqualTypeOf<
        string[] | undefined
      >();
      expect(
        await request("GET", "/sequences", {
          [cursor]: "next+/=",
          per_page: "25",
          include_total_count: "true",
          include: "stats",
        }).text()
      ).toBe("");
    }
  );

  it("supports stats with null delivery metrics and explicit false total counts", async () => {
    const response = {
      sequences: [
        {
          ...sequence,
          stats: {
            unsubscribers: 0,
            recipients: null,
            open_rate: null,
            click_rate: null,
          },
        },
      ],
      pagination,
    } satisfies ListSequences;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    const result = await kit.sequences.list({
      include: "stats",
      include_total_count: false,
    });
    expect(result).toEqual(response);
    expectTypeOf(result.sequences[0]!.stats?.open_rate).toEqualTypeOf<
      number | null | undefined
    >();
    request("GET", "/sequences", {
      include: "stats",
      include_total_count: "false",
    });
  });

  it("retains stats inclusion when requesting the second sequence page", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({ sequences: [details], pagination })
    );
    const response = {
      sequences: [{ ...sequence, id: 8 }],
      pagination: { ...pagination, has_next_page: false },
    } satisfies ListSequences;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    const first = await kit.sequences.list({ include: "stats", per_page: 25 });
    const second = await kit.sequences.list({
      include: "stats",
      per_page: 25,
      after: first.pagination.end_cursor!,
    });
    expect(second).toEqual(response);
    expect(
      Object.fromEntries(new URL(fetchMock.requests()[1]!.url).searchParams)
    ).toEqual({ include: "stats", per_page: "25", after: "next+/=" });
    expectTypeOf(second.sequences[0]!.subscriber_count).toEqualTypeOf<
      number | undefined
    >();
  });

  it("lists sequence subscribers without optional filters, preserving nullable names and emails", async () => {
    const response = {
      subscribers: [{ ...subscriber, first_name: null, email_address: null }],
      pagination,
    } satisfies ListSequenceSubscribers;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.sequences.listSubscribers(7)).toEqual(response);
    expect(await request("GET", "/sequences/7/subscribers").text()).toBe("");
  });

  it.each(["after", "before"] as const)(
    "paginates sequence subscribers with %s and normalizes date filters",
    async (cursor) => {
      const response = {
        subscribers: [subscriber],
        pagination,
      } satisfies ListSequenceSubscribers;
      fetchMock.mockResponseOnce(JSON.stringify(response));
      expect(
        await kit.sequences.listSubscribers(7, {
          [cursor]: "next+/=",
          per_page: 25,
          include_total_count: true,
          status: "all",
          added_after: new Date("2026-01-01T00:00:00Z"),
          added_before: "2026-02-01",
          created_after: "2026-03-01",
          created_before: new Date("2026-04-01T00:00:00Z"),
        })
      ).toEqual(response);
      request("GET", "/sequences/7/subscribers", {
        [cursor]: "next+/=",
        per_page: "25",
        include_total_count: "true",
        status: "all",
        added_after: "2026-01-01T00:00:00.000Z",
        added_before: "2026-02-01",
        created_after: "2026-03-01",
        created_before: "2026-04-01T00:00:00.000Z",
      });
    }
  );

  it.each([200, 201])(
    "adds a subscriber by email with a JSON body on status %i",
    async (status) => {
      const body = { email_address: subscriber.email_address };
      const response = { subscriber } satisfies AddSubscriberToSequence;
      fetchMock.mockResponseOnce(JSON.stringify(response), { status });
      expect(await kit.sequences.addSubscriberByEmail(7, body)).toEqual(
        response
      );
      const req = request("POST", "/sequences/7/subscribers");
      expect(req.headers.get("Content-Type")).toBe("application/json");
      expect(await req.json()).toEqual(body);
    }
  );

  it.each([200, 201])(
    "adds a subscriber by ID with a bodyless POST on status %i",
    async (status) => {
      const response = { subscriber } satisfies AddSubscriberToSequence;
      fetchMock.mockResponseOnce(JSON.stringify(response), { status });
      expect(await kit.sequences.addSubscriberById(7, 42)).toEqual(response);
      expect(await request("POST", "/sequences/7/subscribers/42").text()).toBe(
        ""
      );
    }
  );

  it.each([
    "listSubscribers",
    "addSubscriberById",
    "addSubscriberByEmail",
  ] as const)(
    "returns null from %s when the sequence or subscriber is missing",
    async (method) => {
      fetchMock.mockResponseOnce(JSON.stringify({ errors: ["Not found"] }), {
        status: 404,
      });
      let result;
      switch (method) {
        case "listSubscribers":
          result = await kit.sequences.listSubscribers(7);
          break;
        case "addSubscriberById":
          result = await kit.sequences.addSubscriberById(7, 42);
          break;
        case "addSubscriberByEmail":
          result = await kit.sequences.addSubscriberByEmail(7, {
            email_address: subscriber.email_address,
          });
          break;
      }
      expect(result).toBeNull();
      expect(fetchMock.requests()).toHaveLength(1);
    }
  );
});
