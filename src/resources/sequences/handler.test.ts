import { beforeEach, describe, expect, expectTypeOf, it } from "vitest";
import {
  Kit,
  type AddSubscriberToSequence,
  type CreateSequence,
  type CreateSequenceParams,
  type GetSequence,
  type ListSequences,
  type ListSequenceSubscribers,
  type SequenceListItem,
  type SequenceStats,
  type UpdateSequence,
  type UpdateSequenceParams,
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

  const customFieldCases: {
    name: string;
    fields: ListSequenceSubscribers["subscribers"][number]["fields"];
  }[] = [
    {
      name: "mixed string and null values",
      fields: { interest: "TypeScript", birthday: null },
    },
    { name: "only null values", fields: { interest: null } },
    { name: "empty fields", fields: {} },
  ];

  it.each(customFieldCases)(
    "preserves sequence subscriber custom fields with $name",
    async ({ fields }) => {
      const response = {
        subscribers: [{ ...subscriber, fields }],
        pagination,
      } satisfies ListSequenceSubscribers;
      fetchMock.mockResponseOnce(JSON.stringify(response));

      const result = await kit.sequences.listSubscribers(7);
      expectTypeOf(result).toEqualTypeOf<ListSequenceSubscribers | null>();
      expectTypeOf<
        ListSequenceSubscribers["subscribers"][number]["fields"]
      >().toEqualTypeOf<Record<string, string | null>>();
      expect(result).toEqual(response);
      expect(result?.subscribers[0]?.fields).toEqual(fields);
      expect(await request("GET", "/sequences/7/subscribers").text()).toBe("");
    }
  );

  it("deletes a sequence with a bodyless request and handles 204 responses", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const result = await kit.sequences.delete(7);
    expectTypeOf(result).toEqualTypeOf<{} | null>();
    expect(result).toEqual({});
    expect(await request("DELETE", "/sequences/7").text()).toBe("");
  });

  it("returns null when deleting a missing sequence", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ errors: ["Not Found"] }), {
      status: 404,
    });
    expect(await kit.sequences.delete(404)).toBeNull();
    expect(await request("DELETE", "/sequences/404").text()).toBe("");
  });

  it("surfaces authentication errors when deleting a sequence", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({ errors: ["The access token is invalid"] }),
      { status: 401 }
    );
    await expect(kit.sequences.delete(7)).rejects.toThrow(
      "Authentication failed"
    );
    expect(await request("DELETE", "/sequences/7").text()).toBe("");
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

  it("creates a sequence with only a name and returns the server's defaults", async () => {
    const params = { name: "Welcome" } satisfies CreateSequenceParams;
    const response = { sequence: details } satisfies CreateSequence;
    fetchMock.mockResponseOnce(JSON.stringify(response), { status: 201 });
    const result = await kit.sequences.create(params);
    expectTypeOf(result).toEqualTypeOf<CreateSequence>();
    expect(result).toEqual(response);
    const req = request("POST", "/sequences");
    expect(req.headers.get("Content-Type")).toBe("application/json");
    expect(await req.json()).toEqual({ name: "Welcome" });
  });

  it("creates a fully configured sequence with false flags and a midnight schedule", async () => {
    const params = {
      name: "Full Series",
      email_address: "hello@example.com",
      email_template_id: 6,
      send_days: ["monday", "wednesday", "friday"],
      send_hour: 0,
      time_zone: "Australia/Adelaide",
      active: false,
      repeat: false,
      hold: false,
      exclude_subscriber_sources: [
        { type: "tag", ids: [3] },
        { type: "sequence", ids: [30] },
        { type: "form", ids: [4] },
        { type: "segment", ids: [5] },
      ],
    } satisfies CreateSequenceParams;
    const response = {
      sequence: { ...details, ...params },
    } satisfies CreateSequence;
    fetchMock.mockResponseOnce(JSON.stringify(response), { status: 201 });
    expect(await kit.sequences.create(params)).toEqual(response);
    expect(await request("POST", "/sequences").json()).toEqual(params);
    expectTypeOf<{
      name: string;
      send_days: ["holiday"];
    }>().not.toExtend<CreateSequenceParams>();
    expectTypeOf<{
      name: string;
      exclude_subscriber_sources: [{ type: "unknown"; ids: number[] }];
    }>().not.toExtend<CreateSequenceParams>();
    expectTypeOf<{}>().not.toExtend<CreateSequenceParams>();
  });

  it("preserves empty exclusions and omits undefined optional settings", async () => {
    const params = {
      name: "Welcome",
      exclude_subscriber_sources: [],
      email_address: undefined,
    } satisfies CreateSequenceParams;
    fetchMock.mockResponseOnce(JSON.stringify({ sequence: details }), {
      status: 201,
    });
    await kit.sequences.create(params);
    expect(await request("POST", "/sequences").json()).toEqual({
      name: "Welcome",
      exclude_subscriber_sources: [],
    });
  });

  it("surfaces Kit validation errors when creating a sequence", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({
        errors: ["send_hour must be an integer between 0 and 23"],
      }),
      { status: 422 }
    );
    await expect(
      kit.sequences.create({ name: "Welcome", send_hour: 24 })
    ).rejects.toThrow("send_hour must be an integer between 0 and 23");
    expect(await request("POST", "/sequences").json()).toEqual({
      name: "Welcome",
      send_hour: 24,
    });
  });

  it("updates only the supplied activity flag and omits undefined settings", async () => {
    const params = {
      active: false,
      name: undefined,
    } satisfies UpdateSequenceParams;
    const response = {
      sequence: { ...details, active: false },
    } satisfies UpdateSequence;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    const result = await kit.sequences.update(7, params);
    expectTypeOf(result).toEqualTypeOf<UpdateSequence | null>();
    expect(result).toEqual(response);
    const req = request("PUT", "/sequences/7");
    expect(req.headers.get("Content-Type")).toBe("application/json");
    expect(await req.json()).toEqual({ active: false });
  });

  it("updates all settings while preserving false, zero, and empty exclusions", async () => {
    const params = {
      name: "Updated sequence",
      email_address: "hello@example.com",
      email_template_id: 6,
      send_days: ["tuesday", "thursday"],
      send_hour: 0,
      time_zone: "Australia/Adelaide",
      active: false,
      repeat: false,
      hold: false,
      exclude_subscriber_sources: [],
    } satisfies UpdateSequenceParams;
    const response = {
      sequence: { ...details, ...params },
    } satisfies UpdateSequence;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.sequences.update(7, params)).toEqual(response);
    expect(await request("PUT", "/sequences/7").json()).toEqual(params);
    expectTypeOf<{
      send_days: ["holiday"];
    }>().not.toExtend<UpdateSequenceParams>();
  });

  it("updates exclusions without requiring other settings", async () => {
    const params = {
      exclude_subscriber_sources: [
        { type: "tag", ids: [3] },
        { type: "sequence", ids: [30] },
        { type: "form", ids: [4] },
        { type: "segment", ids: [5] },
      ],
    } satisfies UpdateSequenceParams;
    fetchMock.mockResponseOnce(
      JSON.stringify({ sequence: { ...details, ...params } })
    );
    await kit.sequences.update(7, params);
    expect(await request("PUT", "/sequences/7").json()).toEqual(params);
  });

  it("returns null when updating a missing sequence", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ errors: ["Not Found"] }), {
      status: 404,
    });
    expect(await kit.sequences.update(404, { name: "Missing" })).toBeNull();
    expect(await request("PUT", "/sequences/404").json()).toEqual({
      name: "Missing",
    });
  });

  it("surfaces Kit validation errors when updating a sequence", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({ errors: ["name can't be blank"] }),
      { status: 422 }
    );
    await expect(kit.sequences.update(7, { name: "" })).rejects.toThrow(
      "name can't be blank"
    );
    expect(await request("PUT", "/sequences/7").json()).toEqual({ name: "" });
  });

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
