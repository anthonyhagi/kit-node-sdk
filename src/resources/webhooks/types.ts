export interface ListWebhooksParams {
  /**
   * Pass in the string from the previous request to move
   * the cursor. This can be found in the following field:
   *
   * @example after: pagination.end_cursor
   */
  after?: string | undefined;

  /**
   * Pass in the string from the previous request to move
   * the cursor. This can be found in the following field:
   *
   * @example after: pagination.start_cursor
   */
  before?: string | undefined;

  /**
   * To include the total count of records in the response,
   * use `true`. For large collections, expect a slightly
   * slower response.
   *
   * @example includeTotalCount: true
   */
  includeTotalCount?: boolean | undefined;

  /**
   * Number of results per page. Default 500, maximum 1000.
   *
   * @example perPage: 500
   */
  perPage?: number | undefined;
}

export interface ListWebhooks {
  webhooks: {
    id: number;
    account_id: number;
    event: {
      name: string;
      tag_id?: number | undefined;
      form_id?: number | undefined;
      sequence_id?: number | undefined;
      product_id?: number | undefined;
      initiator_value?: number | undefined;
    };
    target_url: string;
  }[];
  pagination: {
    has_previous_page: boolean;
    has_next_page: boolean;
    start_cursor: string | null;
    end_cursor: string | null;
    per_page: number;
  };
}

export type WebhookEvent =
  | {
      name: "subscriber.subscriber_activate";
      form_id?: null | undefined;
      sequence_id?: null | undefined;
      initiator_value?: null | undefined;
      product_id?: null | undefined;
      tag_id?: null | undefined;
    }
  | {
      name: "subscriber.subscriber_unsubscribe";
      form_id?: null | undefined;
      sequence_id?: null | undefined;
      initiator_value?: null | undefined;
      product_id?: null | undefined;
      tag_id?: null | undefined;
    }
  | {
      name: "subscriber.subscriber_bounce";
      form_id?: null | undefined;
      sequence_id?: null | undefined;
      initiator_value?: null | undefined;
      product_id?: null | undefined;
      tag_id?: null | undefined;
    }
  | {
      name: "subscriber.subscriber_complain";
      form_id?: null | undefined;
      sequence_id?: null | undefined;
      initiator_value?: null | undefined;
      product_id?: null | undefined;
      tag_id?: null | undefined;
    }
  | {
      name: "subscriber.form_subscribe";
      form_id: number;
      sequence_id?: null | undefined;
      initiator_value?: null | undefined;
      product_id?: null | undefined;
      tag_id?: null | undefined;
    }
  | {
      name: "subscriber.course_subscribe";
      form_id?: null | undefined;
      sequence_id: number;
      initiator_value?: null | undefined;
      product_id?: null | undefined;
      tag_id?: null | undefined;
    }
  | {
      name: "subscriber.course_complete";
      form_id?: null | undefined;
      sequence_id: number;
      initiator_value?: null | undefined;
      product_id?: null | undefined;
      tag_id?: null | undefined;
    }
  | {
      name: "subscriber.link_click";
      form_id?: null | undefined;
      sequence_id?: null | undefined;
      initiator_value: string;
      product_id?: null | undefined;
      tag_id?: null | undefined;
    }
  | {
      name: "subscriber.product_purchase";
      form_id?: null | undefined;
      sequence_id?: null | undefined;
      initiator_value?: null | undefined;
      product_id: number;
      tag_id?: null | undefined;
    }
  | {
      name: "subscriber.tag_add";
      form_id?: null | undefined;
      sequence_id?: null | undefined;
      initiator_value?: null | undefined;
      product_id?: null | undefined;
      tag_id: number;
    }
  | {
      name: "subscriber.tag_remove";
      form_id?: null | undefined;
      sequence_id?: null | undefined;
      initiator_value?: null | undefined;
      product_id?: null | undefined;
      tag_id: number;
    }
  | {
      name: "purchase.purchase_create";
      form_id?: null | undefined;
      sequence_id?: null | undefined;
      initiator_value?: null | undefined;
      product_id?: null | undefined;
      tag_id?: null | undefined;
    }
  | {
      name: string & {};
      form_id?: number | null | undefined;
      sequence_id?: number | null | undefined;
      initiator_value?: string | null | undefined;
      product_id?: number | null | undefined;
      tag_id?: number | null | undefined;
    };

export interface CreateWebhookParams {
  target_url: string;
  event: WebhookEvent;
}

export interface CreateWebhook {
  webhook: {
    id: number;
    account_id: number;
    event: {
      name: string;
      initiator_value: string | null;
    };
    target_url: string;
  };
}

export interface DeleteWebhook {}
