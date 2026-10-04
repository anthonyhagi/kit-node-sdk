import type { Pagination, SubscriberState } from "~/common/types";

export interface GetSequenceParams {
  /** Include deliverability statistics alongside the sequence details. */
  include?: "stats" | undefined;
}

/** Deliverability fields may be null when the sequence has no delivery data. */
export interface SequenceStats {
  /** Current cancelled sequence subscriptions, distinct from email events. */
  unsubscribers?: number | undefined;
  recipients?: number | null | undefined;
  opens?: number | null | undefined;
  clicks?: number | null | undefined;
  email_unsubscribes?: number | null | undefined;
  bounces?: number | null | undefined;
  complaints?: number | null | undefined;
  open_rate?: number | null | undefined;
  click_rate?: number | null | undefined;
  click_to_open_rate?: number | null | undefined;
  unsubscribe_rate?: number | null | undefined;
  bounce_rate?: number | null | undefined;
  complaint_rate?: number | null | undefined;
}

export interface GetSequence {
  sequence: {
    id: number;
    name: string;
    hold: boolean;
    repeat: boolean;
    created_at: string;
    updated_at: string;
    email_address: string | null;
    email_template_id: number | null;
    send_days: string[];
    send_hour: number;
    time_zone: string;
    active: boolean;
    exclude_subscriber_sources: { type: string; ids: number[] }[];
    email_count?: number | undefined;
    subscriber_count?: number | undefined;
    /** Returned only when requested with include: "stats". */
    stats?: SequenceStats | undefined;
  };
}

export interface ListSequencesParams extends GetSequenceParams {
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
   * @example before: pagination.start_cursor
   */
  before?: string | undefined;

  /**
   * To include the total count of records in the response,
   * use `true`. For large collections, expect a slightly
   * slower response.
   *
   * @example include_total_count: true
   */
  include_total_count?: boolean | undefined;

  /**
   * Number of results per page. Default 500, maximum 1000.
   *
   * @example per_page: 500
   */
  per_page?: number | undefined;
}

/** List responses require core metadata; additional sequence details are optional. */
export type SequenceListItem = Pick<
  GetSequence["sequence"],
  "id" | "name" | "hold" | "repeat" | "created_at"
> &
  Partial<
    Omit<
      GetSequence["sequence"],
      "id" | "name" | "hold" | "repeat" | "created_at"
    >
  >;

export interface ListSequences {
  sequences: SequenceListItem[];
  pagination: Pagination;
}

export interface ListSequenceSubscribersParams {
  added_after?: Date | string | undefined;
  added_before?: Date | string | undefined;
  after?: string | undefined;
  before?: string | undefined;
  created_after?: Date | string | undefined;
  created_before?: Date | string | undefined;
  include_total_count?: boolean | undefined;
  per_page?: number | undefined;
  status?: SubscriberState | "all" | (string & {}) | undefined;
}

export interface ListSequenceSubscribers {
  subscribers: {
    id: number;
    first_name: string | null;
    email_address: string | null;
    state: string;
    created_at: string;
    added_at: string;
    fields: Record<string, string>;
  }[];
  pagination: Pagination;
}

export interface AddSubscriberByEmailParams {
  email_address: string;
}

export interface AddSubscriberToSequence {
  subscriber: {
    id: number;
    first_name: string;
    email_address: string;
    state: string;
    created_at: string;
    added_at: string;
    fields: Record<string, string>;
  };
}
