import type { Pagination } from "~/common/types";

export interface ListSequencesParams {
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

export interface ListSequences {
  sequences: {
    id: number;
    name: string;
    hold: boolean;
    repeat: boolean;
    created_at: string;
  }[];
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

export interface ListSequenceSubscribers {
  subscribers: {
    id: number;
    first_name: string | null;
    email_address: string | null;
    state: string;
    created_at: string;
    added_at: string;
    fields: {
      category: string;
    };
    pagination: Pagination;
  }[];
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
    fields: Record<string, unknown>;
  };
}
