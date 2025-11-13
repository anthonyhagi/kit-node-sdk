import type { Pagination, SubscriberState } from "~/common/types";

export interface BulkCreateSubscribersParams {
  subscribers: {
    first_name: string;
    email_address: string;
    state: SubscriberState;
  }[];
  callback_url?: string | null | undefined;
}

export interface BulkCreateSubscribersSynchronous {
  type: "synchronous";
  subscribers: {
    id: number;
    first_name: string | null;
    email_address: string;
    state: SubscriberState;
    created_at: string;
  }[];
  failures: {
    subscriber: {
      first_name: string | null;
      email_address: string | null;
      state: SubscriberState | null;
      created_at: string | null;
    };
    errors: string[];
  }[];
}

export interface BulkCreateSubscribersAsynchronous {
  type: "asynchronous";
}

export type BulkCreateSubscribers =
  | BulkCreateSubscribersSynchronous
  | BulkCreateSubscribersAsynchronous;

export type BulkCreateSubscribersWithoutType =
  | Omit<BulkCreateSubscribersSynchronous, "type">
  | Omit<BulkCreateSubscribersAsynchronous, "type">;

export interface ListSubscribersParams {
  after?: string | undefined;
  before?: string | undefined;
  created_after?: Date | string | undefined;
  created_before?: Date | string | undefined;
  email_address?: string | undefined;
  include_total_count?: boolean | undefined;
  per_page?: number | undefined;
  sort_field?: "id" | "updated_at" | "cancelled_at" | (string & {}) | undefined;
  sort_order?: "asc" | "desc" | undefined;
  status?: SubscriberState | "all" | undefined;
  updated_after?: Date | string | undefined;
  updated_before?: Date | string | undefined;
}

export interface ListSubscribers {
  subscribers: {
    id: number;
    first_name: string;
    email_address: string;
    state: SubscriberState;
    created_at: string;
    fields: Record<string, string>;
  }[];
  pagination: Pagination;
}

export interface CreateSubscriberParams {
  first_name?: string | null | undefined;
  email_address: string;
  state?: SubscriberState | (string & {}) | null | undefined;
  fields?: Record<string, string> | null | undefined;
}

export interface CreateSubscriber {
  subscriber: {
    id: number;
    first_name: string;
    email_address: string;
    state: SubscriberState;
    created_at: string;
    fields: Record<string, string>;
  };
}

export interface FilterSubscriberParams {
  /**
   * Number of results per page (max 100).
   *
   * As required from the api: 1 <= x <= 100
   */
  per_page?: number | undefined;
  after?: string | undefined;
  before?: string | undefined;

  /**
   * Include total count of matching subscribers in response.
   *
   * @default false.
   */
  include_total_count?: boolean | undefined;
}

export interface FilterSubscriberBodyAnyBroadcast {
  type: "broadcast";
  /** Array of broadcast IDs. Subscriber must match ANY of these. */
  ids: number[];
}

export interface FilterSubscriberBodyAnyUrls {
  type: "urls";

  /** Array of URL IDs. Subscriber must have clicked ANY of these. */
  ids: number[];

  /** Array of URL patterns. Subscriber must have clicked ANY of these. */
  urls: string[];

  /** URL matching strategy */
  matching: "exact" | "contains" | "starts_with" | "ends_with" | (string & {});
}

export interface FilterSubscriberBodyAllSubscribed {
  type: "subscribed";

  /** Start date (YYYY-MM-DD). This filters by `subscriber_created_at`. */
  after?: string | undefined;

  /** End date (YYYY-MM-DD). Filters by `subscriber_created_at`. */
  before?: string | undefined;
}

export interface FilterSubscriberBodyAllBase {
  /** Type of filter condition */
  type: "opens" | "clicks" | "sent" | "delivered";

  /** Minimum count (inclusive). */
  count_greater_than?: number | undefined;

  /** Maximum count (inclusive). */
  count_less_than?: number | undefined;

  /** Start date (YYYY-MM-DD). Filters by the event date. */
  after?: string | undefined;

  /** End date (YYYY-MM-DD). Filters by the event date. */
  before?: string | undefined;

  /**
   * Array of OR conditions for filtering by specific broadcasts or URLs.
   * Subscriber activity must match ANY of these conditions. Not
   * applicable for 'subscribed' type.
   */
  any?: (FilterSubscriberBodyAnyBroadcast | FilterSubscriberBodyAnyUrls)[];
}

export interface FilterSubscriberBody {
  all: (FilterSubscriberBodyAllSubscribed | FilterSubscriberBodyAllBase)[];
}

export interface FilterSubscribers {
  subscribers: {
    id: string;
    first_name: string;
    email_address: string;
    created_at: string;
    tag_names?: string[] | undefined;
    tag_ids?: string[] | undefined;
  }[];

  pagination: Pagination & {
    /**
     * Total count of matching subscribers. Only included when the
     * `include_total_count=true` query parameter is set.
     */
    total_count?: number | undefined;
  };
}

export interface GetSubscriber {
  subscriber: {
    id: number;
    first_name: string;
    email_address: string;
    state: SubscriberState;
    created_at: string;
    fields: Record<string, string>;
  };
}

export interface UpdateSubscriberParams {
  first_name?: string | null | undefined;
  email_address: string;
  fields?: Record<string, string> | null | undefined;
}

export interface UpdateSubscriber {
  subscriber: {
    id: number;
    first_name: string;
    email_address: string;
    state: SubscriberState;
    created_at: string;
    fields: Record<string, string>;
  };
}

export interface GetSubscriberTagsParams {
  after?: string | undefined;
  before?: string | undefined;
  include_total_count?: boolean | undefined;
  per_page?: number | undefined;
}

export interface GetSubscriberTags {
  tags: {
    id: number;
    name: string;
    added_at?: string | undefined;
    tagged_at?: string | undefined;
  }[];
  pagination: Pagination;
}
