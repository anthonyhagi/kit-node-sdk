import { beforeEach, describe, expect, expectTypeOf, it } from "vitest";
import {
  ApiError,
  Kit,
  type CreateSequenceEmail,
  type GetSequenceEmail,
  type ListSequenceEmails,
  type UpdateBroadcastParams,
  type UpdateSequenceEmail,
  type UpdateSequenceEmailParams,
} from "~/index";

const email = {
  id: 6,
  sequence_id: 108,
  subject: "Welcome",
  preview_text: null,
  email_address: "hello@example.com",
  email_template_id: 3,
  published: true,
  position: 0,
  delay_value: 0,
  delay_unit: "days",
  send_days: null,
  content: "<p>Live content</p>",
};

type Target = "broadcast" | "sequence email";
const targets = ["broadcast", "sequence email"] as const;

function update(
  kit: Kit,
  target: Target,
  params: UpdateBroadcastParams & UpdateSequenceEmailParams,
  maxRetries?: number
) {
  const options = maxRetries === undefined ? undefined : { maxRetries };
  return target === "broadcast"
    ? kit.broadcasts.update(123, params, options)
    : kit.sequenceEmails.update(108, 6, params, options);
}

async function sentBody(index = 0): Promise<Record<string, unknown>> {
  return (await fetchMock.requests()[index]!.json()) as Record<string, unknown>;
}

describe("template switching updates through Kit", () => {
  let kit: Kit;
  beforeEach(() => {
    fetchMock.resetMocks();
    kit = new Kit({ apiKey: "test-key", maxRetries: 2, retryDelay: 0 });
  });

  it("accepts a minimal broadcast update with only the changed field", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ broadcast: { id: 123 } }));
    const params = { subject: "New subject" } satisfies UpdateBroadcastParams;
    await kit.broadcasts.update(123, params);
    const req = fetchMock.requests()[0]!;
    expect(req.method).toBe("PUT");
    expect(req.url).toBe("https://api.kit.com/v4/broadcasts/123");
    expect(await sentBody()).toEqual({ subject: "New subject" });
    expectTypeOf<Record<string, never>>().toExtend<UpdateBroadcastParams>();
  });

  describe.each(targets)("%s", (target) => {
    it.each([
      { name: "omitted", params: {}, expected: {} },
      {
        name: "null",
        params: { email_template_id: null },
        expected: { email_template_id: null },
      },
      {
        name: "a new id",
        params: { email_template_id: 9 },
        expected: { email_template_id: 9 },
      },
    ])("sends the template id when $name", async ({ params, expected }) => {
      fetchMock.mockResponseOnce(JSON.stringify({}));
      await update(kit, target, params);
      expect(await sentBody()).toEqual(expected);
    });

    it.each([true, false, null, undefined])(
      "serializes allow_content_loss %s as given",
      async (allow_content_loss) => {
        fetchMock.mockResponseOnce(JSON.stringify({}));
        await update(kit, target, { email_template_id: 9, allow_content_loss });
        expect(await sentBody()).toEqual({
          email_template_id: 9,
          ...(allow_content_loss !== undefined && { allow_content_loss }),
        });
      }
    );

    it.each([403, 409, 422])(
      "rejects with ApiError %s without retrying or setting the flag",
      async (status) => {
        const details = {
          errors: ["Switching templates would discard content"],
        };
        fetchMock.mockResponseOnce(JSON.stringify(details), { status });
        const result = update(kit, target, { email_template_id: 9 });
        await expect(result).rejects.toBeInstanceOf(ApiError);
        await expect(result).rejects.toMatchObject({ status, details });
        expect(fetchMock.requests()).toHaveLength(1);
        expect(await sentBody()).toEqual({ email_template_id: 9 });
      }
    );

    it("retries a 502 (nothing applied) with the same body", async () => {
      fetchMock.mockResponses(
        [JSON.stringify({ errors: ["Not applied"] }), { status: 502 }],
        [JSON.stringify({}), { status: 200 }]
      );
      const params = { email_template_id: 9, allow_content_loss: true };
      await update(kit, target, params);
      expect(fetchMock.requests()).toHaveLength(2);
      expect(await sentBody(0)).toEqual(params);
      expect(await sentBody(1)).toEqual(params);
    });

    it("honors maxRetries: 0 for a 502", async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ errors: ["Not applied"] }), {
        status: 502,
      });
      await expect(
        update(kit, target, { email_template_id: 9 }, 0)
      ).rejects.toMatchObject({ name: "ApiError", status: 502 });
      expect(fetchMock.requests()).toHaveLength(1);
    });
  });
});

describe("sequence email draft state through Kit", () => {
  let kit: Kit;
  beforeEach(() => {
    fetchMock.resetMocks();
    kit = new Kit({ apiKey: "test-key", maxRetries: 0 });
  });

  const states = [
    { name: "true", fields: { has_unpublished_changes: true } },
    { name: "false", fields: { has_unpublished_changes: false } },
    { name: "absent", fields: {} },
  ];

  it.each(states)("exposes $name draft state from get", async ({ fields }) => {
    const response = {
      email: { ...email, ...fields },
    } satisfies GetSequenceEmail;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    const result = await kit.sequenceEmails.get(108, 6);
    expectTypeOf(result.email.has_unpublished_changes).toEqualTypeOf<
      boolean | undefined
    >();
    expect(result.email.has_unpublished_changes).toBe(
      fields.has_unpublished_changes
    );
  });

  it.each(states)("exposes $name draft state from list", async ({ fields }) => {
    const { content: _content, ...item } = email;
    const response = {
      emails: [{ ...item, ...fields }],
      pagination: {
        has_previous_page: false,
        has_next_page: false,
        start_cursor: null,
        end_cursor: null,
        per_page: 25,
      },
    } satisfies ListSequenceEmails;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    const result = await kit.sequenceEmails.list(108);
    expectTypeOf(result.emails[0]!.has_unpublished_changes).toEqualTypeOf<
      boolean | undefined
    >();
    expect(result.emails[0]!.has_unpublished_changes).toBe(
      fields.has_unpublished_changes
    );
  });

  it.each(states)(
    "exposes $name draft state from create and update",
    async ({ fields }) => {
      const written = { ...email, ...fields, position: null };
      fetchMock.mockResponses(
        [
          JSON.stringify({ email: written } satisfies CreateSequenceEmail),
          { status: 201 },
        ],
        [JSON.stringify({ email: written } satisfies UpdateSequenceEmail), {}]
      );
      const created = await kit.sequenceEmails.create(108, {
        subject: "Welcome",
        delay_value: 0,
        delay_unit: "days",
      });
      const updated = await kit.sequenceEmails.update(108, 6, {
        content: "<p>Draft content</p>",
      });
      expect(created.email.has_unpublished_changes).toBe(
        fields.has_unpublished_changes
      );
      expect(updated.email.has_unpublished_changes).toBe(
        fields.has_unpublished_changes
      );
      expect(await sentBody(1)).toEqual({ content: "<p>Draft content</p>" });
    }
  );

  it("publishes pending changes only when published: true is sent", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ email }));
    await kit.sequenceEmails.update(108, 6, { content: "<p>Draft</p>" });
    expect(await sentBody()).not.toHaveProperty("published");
  });
});
