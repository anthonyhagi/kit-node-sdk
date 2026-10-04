import { beforeEach, describe, expect, expectTypeOf, it } from "vitest";
import { Kit, type ListSequenceEmails, type SequenceEmailStats } from "~/index";

const email = {
  id: 6,
  sequence_id: 108,
  subject: "Welcome to the series",
  preview_text: "Here's what to expect",
  email_address: "hello@example.com",
  email_template_id: null,
  published: true,
  position: 0,
  delay_value: 0,
  delay_unit: "days",
  send_days: ["monday", "wednesday"],
};
const pagination = {
  has_previous_page: false,
  has_next_page: true,
  start_cursor: "start",
  end_cursor: "next+/=",
  per_page: 25,
};

describe("sequence email list requests through Kit", () => {
  let kit: Kit;
  beforeEach(() => {
    fetchMock.resetMocks();
    kit = new Kit({ apiKey: "test-key", maxRetries: 0 });
  });

  it("lists metadata without requesting optional content or stats", async () => {
    const response = {
      emails: [email],
      pagination,
    } satisfies ListSequenceEmails;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    const result = await kit.sequenceEmails.list(108);
    expectTypeOf(result).toEqualTypeOf<ListSequenceEmails | null>();
    expectTypeOf(result!.emails[0]!.content).toEqualTypeOf<
      string | undefined
    >();
    expectTypeOf(result!.emails[0]!.email_template_id).toEqualTypeOf<
      number | null
    >();
    expectTypeOf(result!.emails[0]!.stats).toEqualTypeOf<
      SequenceEmailStats | undefined
    >();
    expect(result).toEqual(response);
    const req = fetchMock.requests()[0]!;
    expect(req.url).toBe("https://api.kit.com/v4/sequences/108/emails");
    expect(req.method).toBe("GET");
    expect(await req.text()).toBe("");
  });

  it.each(["after", "before"] as const)(
    "combines %s pagination with content, stats, and counts",
    async (cursor) => {
      const stats = {
        recipients: 0,
        opens: 0,
        clicks: 0,
        email_unsubscribes: 0,
        bounces: 0,
        complaints: 0,
        open_rate: 0,
        click_rate: 0,
        click_to_open_rate: 0,
        unsubscribe_rate: 0,
        bounce_rate: 0,
        complaint_rate: 0,
      } satisfies SequenceEmailStats;
      const response = {
        emails: [
          { ...email, email_template_id: 6, content: "<p>Welcome!</p>", stats },
        ],
        pagination: { ...pagination, total_count: 2 },
      } satisfies ListSequenceEmails;
      fetchMock.mockResponseOnce(JSON.stringify(response));
      const result = await kit.sequenceEmails.list(108, {
        [cursor]: "next+/=",
        per_page: 25,
        include_total_count: true,
        include_content: true,
        include: "stats",
      });
      expect(result).toEqual(response);
      expectTypeOf(result!.emails[0]!.stats?.recipients).toEqualTypeOf<
        number | undefined
      >();
      expectTypeOf(result!.pagination.total_count).toEqualTypeOf<
        number | undefined
      >();
      expect(
        Object.fromEntries(new URL(fetchMock.requests()[0]!.url).searchParams)
      ).toEqual({
        [cursor]: "next+/=",
        per_page: "25",
        include_total_count: "true",
        include_content: "true",
        include: "stats",
      });
    }
  );

  it("preserves explicit false content and total-count options", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ emails: [], pagination }));
    await kit.sequenceEmails.list(108, {
      include_content: false,
      include_total_count: false,
    });
    expect(
      Object.fromEntries(new URL(fetchMock.requests()[0]!.url).searchParams)
    ).toEqual({ include_content: "false", include_total_count: "false" });
  });

  it("retrieves the next page while retaining content and stats options", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ emails: [email], pagination }));
    const response = {
      emails: [
        {
          ...email,
          id: 7,
          position: 1,
          content: "<p>Next email</p>",
          stats: { recipients: 10, open_rate: 0.5 },
        },
      ],
      pagination: {
        ...pagination,
        has_next_page: false,
        has_previous_page: true,
      },
    } satisfies ListSequenceEmails;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    const first = await kit.sequenceEmails.list(108, {
      per_page: 25,
      include_content: true,
      include: "stats",
    });
    const next = await kit.sequenceEmails.list(108, {
      after: first!.pagination.end_cursor!,
      per_page: 25,
      include_content: true,
      include: "stats",
    });
    expect(next).toEqual(response);
    expect(
      Object.fromEntries(new URL(fetchMock.requests()[1]!.url).searchParams)
    ).toEqual({
      after: "next+/=",
      per_page: "25",
      include_content: "true",
      include: "stats",
    });
  });

  it("returns null for a missing sequence", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ errors: ["Not Found"] }), {
      status: 404,
    });
    expect(await kit.sequenceEmails.list(404)).toBeNull();
  });
});
