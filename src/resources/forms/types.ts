import type { Pagination, PaginationParams } from "~/common/types";

export interface BulkAddSubscribersParams {
  additions: {
    form_id: number | null;
    subscriber_id: number | null;
    referrer?: string | undefined;
  }[];
  callback_url?: string | null | undefined;
}

export interface BulkAddSubscribersAsynchronous {
  type: "asynchronous";
}

/** Completed results posted by Kit to callback_url, without the SDK discriminator. */
export type BulkAddSubscribersCallback = Omit<
  BulkAddSubscribersSynchronous,
  "type"
>;

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
      form_id: number | null;
      subscriber_id: number | null;
      referrer: string;
    };
  }[];
}

export type BulkAddSubscribers =
  BulkAddSubscribersSynchronous | BulkAddSubscribersAsynchronous;
export type BulkAddSubscribersWithoutResponseType =
  | Omit<BulkAddSubscribersSynchronous, "type">
  | Omit<BulkAddSubscribersAsynchronous, "type">;

export interface ListFormsParams extends PaginationParams {
  /** Include the number of active subscribers who subscribed via each form. */
  include?: "subscriber_count" | undefined;

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
    | null
    | undefined;

  /**
   * Filter forms and landing pages by type. Use "embed" for embedded
   * forms. Use "hosted" for landing pages.
   */
  type?: "embed" | "hosted" | (string & {}) | null | undefined;
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
    /** Returned when include is subscriber_count; counts active subscribers. */
    subscriber_count?: number | undefined;
  }[];
  pagination: Pagination;
}

export interface ListFormSubscribersParams extends PaginationParams {
  /** Omit expensive fields for a faster, smaller response. */
  slim?: boolean | undefined;

  /**
   * Filter subscribers who have been added to the form after this
   * date (format yyyy-mm-dd). Date objects use their UTC calendar date.
   */
  added_after?: Date | string | null | undefined;

  /**
   * Filter subscribers who have been added to the form before this
   * date (format yyyy-mm-dd). Date objects use their UTC calendar date.
   */
  added_before?: Date | string | null | undefined;

  /**
   * Filter subscribers who have been created after this date
   * (format yyyy-mm-dd). Date objects use their UTC calendar date.
   */
  created_after?: Date | string | null | undefined;

  /**
   * Filter subscribers who have been created before this date
   * (format yyyy-mm-dd). Date objects use their UTC calendar date.
   */
  created_before?: Date | string | null | undefined;

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

export interface ListFormSubscribers {
  subscribers: {
    id: number;
    first_name: string | null;
    email_address: string;
    state: string;
    created_at: string;
    added_at: string;
    fields: Record<string, string | null>;
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
  pagination: Pagination;
}

/** Slim responses may omit custom fields and form subscription metadata. */
export interface ListSlimFormSubscribers {
  subscribers: (Omit<
    ListFormSubscribers["subscribers"][number],
    "fields" | "added_at" | "referrer" | "referrer_utm_parameters"
  > &
    Partial<
      Pick<
        ListFormSubscribers["subscribers"][number],
        "fields" | "added_at" | "referrer" | "referrer_utm_parameters"
      >
    >)[];
  pagination: Pagination;
}

export interface AddSubscriberToFormByEmailParams {
  /**
   * The subscribers' email address.
   *
   * This email address must already be in the remote API as a subscriber
   * to add it to the form.
   */
  email_address: string;

  /**
   * The referring URL.
   *
   * If applicable, save the referring URL with all query params attached.
   * If any UTM query params are attached, they will be parsed in the
   * remote API.
   */
  referrer?: URL | string | null | undefined;
}

export interface AddSubscriberToFormByEmail {
  subscriber: {
    id: number;
    first_name: string | null;
    email_address: string;
    state: string;
    created_at: string;
    added_at: string;
    fields: Record<string, string>;
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

export interface AddSubscriberToFormParams {
  referrer?: URL | string | undefined;
}

export interface AddSubscriberToForm {
  subscriber: {
    id: number;
    first_name: string | null;
    email_address: string;
    state: string | null;
    created_at: string;
    added_at: string;
    fields: Record<string, string>;
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
