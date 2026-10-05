import type { GetBroadcast } from "./resources/broadcasts/types";
import type { CreateCustomField } from "./resources/custom-fields/types";
import type { ListForms } from "./resources/forms/types";
import type { PostListItem } from "./resources/posts/types";
import type { GetSequence } from "./resources/sequences/types";
import type { GetSubscriber } from "./resources/subscribers/types";
import type { Tag } from "./resources/tags/types";

export type WebhookSubscriber = Pick<
  GetSubscriber["subscriber"],
  "id" | "first_name" | "email_address" | "state" | "created_at" | "fields"
>;

export type WebhookForm = Pick<
  ListForms["forms"][number],
  "id" | "name" | "created_at" | "type" | "format" | "archived" | "uid"
>;

export type WebhookSequence = Pick<
  GetSequence["sequence"],
  | "id"
  | "name"
  | "hold"
  | "repeat"
  | "created_at"
  | "updated_at"
  | "email_template_id"
  | "active"
>;

export type WebhookCustomField = CreateCustomField["custom_field"];

/** Webhook broadcasts contain a summary; fetch the full record for content. */
export type WebhookBroadcast = Pick<
  GetBroadcast["broadcast"],
  | "id"
  | "publication_id"
  | "created_at"
  | "subject"
  | "preview_text"
  | "description"
  | "public"
  | "published_at"
  | "send_at"
  | "status"
>;

/** Webhook posts contain a summary; fetch the full record for content. */
export type WebhookPost = Pick<
  PostListItem,
  | "id"
  | "publication_id"
  | "title"
  | "slug"
  | "published_at"
  | "is_paid"
  | "public_url"
>;

/** Payloads for currently available webhook endpoint events, separate from legacy webhooks.
 * @see https://developers.kit.com/webhooks/event-types
 */
export interface WebhookEventDataMap {
  "subscriber.created": { subscriber: WebhookSubscriber };
  "subscriber.activated": { subscriber: WebhookSubscriber };
  "subscriber.unsubscribed": { subscriber: WebhookSubscriber };
  "subscriber.bounced": { subscriber: WebhookSubscriber };
  "subscriber.complained": { subscriber: WebhookSubscriber };
  "subscriber.subscribed_to_form": {
    subscriber: WebhookSubscriber;
    form: WebhookForm;
  };
  "subscriber.added_to_sequence": {
    subscriber: WebhookSubscriber;
    sequence: WebhookSequence;
  };
  "subscriber.sequence_completed": {
    subscriber: WebhookSubscriber;
    sequence: WebhookSequence;
  };
  "subscriber.tag_added": { subscriber: WebhookSubscriber; tag: Tag };
  "subscriber.tag_removed": { subscriber: WebhookSubscriber; tag: Tag };
  "subscriber.custom_field_value_updated": {
    subscriber: WebhookSubscriber;
    custom_field: WebhookCustomField & { value: string | null };
  };
  "sequence.created": { sequence: WebhookSequence };
  "sequence.deleted": { sequence: WebhookSequence };
  "sequence.published": { sequence: WebhookSequence };
  "sequence.disabled": { sequence: WebhookSequence };
  "tag.created": { tag: Tag };
  "tag.deleted": { tag: Tag };
  "broadcast.created": { broadcast: WebhookBroadcast };
  "broadcast.sent": { broadcast: WebhookBroadcast };
  "broadcast.deleted": { broadcast: WebhookBroadcast };
  "post.published": { post: WebhookPost };
  "custom_field.created": { custom_field: WebhookCustomField };
  "custom_field.deleted": { custom_field: WebhookCustomField };
}

export type WebhookEndpointEventType = keyof WebhookEventDataMap;

/** Checking type narrows data to that event's payload. These types do not validate JSON. */
export type WebhookDeliveryEvent<
  T extends WebhookEndpointEventType = WebhookEndpointEventType,
> = {
  [K in T]: {
    /** Stable event UUID; use for deduplication across retries and re-emissions. */
    id: string;
    type: K;
    /** ISO 8601 UTC time when the event occurred. */
    created: string;
    data: WebhookEventDataMap[K];
  };
}[T];

/**
 * Signed webhook endpoint delivery. Kit batches 1–100 events of one type per POST.
 * @see https://developers.kit.com/webhooks/delivery-format
 */
export interface WebhookDelivery<
  T extends WebhookEndpointEventType = WebhookEndpointEventType,
> {
  /** Identifies this POST; retries reuse it, re-emitted events may use a new ID. */
  delivery_id: number;
  /** Iterate every event. Array length and homogeneity are not enforced by these types. */
  events: WebhookDeliveryEvent<T>[];
}
