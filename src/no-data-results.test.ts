import { beforeEach, describe, expect, expectTypeOf, it } from "vitest";
import { Kit } from "./index";

const operations = [
  { name: "broadcasts.delete", run: (kit: Kit) => kit.broadcasts.delete(1) },
  {
    name: "customFields.delete",
    run: (kit: Kit) => kit.customFields.delete(1),
  },
  {
    name: "sequenceEmails.delete",
    run: (kit: Kit) => kit.sequenceEmails.delete(1, 2),
  },
  { name: "sequences.delete", run: (kit: Kit) => kit.sequences.delete(1) },
  {
    name: "subscribers.unsubscribe",
    run: (kit: Kit) => kit.subscribers.unsubscribe(1),
  },
  {
    name: "subscribers.deleteLocation",
    run: (kit: Kit) => kit.subscribers.deleteLocation(1),
  },
  {
    name: "tags.removeSubscriber",
    run: (kit: Kit) => kit.tags.removeSubscriber(1, 2),
  },
  {
    name: "tags.removeSubscriberByEmail",
    run: (kit: Kit) =>
      kit.tags.removeSubscriberByEmail(1, { email_address: "ada@example.com" }),
  },
  {
    name: "webhookEndpoints.delete",
    run: (kit: Kit) => kit.webhookEndpoints.delete(1),
  },
  { name: "webhooks.delete", run: (kit: Kit) => kit.webhooks.delete(1) },
] as const;

describe.each(operations)("$name no-data result", ({ run }) => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  it.each(["204", "empty", "JSON"])(
    "resolves to undefined for %s success",
    async (body) => {
      const response =
        body === "204"
          ? new Response(null, { status: 204 })
          : new Response(body === "JSON" ? "{}" : "", { status: 200 });
      fetchMock.mockResolvedValueOnce(response);
      const result = run(new Kit({ apiKey: "test", maxRetries: 0 }));
      expectTypeOf(result).toEqualTypeOf<Promise<void>>();
      await expect(result).resolves.toBeUndefined();
      expect(fetchMock.requests()).toHaveLength(1);
    }
  );

  it("still rejects a missing resource", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ errors: ["Not Found"] }), {
      status: 404,
    });
    await expect(
      run(new Kit({ apiKey: "test", maxRetries: 3, retryDelay: 0 }))
    ).rejects.toMatchObject({ name: "ApiError", status: 404 });
    expect(fetchMock.requests()).toHaveLength(1);
  });
});
