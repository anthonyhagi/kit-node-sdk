import type { Pagination, PaginationParams } from "~/common/types";

export interface ListWebhooksParams extends PaginationParams {}

/** Event configuration returned by legacy webhook lists. */
export interface WebhookEventResponse {
  name: string;
  tag_id?: number | null | undefined;
  form_id?: number | null | undefined;
  sequence_id?: number | undefined;
  product_id?: number | undefined;
  /** Link URL for link-click subscriptions, otherwise null or omitted. */
  initiator_value?: string | null | undefined;
}

/** Legacy webhook subscription returned by webhook lists. */
export interface Webhook {
  id: number;
  account_id: number;
  event: WebhookEventResponse;
  target_url: string;
}

export interface ListWebhooks {
  webhooks: Webhook[];
  pagination: Pagination;
}

export type WebhookEvent =
  | {
      name: "subscriber.subscriber_activate";
      form_id?: null | undefined;
      sequence_id?: null | undefined;
      initiator_value?: null | undefined;
      product_id?: null | undefined;
      tag_id?: null | undefined;
      custom_field_id?: null | undefined;
    }
  | {
      name: "subscriber.subscriber_unsubscribe";
      form_id?: null | undefined;
      sequence_id?: null | undefined;
      initiator_value?: null | undefined;
      product_id?: null | undefined;
      tag_id?: null | undefined;
      custom_field_id?: null | undefined;
    }
  | {
      name: "subscriber.subscriber_bounce";
      form_id?: null | undefined;
      sequence_id?: null | undefined;
      initiator_value?: null | undefined;
      product_id?: null | undefined;
      tag_id?: null | undefined;
      custom_field_id?: null | undefined;
    }
  | {
      name: "subscriber.subscriber_complain";
      form_id?: null | undefined;
      sequence_id?: null | undefined;
      initiator_value?: null | undefined;
      product_id?: null | undefined;
      tag_id?: null | undefined;
      custom_field_id?: null | undefined;
    }
  | {
      name: "subscriber.form_subscribe";
      form_id: number;
      sequence_id?: null | undefined;
      initiator_value?: null | undefined;
      product_id?: null | undefined;
      tag_id?: null | undefined;
      custom_field_id?: null | undefined;
    }
  | {
      name: "subscriber.course_subscribe";
      form_id?: null | undefined;
      sequence_id: number;
      initiator_value?: null | undefined;
      product_id?: null | undefined;
      tag_id?: null | undefined;
      custom_field_id?: null | undefined;
    }
  | {
      name: "subscriber.course_complete";
      form_id?: null | undefined;
      sequence_id: number;
      initiator_value?: null | undefined;
      product_id?: null | undefined;
      tag_id?: null | undefined;
      custom_field_id?: null | undefined;
    }
  | {
      name: "subscriber.link_click";
      form_id?: null | undefined;
      sequence_id?: null | undefined;
      initiator_value: string;
      product_id?: null | undefined;
      tag_id?: null | undefined;
      custom_field_id?: null | undefined;
    }
  | {
      name: "subscriber.product_purchase";
      form_id?: null | undefined;
      sequence_id?: null | undefined;
      initiator_value?: null | undefined;
      product_id: number;
      tag_id?: null | undefined;
      custom_field_id?: null | undefined;
    }
  | {
      name: "subscriber.tag_add";
      form_id?: null | undefined;
      sequence_id?: null | undefined;
      initiator_value?: null | undefined;
      product_id?: null | undefined;
      tag_id: number;
      custom_field_id?: null | undefined;
    }
  | {
      name: "subscriber.tag_remove";
      form_id?: null | undefined;
      sequence_id?: null | undefined;
      initiator_value?: null | undefined;
      product_id?: null | undefined;
      tag_id: number;
      custom_field_id?: null | undefined;
    }
  | {
      name: "purchase.purchase_create";
      form_id?: null | undefined;
      sequence_id?: null | undefined;
      initiator_value?: null | undefined;
      product_id?: null | undefined;
      tag_id?: null | undefined;
      custom_field_id?: null | undefined;
    }
  | {
      name: "custom_field.field_created" | "custom_field.field_deleted";
      form_id?: null | undefined;
      sequence_id?: null | undefined;
      initiator_value?: null | undefined;
      product_id?: null | undefined;
      tag_id?: null | undefined;
      custom_field_id?: null | undefined;
    }
  | {
      name: "custom_field.field_value_updated";
      form_id?: null | undefined;
      sequence_id?: null | undefined;
      initiator_value?: null | undefined;
      product_id?: null | undefined;
      tag_id?: null | undefined;
      /** ID of the custom field whose value changes trigger this webhook. */
      custom_field_id: number;
    }
  | {
      name: string & {};
      form_id?: number | null | undefined;
      sequence_id?: number | null | undefined;
      initiator_value?: string | null | undefined;
      product_id?: number | null | undefined;
      tag_id?: number | null | undefined;
      custom_field_id?: number | null | undefined;
    };

export interface CreateWebhookParams {
  target_url: string;
  event: WebhookEvent;
}

export interface CreateWebhook {
  webhook: Omit<Webhook, "event"> & {
    event: Pick<WebhookEventResponse, "name"> & {
      /** Creation always includes this field, even when no link URL applies. */
      initiator_value: string | null;
    };
  };
}
