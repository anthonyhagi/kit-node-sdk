import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  BulkAddSubscribersCallback,
  BulkCreateCallback,
  BulkCreateSubscribersCallback,
  BulkCreateTagsCallback,
  BulkDeleteTagsCallback,
  BulkRemoveTagsCallback,
  BulkTagCallback,
  BulkUpdateSubscriberValuesCallback,
} from "~/index";

// Kit posts completed synchronous response bodies to callback_url, without
// the discriminator that the SDK adds to direct bulk method return values.
const callbacks = {
  subscribers: { subscribers: [], failures: [] },
  forms: { subscribers: [], failures: [] },
  customFields: { custom_fields: [], failures: [] },
  customFieldValues: { custom_field_values: [], failures: [] },
  createTags: { tags: [], failures: [] },
  deleteTags: { failures: [] },
  removeTags: { failures: [] },
  tagSubscribers: { subscribers: [], failures: [] },
} satisfies {
  subscribers: BulkCreateSubscribersCallback;
  forms: BulkAddSubscribersCallback;
  customFields: BulkCreateCallback;
  customFieldValues: BulkUpdateSubscriberValuesCallback;
  createTags: BulkCreateTagsCallback;
  deleteTags: BulkDeleteTagsCallback;
  removeTags: BulkRemoveTagsCallback;
  tagSubscribers: BulkTagCallback;
};

describe("bulk callback payload types", () => {
  it("accepts completed results through public exports without a discriminator", () => {
    for (const callback of Object.values(callbacks)) {
      expect(callback.failures).toEqual([]);
      expect(callback).not.toHaveProperty("type");
    }
    expectTypeOf<keyof BulkCreateSubscribersCallback>().toEqualTypeOf<
      "subscribers" | "failures"
    >();
    expectTypeOf<keyof BulkAddSubscribersCallback>().toEqualTypeOf<
      "subscribers" | "failures"
    >();
    expectTypeOf<keyof BulkCreateCallback>().toEqualTypeOf<
      "custom_fields" | "failures"
    >();
    expectTypeOf<keyof BulkUpdateSubscriberValuesCallback>().toEqualTypeOf<
      "custom_field_values" | "failures"
    >();
    expectTypeOf<keyof BulkCreateTagsCallback>().toEqualTypeOf<
      "tags" | "failures"
    >();
    expectTypeOf<keyof BulkDeleteTagsCallback>().toEqualTypeOf<"failures">();
    expectTypeOf<keyof BulkRemoveTagsCallback>().toEqualTypeOf<"failures">();
    expectTypeOf<keyof BulkTagCallback>().toEqualTypeOf<
      "subscribers" | "failures"
    >();
  });

  it("requires completion results rather than an asynchronous acknowledgement", () => {
    expectTypeOf<{}>().not.toExtend<BulkCreateSubscribersCallback>();
    expectTypeOf<{}>().not.toExtend<BulkAddSubscribersCallback>();
    expectTypeOf<{}>().not.toExtend<BulkCreateCallback>();
    expectTypeOf<{}>().not.toExtend<BulkUpdateSubscriberValuesCallback>();
    expectTypeOf<{}>().not.toExtend<BulkCreateTagsCallback>();
    expectTypeOf<{}>().not.toExtend<BulkDeleteTagsCallback>();
    expectTypeOf<{}>().not.toExtend<BulkRemoveTagsCallback>();
    expectTypeOf<{}>().not.toExtend<BulkTagCallback>();
    expect(Object.values(callbacks)).toHaveLength(8);
  });

  it("exposes successful subscribers and per-item failures in the same callback", () => {
    const callback: BulkCreateSubscribersCallback = {
      subscribers: [
        {
          id: 42,
          first_name: null,
          email_address: "ada@example.com",
          state: "active",
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
      failures: [
        {
          subscriber: {
            first_name: null,
            email_address: null,
            state: null,
            created_at: null,
          },
          errors: ["Email address is required"],
        },
      ],
    };
    expectTypeOf(callback.subscribers[0]!.id).toEqualTypeOf<number>();
    expectTypeOf(callback.failures[0]!.errors).toEqualTypeOf<string[]>();
    expect(callback.subscribers).toHaveLength(1);
    expect(callback.failures[0]!.subscriber.email_address).toBeNull();
  });
});
