import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  WebhookBroadcast,
  WebhookCustomField,
  WebhookDelivery,
  WebhookDeliveryEvent,
  WebhookEndpointEventType,
  WebhookEventDataMap,
  WebhookForm,
  WebhookPost,
  WebhookSequence,
  WebhookSubscriber,
} from "~/index";

const subscriber = {
  id: 7,
  first_name: null,
  email_address: "ada@example.com",
  state: "active",
  created_at: "2026-07-29T14:32:10Z",
  fields: { company: "Kit", empty: null },
} satisfies WebhookSubscriber;
const form = {
  id: 55,
  name: "Newsletter",
  created_at: subscriber.created_at,
  type: "embed",
  format: null,
  archived: false,
  uid: "abc123",
} satisfies WebhookForm;
const sequence = {
  id: 77,
  name: "Welcome",
  hold: false,
  repeat: false,
  created_at: subscriber.created_at,
  updated_at: subscriber.created_at,
  email_template_id: null,
  active: true,
} satisfies WebhookSequence;
const tag = { id: 42, name: "customer", created_at: subscriber.created_at };
const customField = {
  id: 9,
  name: "ck_field_9_company",
  key: "company",
  label: "Company",
} satisfies WebhookCustomField;
const broadcast = {
  id: 5001,
  publication_id: 12,
  created_at: subscriber.created_at,
  subject: "Hello",
  preview_text: null,
  description: null,
  public: false,
  published_at: null,
  send_at: null,
  status: "draft",
} satisfies WebhookBroadcast;
const post = {
  id: 8801,
  publication_id: 12,
  title: "Hello",
  slug: "hello",
  published_at: subscriber.created_at,
  is_paid: false,
  public_url: "https://example.kit.com/posts/hello",
} satisfies WebhookPost;
const metadata = {
  id: "9c2e1f3a-6b7d-4e8f-a1b2-c3d4e5f60718",
  created: subscriber.created_at,
};

function resourceId(event: WebhookDeliveryEvent): number {
  switch (event.type) {
    case "subscriber.created":
    case "subscriber.activated":
    case "subscriber.unsubscribed":
    case "subscriber.bounced":
    case "subscriber.complained":
      expectTypeOf(event.data).toEqualTypeOf<{
        subscriber: WebhookSubscriber;
      }>();
      return event.data.subscriber.id;
    case "subscriber.subscribed_to_form":
      expectTypeOf(event.data.form).toEqualTypeOf<WebhookForm>();
      expectTypeOf(event.data.subscriber).toEqualTypeOf<WebhookSubscriber>();
      return event.data.form.id;
    case "subscriber.added_to_sequence":
    case "subscriber.sequence_completed":
      expectTypeOf(event.data.sequence).toEqualTypeOf<WebhookSequence>();
      return event.data.sequence.id;
    case "subscriber.tag_added":
    case "subscriber.tag_removed":
      expectTypeOf(event.data.tag).toEqualTypeOf<typeof tag>();
      return event.data.tag.id;
    case "subscriber.custom_field_value_updated":
      expectTypeOf(event.data.custom_field.value).toEqualTypeOf<
        string | null
      >();
      return event.data.custom_field.id;
    case "sequence.created":
    case "sequence.deleted":
    case "sequence.published":
    case "sequence.disabled":
      expectTypeOf(event.data).toEqualTypeOf<{ sequence: WebhookSequence }>();
      return event.data.sequence.id;
    case "tag.created":
    case "tag.deleted":
      expectTypeOf(event.data).toEqualTypeOf<{ tag: typeof tag }>();
      return event.data.tag.id;
    case "broadcast.created":
    case "broadcast.sent":
    case "broadcast.deleted":
      expectTypeOf(event.data.broadcast).toEqualTypeOf<WebhookBroadcast>();
      return event.data.broadcast.id;
    case "post.published":
      expectTypeOf(event.data.post).toEqualTypeOf<WebhookPost>();
      return event.data.post.id;
    case "custom_field.created":
    case "custom_field.deleted":
      expectTypeOf(event.data).toEqualTypeOf<{
        custom_field: WebhookCustomField;
      }>();
      return event.data.custom_field.id;
    default:
      expectTypeOf(event).toEqualTypeOf<never>();
      throw new Error("Unhandled event");
  }
}

