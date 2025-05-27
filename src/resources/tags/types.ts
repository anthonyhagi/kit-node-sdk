import type { Pagination } from "~/common/types";
import type { Nullable } from "~/utils/helpers";

export type Tag = {
  id: number;
  name: string;
  created_at: string;
};

export type Tagging = {
  tag_id: number;
  subscriber_id: number;
};

export interface BulkCreateTagsParams {
  tags: {
    name: string;
  }[];
  callback_url?: string | null | undefined;
}

export interface BulkCreateTagsSynchronous {
  type: "synchronous";
  tags: Tag[];
  failures: {
    tag: Tag;
    errors: string[];
  }[];
}

export interface BulkCreateTagsAsynchronous {
  type: "asynchronous";
}

export type BulkCreateTags =
  | BulkCreateTagsSynchronous
  | BulkCreateTagsAsynchronous;

export type BulkCreateTagsWithoutType =
  | Omit<BulkCreateTagsSynchronous, "type">
  | Omit<BulkCreateTagsAsynchronous, "type">;

export interface BulkRemoveTagsParams {
  taggings: Tagging[];
  callback_url?: string | null | undefined;
}

export interface BulkRemoveTagsSynchronous {
  type: "synchronous";
  failures: {
    tag: Tag;
    errors: string[];
  }[];
}

export interface BulkRemoveTagsAsynchronous {
  type: "asynchronous";
}

export type BulkRemoveTags =
  | BulkRemoveTagsSynchronous
  | BulkRemoveTagsAsynchronous;

export type BulkRemoveTagsWithoutType =
  | Omit<BulkRemoveTagsSynchronous, "type">
  | Omit<BulkRemoveTagsAsynchronous, "type">;

export interface BulkTagParams {
  taggings: Tagging[];
  callback_url?: string | null | undefined;
}

export interface BulkTagSynchronous {
  type: "synchronous";
  subscribers: {
    id: number;
    first_name: string;
    email_address: string;
    created_at: string;
    tagged_at: string;
  }[];
  failures: {
    tagging: Nullable<Tagging>;
    errors: string[];
  }[];
}

export interface BulkTagAsynchronous {
  type: "asynchronous";
}

export type BulkTag = BulkTagSynchronous | BulkTagAsynchronous;
export type BulkTagWithoutType =
  | Omit<BulkTagSynchronous, "type">
  | Omit<BulkTagAsynchronous, "type">;

export interface ListTagsParams {
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
  include_total_count?: boolean | undefined;

  /**
   * Number of results per page. Default 500, maximum 1000.
   *
   * @example perPage: 500
   */
  per_page?: number | undefined;
}

export interface ListTags {
  tags: Tag[];
  pagination: Pagination;
}

export interface CreateTagParams {
  name: string;
}

export interface CreateTag {
  tag: Tag;
}

export interface UpdateTagParams {
  name: string;
}

export interface UpdateTag {
  tag: Tag;
}

export interface RemoveSubscriberByEmailParams {
  email_address: string;
}

export interface ListTagSubscribersParams {
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
   * Filter subscribers who have been created after this
   * date (format yyyy-mm-dd).
   */
  created_after?: Date | string | undefined;

  /**
   * Filter subscribers who have been created before this
   * date (format yyyy-mm-dd).
   */
  created_before?: Date | string | undefined;

  /**
   * To include the total count of records in the response,
   * use `true`. For large collections, expect a slightly
   * slower response.
   *
   * @example includeTotalCount: true
   */
  include_total_count?: boolean | undefined;

  /**
   * Number of results per page.
   *
   * @example perPage: 500
   */
  per_page?: number | undefined;

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

  /**
   * Filter subscribers who have been tagged after this date
   * (format yyyy-mm-dd).
   */
  tagged_after?: Date | string | undefined;

  /**
   * Filter subscribers who have been tagged before this date
   * (format yyyy-mm-dd).
   */
  tagged_before?: Date | string | undefined;
}

export interface ListTagSubscribers {
  subscribers: {
    id: number;
    first_name: string | null;
    email_address: string;
    state: string;
    created_at: string;
    tagged_at: string;
    fields: Record<string, string | null>;
  }[];
  pagination: Pagination;
}

export interface TagSubscriberByEmailParams {
  email_address: string;
}

export interface TagSubscriberByEmail {
  subscriber: {
    id: number;
    first_name: string;
    email_address: string;
    state: string;
    created_at: string;
    tagged_at: string;
    fields: Record<string, string | null>;
  };
}

export interface TagSubscriber {
  subscriber: {
    id: number;
    first_name: string;
    email_address: string;
    state: string;
    created_at: string;
    tagged_at: string;
    fields: Record<string, string | null>;
  };
}
