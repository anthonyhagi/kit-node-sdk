import { beforeEach, describe, expect, it } from "vitest";
import {
  Kit,
  type AddSubscriberToSequence,
  type ListSequences,
  type ListSequenceSubscribers,
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
