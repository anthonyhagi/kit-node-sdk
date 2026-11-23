import { beforeEach, describe, expect, expectTypeOf, it } from "vitest";
import {
  Kit,
  type BroadcastAbTest,
  type BroadcastAbTestVariant,
  type CreateBroadcastParams,
} from "~/index";

const base = {
  id: 123,
  publication_id: 123,
  created_at: "2026-01-01T12:00:00Z",
  status: "draft",
  subject: "Summer sale is here",
  preview_text: "Everything is 20% off",
  description: "Sale",
  content: "<p>Sale</p>",
  public: false,
  published_at: "2026-01-01T12:00:00Z",
  send_at: null,
  thumbnail_alt: null,
  thumbnail_url: null,
  public_url: null,
  email_address: "hello@example.com",
  email_template: { id: 2, name: "Classic" },
  subscriber_filter: [{ all: [{ type: "all_subscribers" }] }],
};

const subjectTest = {
  type: "subject",
  variants: [
    { subject: "Summer sale is here", preview_text: "Everything is 20% off" },
    { subject: "50% off today only", preview_text: null },
  ],
} satisfies BroadcastAbTest;

const contentTest = {
  type: "content",
  variants: [
    { subject: "Summer sale is here", preview_text: null },
    { subject: "Summer sale is here", preview_text: null },
  ],
} satisfies BroadcastAbTest;

const cases = [
  { name: "a subject test", fields: { ab_test: subjectTest } },
  { name: "a content test", fields: { ab_test: contentTest } },
  { name: "null", fields: { ab_test: null } },
  { name: "absent", fields: {} },
];

const createParams = {
  subject: "Summer sale is here",
  content: "<p>Sale</p>",
  description: "Sale",
  public: false,
  published_at: "2026-01-01T12:00:00Z",
  send_at: null,
  preview_text: "Everything is 20% off",
  subscriber_filter: null,
} satisfies CreateBroadcastParams;

describe("broadcast A/B test metadata through Kit", () => {
  let kit: Kit;
  beforeEach(() => {
    fetchMock.resetMocks();
    kit = new Kit({ apiKey: "test-key", maxRetries: 0 });
  });

  it("types the metadata as optional and nullable everywhere", async () => {
    fetchMock.mockResponse(
      JSON.stringify({ broadcast: base, broadcasts: [base] })
    );
    const get = await kit.broadcasts.get(123);
    const list = await kit.broadcasts.list();
    const slim = await kit.broadcasts.list({ slim: true });
    type AbTest = BroadcastAbTest | null | undefined;
    expectTypeOf(get.broadcast.ab_test).toEqualTypeOf<AbTest>();
    expectTypeOf(list.broadcasts[0]!.ab_test).toEqualTypeOf<AbTest>();
    expectTypeOf(slim.broadcasts[0]!.ab_test).toEqualTypeOf<AbTest>();
    expectTypeOf<BroadcastAbTest["type"]>().toEqualTypeOf<
      "subject" | "content" | undefined
    >();
    expectTypeOf<BroadcastAbTestVariant>().toEqualTypeOf<{
      subject?: string | undefined;
      preview_text?: string | null | undefined;
    }>();
  });

  it.each(cases)(
    "preserves $name across list, get, create and update",
    async ({ fields }) => {
      const broadcast = { ...base, ...fields };
      fetchMock.mockResponses(
        [JSON.stringify({ broadcasts: [broadcast], pagination: {} }), {}],
        [JSON.stringify({ broadcast }), {}],
        [JSON.stringify({ broadcast }), { status: 201 }],
        [JSON.stringify({ broadcast }), {}]
      );
      const results = [
        (await kit.broadcasts.list()).broadcasts[0]!,
        (await kit.broadcasts.get(123)).broadcast,
        (await kit.broadcasts.create(createParams)).broadcast,
        (await kit.broadcasts.update(123, { description: "Sale" })).broadcast,
      ];
      for (const result of results) {
        expect(result).toEqual(broadcast);
        expect("ab_test" in result).toBe("ab_test" in fields);
      }
    }
  );

  it("keeps variant order and nullable preview text", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({ broadcast: { ...base, ab_test: subjectTest } })
    );
    const { broadcast } = await kit.broadcasts.get(123);
    expect(broadcast.ab_test?.variants?.map((v) => v.subject)).toEqual([
      "Summer sale is here",
      "50% off today only",
    ]);
    expect(broadcast.ab_test?.variants?.[1]?.preview_text).toBeNull();
  });

  it("sends subject and preview text writes unchanged and has no ab_test input", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ broadcast: base }));
    await kit.broadcasts.update(123, {
      subject: "New first-variant subject",
      preview_text: "Saved, not sent on a subject test",
    });
    expect(await fetchMock.requests()[0]!.json()).toEqual({
      subject: "New first-variant subject",
      preview_text: "Saved, not sent on a subject test",
    });
    expectTypeOf<
      Parameters<Kit["broadcasts"]["update"]>[1]
    >().not.toHaveProperty("ab_test");
  });
});
