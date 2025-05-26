export interface BulkAddSubscribersParams {
  additions: {
    form_id: number;
    subscriber_id: number;
    referrer?: string | undefined;
  }[];
  callback_url: string | null;
}

export interface BulkAddSubscribersAsynchronous {
  type: "asynchronous";
}

export interface BulkAddSubscribersSynchronous {
  type: "synchronous";
  subscribers: {
    id: number;
    first_name: string;
    email_address: string;
    created_at: string;
    added_at: string;
    referrer_utm_parameters?:
      | {
          source: string;
          medium: string;
          campaign: string;
          term: string;
          content: string;
        }
      | undefined;
    referrer?: string | undefined;
  }[];
  failures: {
    errors: string[];
    subscription: {
      form_id: number;
      subscriber_id: number | null;
      referrer: string;
    };
  }[];
}

export type BulkAddSubscribers =
  | BulkAddSubscribersSynchronous
  | BulkAddSubscribersAsynchronous;
export type BulkAddSubscribersWithoutResponseType =
  | Omit<BulkAddSubscribersSynchronous, "type">
  | Omit<BulkAddSubscribersAsynchronous, "type">;

export interface ListFormsParams {
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

  /**
   * Filter by a specific status. This defaults to "active" on
   * the remote API.
   */
  status?:
    | "active"
    | "archived"
    | "trashed"
    | "all"
    | (string & {})
    | undefined;

  /**
   * Filter forms and landing pages by type. Use "embed" for embedded
   * forms. Use "hosted" for landing pages.
   */
  type?: "embed" | "hosted" | (string & {}) | undefined;
}

export interface ListForms {
  forms: {
    id: number;
    name: string;
    created_at: string;
    type: string;
    format: string | null;
    embed_js: string;
    embed_url: string;
    archived: boolean;
    uid: string;
  }[];
  pagination: {
    has_previous_page: boolean;
    has_next_page: boolean;
    start_cursor: string | null;
    end_cursor: string | null;
    per_page: number;
  };
}

export interface ListSubscribersParams {
  /**
   * Filter subscribers who have been added to the form after this
   * date (format yyyy-mm-dd).
   */
  addedAfter?: Date | string | undefined;

  /**
   * Filter subscribers who have been added to the form before this
   * date (format yyyy-mm-dd).
   */
  addedBefore?: Date | string | undefined;

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
   * Filter subscribers who have been created after this date
   * (format yyyy-mm-dd).
   */
  createdAfter?: Date | string | undefined;

  /**
   * Filter subscribers who have been created before this date
   * (format yyyy-mm-dd).
   */
  createdBefore?: Date | string | undefined;

  /**
   * To include the total count of records in the response,
   * use `true`. For large collections, expect a slightly
   * slower response.
   *
   * @example includeTotalCount: true
   */
  includeTotalCount?: boolean | undefined;

  /**
   * Number of results per page.
   *
   * @example perPage: 500
   */
  perPage?: number | undefined;

  /**
   * Filter by a specific status. This defaults to "active" on
   * the remote API.
   */
  status?:
    | "active"
    | "inactive"
    | "bounced"
    | "complained"
    | "cancelled"
    | "all"
    | (string & {})
    | undefined;
}

export interface ListSubscribers {
  subscribers: {
    id: number;
    first_name: string | null;
    email_address: string;
    state: string;
    created_at: string;
    added_at: string;
    fields: {
      category: string;
    };
    referrer_utm_parameters?:
      | {
          source: string;
          medium: string;
          campaign: string;
          term: string;
          content: string;
        }
      | undefined;
    referrer?: string | undefined;
  }[];
  pagination: {
    has_previous_page: boolean;
    has_next_page: boolean;
    start_cursor: string | null;
    end_cursor: string | null;
    per_page: number;
  };
}

export interface AddSubscriberByEmailParams {
  /**
   * The subscribers' email address.
   *
   * This email address must already be in the remote API as a subscriber
   * to add it to the form.
   */
  emailAddress: string;

  /**
   * The referring URL.
   *
   * If applicable, save the referring URL with all query params attached.
   * If any UTM query params are attached, they will be parsed in the
   * remote API.
   */
  referrer?: URL | string | undefined;
}

export interface AddSubscriberByEmail {
  subscriber: {
    id: number;
    first_name: string;
    email_address: string;
    state: string;
    created_at: string;
    added_at: string;
    fields: {};
    referrer_utm_parameters?:
      | {
          source: string;
          medium: string;
          campaign: string;
          term: string;
          content: string;
        }
      | undefined;
    referrer?: string | undefined;
  };
}

export interface AddSubscriberParams {
  referrer?: URL | string | undefined;
}

export interface AddSubscriber {
  subscriber: {
    id: number;
    first_name: number;
    email_address: string;
    state: string;
    created_at: string;
    added_at: string;
    fields: {};
    referrer_utm_parameters?:
      | {
          source: string;
          medium: string;
          campaign: string;
          term: string;
          content: string;
        }
      | undefined;
    referrer?: string | undefined;
  };
}
