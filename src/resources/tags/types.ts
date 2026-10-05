import type { Pagination, PaginationParams } from "~/common/types";
import type { Nullable } from "~/utils/types";

export type Tag = {
  id: number;
  name: string;
  created_at: string;
};

export type Tagging = {
  tag_id: number;
  subscriber_id: number;
};

export interface BulkDeleteTagsParams {
  tags: { id: number }[];
  callback_url?: string | null | undefined;
}

/** Completed results posted by Kit to callback_url, without the SDK discriminator. */
export type BulkDeleteTagsCallback = Omit<BulkDeleteTagsSynchronous, "type">;

export interface BulkDeleteTagsSynchronous {
  type: "synchronous";
  failures: {
    tag: { id: number };
    errors: string[];
  }[];
}

export interface BulkDeleteTagsAsynchronous {
  type: "asynchronous";
}

export type BulkDeleteTags =
  BulkDeleteTagsSynchronous | BulkDeleteTagsAsynchronous;

export type BulkDeleteTagsWithoutType =
  | Omit<BulkDeleteTagsSynchronous, "type">
  | Omit<BulkDeleteTagsAsynchronous, "type">;

export interface BulkCreateTagsParams {
  tags: {
    name: string;
  }[];
  callback_url?: string | null | undefined;
}

/** Completed results posted by Kit to callback_url, without the SDK discriminator. */
export type BulkCreateTagsCallback = Omit<BulkCreateTagsSynchronous, "type">;

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
  BulkCreateTagsSynchronous | BulkCreateTagsAsynchronous;

export type BulkCreateTagsWithoutType =
  | Omit<BulkCreateTagsSynchronous, "type">
  | Omit<BulkCreateTagsAsynchronous, "type">;

export interface BulkRemoveTagsParams {
  taggings: Tagging[];
  callback_url?: string | null | undefined;
}

/** Completed results posted by Kit to callback_url, without the SDK discriminator. */
export type BulkRemoveTagsCallback = Omit<BulkRemoveTagsSynchronous, "type">;

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
  BulkRemoveTagsSynchronous | BulkRemoveTagsAsynchronous;

export type BulkRemoveTagsWithoutType =
  | Omit<BulkRemoveTagsSynchronous, "type">
  | Omit<BulkRemoveTagsAsynchronous, "type">;

export interface BulkTagParams {
  taggings: Nullable<Tagging>[];
  callback_url?: string | null | undefined;
}

/** Completed results posted by Kit to callback_url, without the SDK discriminator. */
export type BulkTagCallback = Omit<BulkTagSynchronous, "type">;

export interface BulkTagSynchronous {
  type: "synchronous";
  subscribers: BulkTaggedSubscriber[];
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
  Omit<BulkTagSynchronous, "type"> | Omit<BulkTagAsynchronous, "type">;

export interface ListTagsParams extends PaginationParams {
  /** Include the number of active subscribers with each tag. */
  include?: "subscriber_count" | undefined;
}

export interface ListTags {
  tags: (Tag & {
    /** Returned when include is subscriber_count; counts active subscribers. */
    subscriber_count?: number | undefined;
  })[];
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

export interface ListTagSubscribersParams extends PaginationParams {
  /** Request a smaller response by omitting expensive optional fields. */
  slim?: boolean | undefined;

  /**
   * Filter subscribers who have been created after this
   * date (format yyyy-mm-dd).
   * Date objects use their UTC calendar date.
   */
  created_after?: Date | string | null | undefined;

  /**
   * Filter subscribers who have been created before this
   * date (format yyyy-mm-dd).
   * Date objects use their UTC calendar date.
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

  /**
   * Filter subscribers who have been tagged after this date
   * (format yyyy-mm-dd).
   * Date objects use their UTC calendar date.
   */
  tagged_after?: Date | string | null | undefined;

  /**
   * Filter subscribers who have been tagged before this date
   * (format yyyy-mm-dd).
   * Date objects use their UTC calendar date.
   */
  tagged_before?: Date | string | null | undefined;
}

/** Subscriber record returned when listing a tag or tagging by ID or email. */
export interface TaggedSubscriber {
  id: number;
  first_name: string | null;
  email_address: string;
  state: string;
  created_at: string;
  tagged_at: string;
  fields: Record<string, string | null>;
}

/** Bulk tagging returns subscription metadata with a non-null first name. */
interface BulkTaggedSubscriber extends Pick<
  TaggedSubscriber,
  "id" | "email_address" | "created_at" | "tagged_at"
> {
  first_name: string;
}

export interface ListTagSubscribers {
  subscribers: TaggedSubscriber[];
  pagination: Pagination;
}

/** Slim responses may omit custom fields and tag subscription metadata. */
export interface ListSlimTagSubscribers {
  subscribers: (Omit<
    ListTagSubscribers["subscribers"][number],
    "fields" | "tagged_at"
  > &
    Partial<
      Pick<ListTagSubscribers["subscribers"][number], "fields" | "tagged_at">
    >)[];
  pagination: Pagination;
}

export interface TagSubscriberByEmailParams {
  email_address: string;
}

export interface TagSubscriberByEmail {
  subscriber: TaggedSubscriber;
}

export interface TagSubscriber {
  subscriber: TaggedSubscriber;
}