const events = [
  { ...metadata, type: "subscriber.created", data: { subscriber } },
  { ...metadata, type: "subscriber.activated", data: { subscriber } },
  { ...metadata, type: "subscriber.unsubscribed", data: { subscriber } },
  { ...metadata, type: "subscriber.bounced", data: { subscriber } },
  { ...metadata, type: "subscriber.complained", data: { subscriber } },
  {
    ...metadata,
    type: "subscriber.subscribed_to_form",
    data: { subscriber, form },
  },
  {
    ...metadata,
    type: "subscriber.added_to_sequence",
    data: { subscriber, sequence },
  },
  {
    ...metadata,
    type: "subscriber.sequence_completed",
    data: { subscriber, sequence },
  },
  { ...metadata, type: "subscriber.tag_added", data: { subscriber, tag } },
  { ...metadata, type: "subscriber.tag_removed", data: { subscriber, tag } },
  {
    ...metadata,
    type: "subscriber.custom_field_value_updated",
    data: { subscriber, custom_field: { ...customField, value: null } },
  },
  { ...metadata, type: "sequence.created", data: { sequence } },
  { ...metadata, type: "sequence.deleted", data: { sequence } },
  { ...metadata, type: "sequence.published", data: { sequence } },
  { ...metadata, type: "sequence.disabled", data: { sequence } },
  { ...metadata, type: "tag.created", data: { tag } },
  { ...metadata, type: "tag.deleted", data: { tag } },
  { ...metadata, type: "broadcast.created", data: { broadcast } },
  { ...metadata, type: "broadcast.sent", data: { broadcast } },
  { ...metadata, type: "broadcast.deleted", data: { broadcast } },
  { ...metadata, type: "post.published", data: { post } },
  {
    ...metadata,
    type: "custom_field.created",
    data: { custom_field: customField },
  },
  {
    ...metadata,
    type: "custom_field.deleted",
    data: { custom_field: customField },
  },
] satisfies WebhookDelivery["events"];

describe("webhook delivery types", () => {
  it("models every available event and narrows its payload", () => {
    expectTypeOf<
      (typeof events)[number]["type"]
    >().toEqualTypeOf<WebhookEndpointEventType>();
    expectTypeOf<WebhookDeliveryEvent["type"]>().toEqualTypeOf<
      keyof WebhookEventDataMap
    >();
    expect(events).toHaveLength(23);
    for (const event of events) {
      expect(resourceId(event)).toBeGreaterThan(0);
    }
  });

  it("accepts batched deliveries and exposes envelope metadata", () => {
    const event = {
      ...metadata,
      type: "subscriber.created",
      data: { subscriber },
    } satisfies WebhookDeliveryEvent;
    const delivery: WebhookDelivery = {
      delivery_id: 123456,
      events: [event, { ...event, id: "another-uuid" }],
    };
    expectTypeOf(delivery.delivery_id).toEqualTypeOf<number>();
    expectTypeOf(delivery.events).toEqualTypeOf<WebhookDeliveryEvent[]>();
    expect(delivery.events.map((item) => item.id)).toEqual([
      metadata.id,
      "another-uuid",
    ]);
  });

  it("supports endpoints subscribing to a specific event or subset", () => {
    const event: WebhookDeliveryEvent<"subscriber.tag_added"> = {
      ...metadata,
      type: "subscriber.tag_added",
      data: { subscriber, tag },
    };
    const delivery: WebhookDelivery<"subscriber.tag_added"> = {
      delivery_id: 1,
      events: [event],
    };
    expectTypeOf(delivery.events[0]!.data.tag.id).toEqualTypeOf<number>();
    expectTypeOf<
      WebhookDeliveryEvent<"tag.created" | "tag.deleted">["type"]
    >().toEqualTypeOf<"tag.created" | "tag.deleted">();
    expect(delivery.events).toHaveLength(1);
  });

  it("excludes planned names and mismatched payloads", () => {
    expectTypeOf<
      | "subscriber.product_purchased"
      | "subscriber.link_clicked"
      | "subscriber.email_opened"
      | "landing_page.created"
      | "landing_page.deleted"
    >().not.toExtend<WebhookEndpointEventType>();
    expectTypeOf<{
      id: string;
      type: "subscriber.tag_added";
      created: string;
      data: { subscriber: WebhookSubscriber };
    }>().not.toExtend<WebhookDeliveryEvent>();
    expectTypeOf<{
      id: string;
      type: "tag.deleted";
      created: string;
      data: { sequence: WebhookSequence };
    }>().not.toExtend<WebhookDeliveryEvent>();
    expectTypeOf<
      keyof WebhookEventDataMap["tag.deleted"]
    >().toEqualTypeOf<"tag">();
  });

  it("models summary payloads without requiring full API records", () => {
    expectTypeOf<keyof WebhookBroadcast>()
      .extract<"content" | "subscriber_filter">()
      .toEqualTypeOf<never>();
    expectTypeOf<keyof WebhookPost>()
      .extract<"content" | "description">()
      .toEqualTypeOf<never>();
    expectTypeOf<WebhookSubscriber["first_name"]>().toEqualTypeOf<
      string | null
    >();
    expectTypeOf<WebhookSubscriber["fields"]>().toEqualTypeOf<
      Record<string, string | null>
    >();
    expect(broadcast.send_at).toBeNull();
    expect(sequence.email_template_id).toBeNull();
  });
});
