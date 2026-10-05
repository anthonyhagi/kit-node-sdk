import { beforeEach, describe, expect, expectTypeOf, it } from "vitest";
import {
  Kit,
  type ListFullSubscribers,
  type ListSlimSubscribers,
  type ListSubscribers,
  type ListSubscribersParams,
} from "~/index";

const subscriber = {
  id: 1,
  first_name: null,
  email_address: "test@example.com",
  state: "active" as const,
  created_at: "2026-01-01T00:00:00Z",
};
const pagination = {
  has_previous_page: false,
  has_next_page: false,
  start_cursor: null,
  end_cursor: null,
  per_page: 500,
};

describe("subscriber list response inference", () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  it.each([undefined, {}, { slim: false }, { slim: undefined }] as const)(
    "requires custom fields for full requests %j",
    async (params) => {
      const response = {
        subscribers: [{ ...subscriber, fields: { custom: null } }],
        pagination,
      } satisfies ListFullSubscribers;
      fetchMock.mockResponseOnce(JSON.stringify(response));
      const kit = new Kit({ apiKey: "test", maxRetries: 0 });
      const result = await kit.subscribers.list(params);
      expectTypeOf(result).toEqualTypeOf<ListFullSubscribers>();
      expectTypeOf(result.subscribers[0]!.fields).toEqualTypeOf<
        Record<string, string | null>
      >();
      expect(result).toEqual(response);
    }
  );

  it("accepts omitted custom fields in a literal slim request", async () => {
    const response = {
      subscribers: [subscriber],
      pagination,
    } satisfies ListSlimSubscribers;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    const kit = new Kit({ apiKey: "test", maxRetries: 0 });
    const result = await kit.subscribers.list({
      slim: true,
      after: null,
      include_total_count: false,
    });
    expectTypeOf(result).toEqualTypeOf<ListSlimSubscribers>();
    expectTypeOf(result.subscribers[0]!.fields).toEqualTypeOf<
      Record<string, string | null> | undefined
    >();
    expect(result).toEqual(response);
    const url = new URL(fetchMock.requests()[0]!.url);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      slim: "true",
      include_total_count: "false",
    });
  });

  it("keeps dynamic requests and the existing response type compatible", async () => {
    const params: ListSubscribersParams = { slim: true };
    const response = {
      subscribers: [subscriber],
      pagination,
    } satisfies ListSubscribers;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    const kit = new Kit({ apiKey: "test", maxRetries: 0 });
    const result = await kit.subscribers.list(params);
    expectTypeOf(result).toEqualTypeOf<
      ListFullSubscribers | ListSlimSubscribers
    >();
    expectTypeOf(result).toExtend<ListSubscribers>();
    expectTypeOf(result.subscribers[0]!.fields).toEqualTypeOf<
      Record<string, string | null> | undefined
    >();
    expect(result).toEqual(response);
  });
});
