import { beforeEach, describe, expect, expectTypeOf, it } from "vitest";
import {
  Kit,
  type ListSequenceEmails,
  type ListSequenceEmailsParams,
  type ListSequenceEmailsWithContent,
} from "~/index";

const metadata = {
  id: 6,
  sequence_id: 108,
  subject: "Welcome",
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
  per_page: 500,
};

describe("sequence email list response inference", () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  it.each([null, "", "<p>Email HTML</p>"])(
    "requires HTML content when requested, including %j",
    async (content) => {
      const response = {
        emails: [
          {
            ...metadata,
            content,
          },
        ],
        pagination,
      } satisfies ListSequenceEmailsWithContent;
      fetchMock.mockResponseOnce(JSON.stringify(response));
      const kit = new Kit({ apiKey: "test", maxRetries: 0 });
      const controller = new AbortController();
      const result = await kit.sequenceEmails.list(
        108,
        { include_content: true, after: null, per_page: 25 },
        { signal: controller.signal }
      );
      expectTypeOf(result).toEqualTypeOf<ListSequenceEmailsWithContent>();
      expectTypeOf(result).toExtend<ListSequenceEmails>();
      expectTypeOf<
        NonNullable<typeof result>["emails"][number]["content"]
      >().toEqualTypeOf<string | null>();
      expect(result).toEqual(response);
      expect(
        Object.fromEntries(new URL(fetchMock.requests()[0]!.url).searchParams)
      ).toEqual({
        include_content: "true",
        per_page: "25",
      });
      expect(fetchMock.mock.calls[0]![1]?.signal).toBe(controller.signal);
      expectTypeOf<{
        emails: (typeof metadata)[];
        pagination: typeof pagination;
      }>().not.toExtend<ListSequenceEmailsWithContent>();
    }
  );

  it.each([
    undefined,
    {},
    { include_content: false },
    { include_content: null },
    { include_content: undefined },
  ] as const)(
    "preserves the existing metadata response type for %j",
    async (params) => {
      const response = {
        emails: [metadata],
        pagination,
      } satisfies ListSequenceEmails;
      fetchMock.mockResponseOnce(JSON.stringify(response));
      const kit = new Kit({ apiKey: "test", maxRetries: 0 });
      const result = await kit.sequenceEmails.list(108, params);
      expectTypeOf(result).toEqualTypeOf<ListSequenceEmails>();
      expectTypeOf<
        NonNullable<typeof result>["emails"][number]["content"]
      >().toEqualTypeOf<string | null | undefined>();
      expect(result).toEqual(response);
      expect(result!.emails[0]).not.toHaveProperty("content");
    }
  );

  it.each([true, false, null])(
    "keeps broad parameters safe with include_content: %s",
    async (include_content) => {
      const params: ListSequenceEmailsParams = { include_content };
      fetchMock.mockResponseOnce(JSON.stringify({ emails: [], pagination }));
      const kit = new Kit({ apiKey: "test", maxRetries: 0 });
      const result = await kit.sequenceEmails.list(108, params);
      expectTypeOf(result).toEqualTypeOf<
        ListSequenceEmails | ListSequenceEmailsWithContent
      >();
      expectTypeOf(result).toExtend<ListSequenceEmails>();
      expectTypeOf<
        NonNullable<typeof result>["emails"][number]["content"]
      >().toEqualTypeOf<string | null | undefined>();
      expect(result!.emails).toEqual([]);
    }
  );
  it("throws for missing sequences when content is requested", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ errors: ["Not Found"] }), {
      status: 404,
    });
    const kit = new Kit({ apiKey: "test", maxRetries: 0 });
    const result = kit.sequenceEmails.list(404, {
      include_content: true,
    });
    expectTypeOf(result).toEqualTypeOf<
      Promise<ListSequenceEmailsWithContent>
    >();
    await expect(result).rejects.toMatchObject({
      name: "ApiError",
      status: 404,
    });
  });
});
