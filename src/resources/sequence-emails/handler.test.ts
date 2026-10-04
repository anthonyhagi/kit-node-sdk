import { beforeEach, describe, expect, expectTypeOf, it } from "vitest";
import {
  Kit,
  type CreateSequenceEmail,
  type CreateSequenceEmailParams,
  type GetSequenceEmail,
  type ListSequenceEmails,
  type SequenceEmailStats,
} from "~/index";

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

describe("sequence email get requests through Kit", () => {
  let kit: Kit;
  beforeEach(() => {
    fetchMock.resetMocks();
    kit = new Kit({ apiKey: "test-key", maxRetries: 0 });
  });

  it("retrieves full content without a content flag or stats option", async () => {
    const response = {
      email: { ...email, content: "<p>Welcome!</p>" },
    } satisfies GetSequenceEmail;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    const result = await kit.sequenceEmails.get(108, 6);
    expectTypeOf(result).toEqualTypeOf<GetSequenceEmail | null>();
    expectTypeOf(result!.email.content).toEqualTypeOf<string | null>();
    expectTypeOf(result!.email.stats).toEqualTypeOf<
      SequenceEmailStats | undefined
    >();
    expectTypeOf<typeof email>().not.toExtend<GetSequenceEmail["email"]>();
    expect(result).toEqual(response);
    const req = fetchMock.requests()[0]!;
    expect(req.url).toBe("https://api.kit.com/v4/sequences/108/emails/6");
    expect(req.method).toBe("GET");
    expect(await req.text()).toBe("");
  });

  it.each([0, 10])(
    "includes per-email stats with %s recipients",
    async (recipients) => {
      const response = {
        email: {
          ...email,
          email_template_id: 2,
          content: "<p>Welcome!</p>",
          stats: {
            recipients,
            opens: recipients,
            open_rate: recipients ? 0.5 : 0,
          },
        },
      } satisfies GetSequenceEmail;
      fetchMock.mockResponseOnce(JSON.stringify(response));
      expect(
        await kit.sequenceEmails.get(108, 6, { include: "stats" })
      ).toEqual(response);
      const req = fetchMock.requests()[0]!;
      expect(req.url).toBe(
        "https://api.kit.com/v4/sequences/108/emails/6?include=stats"
      );
      expect(await req.text()).toBe("");
    }
  );

  it("retrieves nullable draft content and hour-based timing", async () => {
    const response = {
      email: {
        ...email,
        published: false,
        preview_text: null,
        content: null,
        delay_unit: "hours",
        delay_value: 2,
        send_days: null,
      },
    } satisfies GetSequenceEmail;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.sequenceEmails.get(108, 6)).toEqual(response);
  });

  it("handles empty options and empty HTML content", async () => {
    const response = {
      email: { ...email, content: "" },
    } satisfies GetSequenceEmail;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.sequenceEmails.get(108, 6, {})).toEqual(response);
    expect(new URL(fetchMock.requests()[0]!.url).search).toBe("");
  });

  it("returns null for missing emails", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ errors: ["Not Found"] }), {
      status: 404,
    });
    expect(
      await kit.sequenceEmails.get(108, 404, { include: "stats" })
    ).toBeNull();
    expect(fetchMock.requests()[0]!.url).toBe(
      "https://api.kit.com/v4/sequences/108/emails/404?include=stats"
    );
  });
});

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
      string | null | undefined
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

describe("sequence email create requests through Kit", () => {
  let kit: Kit;
  beforeEach(() => {
    fetchMock.resetMocks();
    kit = new Kit({ apiKey: "test-key", maxRetries: 0 });
  });

  it("creates a draft using only the required subject and delay", async () => {
    const params = {
      subject: "Welcome",
      delay_value: 1,
      delay_unit: "days",
    } satisfies CreateSequenceEmailParams;
    const response = {
      email: {
        ...email,
        subject: "Welcome",
        delay_value: 1,
        published: false,
        preview_text: null,
        content: null,
      },
    } satisfies CreateSequenceEmail;
    fetchMock.mockResponseOnce(JSON.stringify(response), { status: 201 });
    const result = await kit.sequenceEmails.create(108, params);
    expectTypeOf(result).toEqualTypeOf<CreateSequenceEmail | null>();
    expectTypeOf(result!.email.content).toEqualTypeOf<string | null>();
    expectTypeOf(result!.email.preview_text).toEqualTypeOf<string | null>();
    expectTypeOf(result!.email.send_days).toEqualTypeOf<string[] | null>();
    expectTypeOf<{
      subject: string;
    }>().not.toExtend<CreateSequenceEmailParams>();
    expectTypeOf<{
      subject: string;
      delay_value: number;
      delay_unit: "weeks";
    }>().not.toExtend<CreateSequenceEmailParams>();
    expect(result).toEqual(response);
    const req = fetchMock.requests()[0]!;
    expect(req.method).toBe("POST");
    expect(req.url).toBe("https://api.kit.com/v4/sequences/108/emails");
    expect(await req.json()).toEqual(params);
  });

  it("preserves explicit publishing, position, timing, content, and schedule settings", async () => {
    const params = {
      subject: email.subject,
      preview_text: "Preview",
      content: "<p>Welcome!</p>",
      email_template_id: 2,
      published: false,
      position: 0,
      delay_value: 0,
      delay_unit: "days",
      send_days: ["monday", "wednesday"],
    } satisfies CreateSequenceEmailParams;
    const response = {
      email: { ...email, ...params },
    } satisfies CreateSequenceEmail;
    fetchMock.mockResponseOnce(JSON.stringify(response), { status: 201 });
    expect(await kit.sequenceEmails.create(108, params)).toEqual(response);
    expect(await fetchMock.requests()[0]!.json()).toEqual(params);
  });

  it("supports nullable options and hour-based emails with no sending days", async () => {
    const params = {
      subject: "Follow up",
      delay_value: 2,
      delay_unit: "hours",
      preview_text: null,
      content: null,
      email_template_id: null,
      send_days: null,
      position: null,
      published: undefined,
    } satisfies CreateSequenceEmailParams;
    const response = {
      email: { ...email, ...params, position: 1, published: false },
    } satisfies CreateSequenceEmail;
    fetchMock.mockResponseOnce(JSON.stringify(response), { status: 201 });
    expect(await kit.sequenceEmails.create(108, params)).toEqual(response);
    const body = await fetchMock.requests()[0]!.json();
    expect(body).toEqual({
      subject: "Follow up",
      delay_value: 2,
      delay_unit: "hours",
      preview_text: null,
      content: null,
      email_template_id: null,
      send_days: null,
      position: null,
    });
    expect(body).not.toHaveProperty("published");
  });

  it("returns null when the sequence does not exist", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ errors: ["Not Found"] }), {
      status: 404,
    });
    expect(
      await kit.sequenceEmails.create(404, {
        subject: "Welcome",
        delay_value: 1,
        delay_unit: "days",
      })
    ).toBeNull();
  });

  it("surfaces API validation errors", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({ errors: ["subject can't be blank"] }),
      { status: 422 }
    );
    await expect(
      kit.sequenceEmails.create(108, {
        subject: "",
        delay_value: 1,
        delay_unit: "days",
      })
    ).rejects.toThrow("subject can't be blank");
  });
});
