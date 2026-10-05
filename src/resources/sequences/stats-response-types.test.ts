import { beforeEach, describe, expect, expectTypeOf, it } from "vitest";
import {
  Kit,
  type GetSequence,
  type GetSequenceParams,
  type GetSequenceWithStats,
  type ListSequences,
  type ListSequencesParams,
  type ListSequencesWithStats,
  type SequenceStats,
} from "~/index";

const sequence = {
  id: 123,
  name: "Welcome",
  hold: false,
  repeat: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  email_address: null,
  email_template_id: null,
  send_days: ["monday"],
  send_hour: 11,
  time_zone: "UTC",
  active: true,
  exclude_subscriber_sources: [],
} satisfies GetSequence["sequence"];
const pagination = {
  has_previous_page: false,
  has_next_page: false,
  start_cursor: null,
  end_cursor: null,
  per_page: 25,
};

describe("sequence stats response inference", () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  it.each([null, 0, 0.5])(
    "requires requested stats and preserves an open rate of %j",
    async (open_rate) => {
      const withStats = { ...sequence, stats: { open_rate, unsubscribers: 0 } };
      const list = {
        sequences: [withStats],
        pagination,
      } satisfies ListSequencesWithStats;
      const single = { sequence: withStats } satisfies GetSequenceWithStats;
      fetchMock.mockResponseOnce(JSON.stringify(list));
      fetchMock.mockResponseOnce(JSON.stringify(single));
      const kit = new Kit({ apiKey: "test", maxRetries: 0 });
      const controller = new AbortController();
      const options = { signal: controller.signal, maxRetries: 0 };
      const page = await kit.sequences.list(
        { include: "stats", after: null, per_page: 25 },
        options
      );
      const result = await kit.sequences.get(
        123,
        { include: "stats" },
        options
      );
      expectTypeOf(page).toEqualTypeOf<ListSequencesWithStats>();
      expectTypeOf(result).toEqualTypeOf<GetSequenceWithStats | null>();
      expectTypeOf(page.sequences[0]!.stats).toEqualTypeOf<SequenceStats>();
      expectTypeOf(result!.sequence.stats).toEqualTypeOf<SequenceStats>();
      expectTypeOf(page.sequences[0]!.stats.open_rate).toEqualTypeOf<
        number | null | undefined
      >();
      expectTypeOf(page).toExtend<ListSequences>();
      expectTypeOf(result).toExtend<GetSequence | null>();
      expect(page).toEqual(list);
      expect(result).toEqual(single);
      const requests = fetchMock.requests();
      expect(new URL(requests[0]!.url).search).toBe(
        "?include=stats&per_page=25"
      );
      expect(new URL(requests[1]!.url).search).toBe("?include=stats");
      expect(fetchMock.mock.calls[0]![1]?.signal).toBe(controller.signal);
      expect(fetchMock.mock.calls[1]![1]?.signal).toBe(controller.signal);
      expectTypeOf<GetSequence>().not.toExtend<GetSequenceWithStats>();
      expectTypeOf<ListSequences>().not.toExtend<ListSequencesWithStats>();
    }
  );

  it.each([undefined, {}, { include: undefined }] as const)(
    "keeps stats optional for %j",
    async (params) => {
      fetchMock.mockResponseOnce(
        JSON.stringify({ sequences: [sequence], pagination })
      );
      fetchMock.mockResponseOnce(JSON.stringify({ sequence }));
      const kit = new Kit({ apiKey: "test", maxRetries: 0 });
      const page = await kit.sequences.list(params);
      const result = await kit.sequences.get(123, params);
      expectTypeOf(page).toEqualTypeOf<ListSequences>();
      expectTypeOf(result).toEqualTypeOf<GetSequence | null>();
      expectTypeOf(page.sequences[0]!.stats).toEqualTypeOf<
        SequenceStats | undefined
      >();
      expectTypeOf(result!.sequence.stats).toEqualTypeOf<
        SequenceStats | undefined
      >();
      expect(page.sequences[0]).not.toHaveProperty("stats");
      expect(result!.sequence).not.toHaveProperty("stats");
    }
  );

  it.each(["stats", undefined] as const)(
    "keeps broad inclusion parameters safe: %s",
    async (include) => {
      const listParams: ListSequencesParams = { include };
      const getParams: GetSequenceParams = { include };
      fetchMock.mockResponseOnce(JSON.stringify({ sequences: [], pagination }));
      fetchMock.mockResponseOnce(JSON.stringify({ sequence }));
      const kit = new Kit({ apiKey: "test", maxRetries: 0 });
      const page = await kit.sequences.list(listParams);
      const result = await kit.sequences.get(123, getParams);
      expectTypeOf(page).toEqualTypeOf<
        ListSequences | ListSequencesWithStats
      >();
      expectTypeOf(result).toEqualTypeOf<
        GetSequence | GetSequenceWithStats | null
      >();
      expectTypeOf<(typeof page)["sequences"][number]["stats"]>().toEqualTypeOf<
        SequenceStats | undefined
      >();
      expectTypeOf<
        NonNullable<typeof result>["sequence"]["stats"]
      >().toEqualTypeOf<SequenceStats | undefined>();
      expect(page.sequences).toEqual([]);
    }
  );

  it("preserves null for a missing sequence when stats are requested", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ errors: ["Not Found"] }), {
      status: 404,
    });
    const result = await new Kit({
      apiKey: "test",
      maxRetries: 0,
    }).sequences.get(404, { include: "stats" });
    expectTypeOf(result).toEqualTypeOf<GetSequenceWithStats | null>();
    expect(result).toBeNull();
  });
});
