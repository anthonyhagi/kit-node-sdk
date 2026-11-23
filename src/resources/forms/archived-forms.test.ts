import { beforeEach, describe, expect, it } from "vitest";
import { ApiError, Kit, type BulkAddSubscribersCallback } from "~/index";

describe("archived form subscriptions through Kit", () => {
  let kit: Kit;
  beforeEach(() => {
    fetchMock.resetMocks();
    kit = new Kit({ apiKey: "test-key", maxRetries: 3, retryDelay: 0 });
  });

  const singleAdds = [
    {
      name: "addSubscriber",
      run: (k: Kit) => k.forms.addSubscriber(7, 42),
      path: "/v4/forms/7/subscribers/42",
    },
    {
      name: "addSubscriberByEmail",
      run: (k: Kit) =>
        k.forms.addSubscriberByEmail(7, { email_address: "ada@example.com" }),
      path: "/v4/forms/7/subscribers",
    },
  ];

  describe.each(singleAdds)("$name", ({ run, path }) => {
    it.each([
      { case: "an archived form", errors: ["Form is archived"] },
      {
        case: "a subscriber already on an archived form",
        errors: ["Subscriber could not be added to this form"],
      },
    ])("throws 422 with details and no retry for $case", async ({ errors }) => {
      fetchMock.mockResponseOnce(JSON.stringify({ errors }), {
        status: 422,
      });
      const result = run(kit);
      await expect(result).rejects.toBeInstanceOf(ApiError);
      await expect(result).rejects.toMatchObject({
        status: 422,
        details: { errors },
      });
      expect(fetchMock.requests()).toHaveLength(1);
      expect(new URL(fetchMock.requests()[0]!.url).pathname).toBe(path);
    });
  });

  const failure = {
    errors: ["Form does not exist"],
    subscription: { form_id: 7, subscriber_id: 43, referrer: "" },
  };

  it("reports archived-form additions as failures in a successful bulk response", async () => {
    const subscriber = {
      id: 42,
      first_name: null,
      email_address: "ada@example.com",
      created_at: "2026-01-01T00:00:00Z",
      added_at: "2026-01-01T00:00:00Z",
      referrer: null,
      referrer_utm_parameters: null,
    };
    fetchMock.mockResponseOnce(
      JSON.stringify({ subscribers: [subscriber], failures: [failure] })
    );
    const result = await kit.forms.bulkAddSubscribers({
      additions: [
        { form_id: 6, subscriber_id: 42 },
        { form_id: 7, subscriber_id: 43 },
      ],
    });
    expect(result.type).toBe("synchronous");
    if (result.type !== "synchronous") throw new Error("expected synchronous");
    expect(result.subscribers).toHaveLength(1);
    expect(result.failures).toEqual([failure]);
    expect(fetchMock.requests()).toHaveLength(1);
  });

  it("acknowledges large bulk adds without per-addition results", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({}));
    const result = await kit.forms.bulkAddSubscribers({
      additions: [{ form_id: 7, subscriber_id: 43 }],
      callback_url: "https://example.com/kit-callback",
    });
    expect(result).toEqual({ type: "asynchronous" });
    expect(result).not.toHaveProperty("failures");
  });

  it("types callback payloads that carry archived-form failures", () => {
    const callback = {
      subscribers: [],
      failures: [failure],
    } satisfies BulkAddSubscribersCallback;
    expect(callback.failures[0]!.errors).toEqual(["Form does not exist"]);
  });
});
