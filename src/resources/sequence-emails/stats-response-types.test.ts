import { beforeEach, describe, expect, expectTypeOf, it } from "vitest";
import {
  Kit,
  type GetSequenceEmail,
  type GetSequenceEmailParams,
  type GetSequenceEmailWithStats,
  type ListSequenceEmails,
  type ListSequenceEmailsParams,
  type ListSequenceEmailsWithContent,
  type ListSequenceEmailsWithContentAndStats,
  type ListSequenceEmailsWithStats,
  type SequenceEmailStats,
} from "~/index";
const metadata = {
  id: 456,
  sequence_id: 123,
  subject: "Hello",
  preview_text: null,
  email_address: "hello@example.com",
  email_template_id: null,
  published: false,
  position: 0,
  delay_value: 0,
  delay_unit: "days",
  send_days: null,
};
const pagination = {
  has_previous_page: false,
  has_next_page: false,
  start_cursor: null,
  end_cursor: null,
  per_page: 25,
};

describe("sequence email stats inference", () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });
  it.each([null, "", "<p>Hello</p>"])(
    "requires content and stats when both requested, content %j",
    async (content) => {
      const email = {
        ...metadata,
        content,
        stats: { recipients: 0, open_rate: 0 },
      };
      const page = {
        emails: [email],
        pagination,
      } satisfies ListSequenceEmailsWithContentAndStats;
      fetchMock.mockResponseOnce(JSON.stringify(page));
      fetchMock.mockResponseOnce(JSON.stringify({ email }));
      const kit = new Kit({ apiKey: "test", maxRetries: 0 });
      const signal = new AbortController().signal;
      const result = await kit.sequenceEmails.list(
        123,
        { include: "stats", include_content: true, per_page: 25, after: null },
        { signal }
      );
      const single = await kit.sequenceEmails.get(
        123,
        456,
        { include: "stats" },
        { signal }
      );
      expectTypeOf(
        result
      ).toEqualTypeOf<ListSequenceEmailsWithContentAndStats | null>();
      expectTypeOf(single).toEqualTypeOf<GetSequenceEmailWithStats | null>();
      expectTypeOf(
        result!.emails[0]!.stats
      ).toEqualTypeOf<SequenceEmailStats>();
      expectTypeOf(result!.emails[0]!.content).toEqualTypeOf<string | null>();
      expectTypeOf(single!.email.stats).toEqualTypeOf<SequenceEmailStats>();
      expectTypeOf(single!.email.content).toEqualTypeOf<string | null>();
      expectTypeOf(result).toExtend<ListSequenceEmailsWithContent | null>();
      expectTypeOf(single).toExtend<GetSequenceEmail | null>();
      expect(result).toEqual(page);
      expect(single!.email.stats.open_rate).toBe(0);
      expect(
        Object.fromEntries(new URL(fetchMock.requests()[0]!.url).searchParams)
      ).toEqual({
        include: "stats",
        include_content: "true",
        per_page: "25",
      });
      expect(new URL(fetchMock.requests()[1]!.url).search).toBe(
        "?include=stats"
      );
      expect(fetchMock.mock.calls[0]![1]?.signal).toBe(signal);
      expect(fetchMock.mock.calls[1]![1]?.signal).toBe(signal);
      expectTypeOf<GetSequenceEmail>().not.toExtend<GetSequenceEmailWithStats>();
      expectTypeOf<ListSequenceEmailsWithContent>().not.toExtend<ListSequenceEmailsWithContentAndStats>();
    }
  );
  it.each([undefined, false, null])(
    "requires only stats with content flag %j",
    async (include_content) => {
      const page = {
        emails: [{ ...metadata, stats: {} }],
        pagination,
      } satisfies ListSequenceEmailsWithStats;
      fetchMock.mockResponseOnce(JSON.stringify(page));
      const result = await new Kit({
        apiKey: "test",
        maxRetries: 0,
      }).sequenceEmails.list(123, { include: "stats", include_content });
      expectTypeOf(result).toEqualTypeOf<ListSequenceEmailsWithStats | null>();
      expectTypeOf(result!.emails[0]!.content).toEqualTypeOf<
        string | null | undefined
      >();
      expectTypeOf(
        result!.emails[0]!.stats
      ).toEqualTypeOf<SequenceEmailStats>();
      expect(result).toEqual(page);
      expect(result!.emails[0]).not.toHaveProperty("content");
    }
  );
  it.each(["stats", undefined] as const)(
    "keeps broad inclusion and content flags safe: %s",
    async (include) => {
      const params: ListSequenceEmailsParams = {
        include,
        include_content: true,
      };
      const getParams: GetSequenceEmailParams = { include };
      fetchMock.mockResponseOnce(JSON.stringify({ emails: [], pagination }));
      fetchMock.mockResponseOnce(
        JSON.stringify({ email: { ...metadata, content: null } })
      );
      const kit = new Kit({ apiKey: "test", maxRetries: 0 });
      const result = await kit.sequenceEmails.list(123, params);
      const single = await kit.sequenceEmails.get(123, 456, getParams);
      expectTypeOf(result).toEqualTypeOf<
        ListSequenceEmails | ListSequenceEmailsWithContent | null
      >();
      expectTypeOf(single).toEqualTypeOf<
        GetSequenceEmail | GetSequenceEmailWithStats | null
      >();
      expectTypeOf<
        NonNullable<typeof result>["emails"][number]["stats"]
      >().toEqualTypeOf<SequenceEmailStats | undefined>();
      expect(result!.emails).toEqual([]);
    }
  );
  it("keeps stats optional with literal content and broad inclusion", async () => {
    const params: { include?: "stats"; include_content: true } = {
      include_content: true,
    };
    fetchMock.mockResponseOnce(JSON.stringify({ emails: [], pagination }));
    const result = await new Kit({
      apiKey: "test",
      maxRetries: 0,
    }).sequenceEmails.list(123, params);
    expectTypeOf(result).toEqualTypeOf<ListSequenceEmailsWithContent | null>();
    expectTypeOf<
      NonNullable<typeof result>["emails"][number]["stats"]
    >().toEqualTypeOf<SequenceEmailStats | undefined>();
    expectTypeOf<
      NonNullable<typeof result>["emails"][number]["content"]
    >().toEqualTypeOf<string | null>();
  });
  it("keeps content optional with literal stats and a dynamic content flag", async () => {
    const params: ListSequenceEmailsParams & { include: "stats" } = {
      include: "stats",
      include_content: true,
    };
    fetchMock.mockResponseOnce(JSON.stringify({ emails: [], pagination }));
    const result = await new Kit({
      apiKey: "test",
      maxRetries: 0,
    }).sequenceEmails.list(123, params);
    expectTypeOf(result).toEqualTypeOf<ListSequenceEmailsWithStats | null>();
    expectTypeOf<
      NonNullable<typeof result>["emails"][number]["content"]
    >().toEqualTypeOf<string | null | undefined>();
  });
  it("preserves null for missing stats reads and combined list requests", async () => {
    fetchMock.mockResponseOnce("", { status: 404 });
    fetchMock.mockResponseOnce("", { status: 404 });
    const kit = new Kit({ apiKey: "test", maxRetries: 0 });
    expect(
      await kit.sequenceEmails.get(123, 456, { include: "stats" })
    ).toBeNull();
    expect(
      await kit.sequenceEmails.list(123, {
        include: "stats",
        include_content: true,
      })
    ).toBeNull();
  });
});
