import type {
  NonNullablePaginationParams,
  Pagination,
  PaginationParams,
} from "~/common/types";

/** Lifecycle states returned by Kit for a broadcast. */
export type BroadcastStatus =
  "draft" | "scheduled" | "sending" | "completed" | "aborted";

export type BroadcastStats = {
  recipients: number;
  open_rate: number;
  emails_opened: number;
  click_rate: number;
  unsubscribe_rate: number;
  unsubscribes: number;
  total_clicks: number;
  show_total_clicks: boolean;
  status: string;
  progress: number;
  open_tracking_disabled: boolean;
  click_tracking_disabled: boolean;
};

export type BroadcastEmailTemplate = {
  id: number;
  name: string;
};

export type BroadcastLinkClick = {
  /** Kit's identifier for the tracked link. */
  id: number;
  url: string;
  unique_clicks: number;
  click_to_delivery_rate: number;
  click_to_open_rate: number;
};

export type BasicSubscriberFilterItem = {
  type: string;
  ids: number[];
};

/** The default all-subscribers filter has no IDs. Targeted filters include IDs. */
export type BroadcastSubscriberFilterResponseItem =
  { type: "all_subscribers"; ids?: undefined } | BasicSubscriberFilterItem;

/** A response includes the active filter group; inactive groups may be absent or null. */
export type BroadcastSubscriberFilterResponseGroup = {
  all?: BroadcastSubscriberFilterResponseItem[] | null | undefined;
  any?: BroadcastSubscriberFilterResponseItem[] | null | undefined;
  none?: BroadcastSubscriberFilterResponseItem[] | null | undefined;
};

/**
 * One filter entry: a single condition that matches subscribers in **any** of
 * its `ids`. To require several tags or segments, use separate entries under
 * `all` instead of listing the IDs in one entry.
 */
export type TypedSubscriberFilterItem = {
  type: "segment" | "tag" | (string & {});
  /** IDs of the given type; a subscriber in any one of them matches this entry. */
  ids: number[];
};

/** Preserve update's required keys and non-null all group. */
type UpdateBroadcastSubscriberFilterGroup =
  Required<BroadcastSubscriberFilterGroup> & {
    all: TypedSubscriberFilterItem[];
  };

/**
 * Use one of all, any, or none in a broadcast filter group. Each entry matches
 * any of its own `ids`; the group key decides how entries combine.
 *
 * @example
 * // Tag 1 AND tag 2: separate entries under `all`.
 * [{ all: [{ type: "tag", ids: [1] }, { type: "tag", ids: [2] }] }]
 * // Tag 1 OR tag 2: one entry with both IDs.
 * [{ all: [{ type: "tag", ids: [1, 2] }] }]
 */
export type BroadcastSubscriberFilterGroup = {
  /** Subscribers must match every entry (AND across entries, OR within an entry's `ids`). */
  all?: TypedSubscriberFilterItem[] | null | undefined;
  /** Subscribers must match at least one entry. */
  any?: TypedSubscriberFilterItem[] | null | undefined;
  /** Subscribers must match no entry, so any listed ID excludes them. */
  none?: TypedSubscriberFilterItem[] | null | undefined;
};

export interface ListBroadcastsParams extends PaginationParams {
  /** Omit content, public URL, sending address, template, and subscriber filter. */
  slim?: boolean | undefined;

  /** Filter broadcasts sent after this date (YYYY-MM-DD). */
  sent_after?: string | null | undefined;

  /** Filter broadcasts sent before this date (YYYY-MM-DD). */
  sent_before?: string | null | undefined;

  /** Filter broadcasts by lifecycle status. */
  status?: BroadcastStatus | undefined;
}

/** Fields shared by full broadcast responses. */
interface BroadcastResponse {
  status: BroadcastStatus;
  id: number;
  publication_id: number;
  created_at: string;
  subject: string;
  preview_text: string | null;
  description: string | null;
  content: string | null;
  public: boolean;
  published_at: string | null;
  send_at: string | null;
  thumbnail_alt: string | null;
  thumbnail_url: string | null;
  email_address: string | null;
  email_template: BroadcastEmailTemplate;
  subscriber_filter: BroadcastSubscriberFilterResponseGroup[];
}

/** Full broadcast list record with optional URL, click, and stats enrichments. */
export interface BroadcastListItem extends BroadcastResponse {
  public_url?: string | null | undefined;
  clicks?: BroadcastLinkClick[] | undefined;
  stats?: BroadcastStats | undefined;
}

interface CreatedBroadcast extends BroadcastResponse {
  preview_text: string;
  description: string;
  content: string;
  published_at: string;
  email_address: string;
  /** Public web URL; null when unavailable. */
  public_url: string | null;
}

/** Broadcast record returned by single reads and updates. */
export interface Broadcast extends BroadcastResponse {
  /** Public web URL; null when unavailable. */
  public_url: string | null;
}

export interface ListBroadcasts {
  broadcasts: BroadcastListItem[];
  pagination: Pagination;
}

export interface ListSlimBroadcasts {
  broadcasts: Omit<
    ListBroadcasts["broadcasts"][number],
    | "content"
    | "public_url"
    | "email_address"
    | "email_template"
    | "subscriber_filter"
  >[];
  pagination: Pagination;
}

export interface CreateBroadcastParams {
  /**
   * Id of the email template to use. Uses the account's default
   * template if not provided.
   */
  email_template_id?: number | undefined;

  /**
   * @deprecated Kit no longer documents this option: Starting point templates
   * now accept supplied HTML directly. It is still sent when provided.
   */
  allow_starting_point?: boolean | undefined;

  /**
   * The sending email address to use. Uses the account's
   * sending email address if not provided.
   */
  email_address?: string | null | undefined;

  /**
   * The HTML content of the email. Omit when selecting a Starting point
   * template to use that template's own design; supplied HTML is
   * incorporated into the template's design.
   */
  content?: string | undefined;
  description: string;

  /**
   * Set to `true` to publish this broadcast to the web. The broadcast
   * will appear in a newsletter feed on your Creator Profile and
   * Landing Pages.
   */
  public: boolean | null;

  /**
   * The published timestamp to display in ISO8601 format. If no
   * timezone is provided, UTC is assumed.
   */
  published_at: Date | string;

  /**
   * The scheduled send time for this broadcast in ISO8601 format. If
   * no timezone is provided, UTC is assumed.
   */
  send_at?: Date | string | null | undefined;
  thumbnail_alt?: string | null | undefined;
  thumbnail_url?: string | null | undefined;
  preview_text: string;
  subject: string;

  /**
   * Filters your subscribers. At this time, Kit only supports using
   * one filter group type via the API (e.g. all, any, or none but
   * no combinations). If nothing is provided, will default to all
   * of your subscribers.
   * Each entry matches any of its `ids`; under `all`, separate entries
   * must all match. The SDK sends entries as given and never merges or
   * splits them.
   * Pass an array of filter groups to match the API format. A single
   * group object is also accepted for backward compatibility and
   * is wrapped in an array before sending.
   */
  subscriber_filter:
    BroadcastSubscriberFilterGroup[] | BroadcastSubscriberFilterGroup | null;
}

export interface CreateBroadcast {
  broadcast: CreatedBroadcast;
}

/** Aggregate stats use the same list filters without the slim response option. */
export interface GetBroadcastStatsParams extends Omit<
  ListBroadcastsParams,
  "slim"
> {}

export interface GetBroadcastStats {
  broadcasts: {
    id: number;
    /** Broadcast subject when included by Kit. */
    subject?: string | undefined;
    /** Scheduled send timestamp; null for unscheduled broadcasts, when included. */
    send_at?: string | null | undefined;
    stats: BroadcastStats;
  }[];
  pagination: Pagination & {
    /** Only included when include_total_count is true. */
    total_count?: number | undefined;
  };
}

/** Pagination applies to the links within the broadcast. */
export type GetLinkClicksParams = NonNullablePaginationParams;

export interface GetLinkClicks {
  broadcast: {
    id: number;
    clicks: BroadcastLinkClick[];
  };
  pagination: Pagination;
}

export interface GetSingleBroadcastStats {
  broadcast: {
    id: number;
    stats: BroadcastStats;
  };
}

export interface GetBroadcast {
  broadcast: Broadcast;
}

/**
 * Only supplied fields change; omitted fields keep their current values.
 * Changing `email_template_id` without `content` can discard content: Kit then
 * returns 409 unless `allow_content_loss` is true.
 */
export interface UpdateBroadcastParams {
  /**
   * Id of the email template to use. Omit it or send `null` to keep the current
   * template. Changing it without sending `content` applies the new template's
   * design; if that would discard the broadcast's content or overwrite unsaved
   * edits open in Kit's editor, Kit returns 409 unless `allow_content_loss` is
   * true. Send `content` in the same request to keep your own content. The
   * template of a broadcast running a content A/B test cannot be changed.
   */
  email_template_id?: number | null | undefined;

  /**
   * Confirm a template change that would discard content or overwrite unsaved
   * editor changes. Only applies when `email_template_id` changes without
   * `content`; Kit defaults it to `false`. Set it deliberately: do not retry a
   * 409 with this flag automatically.
   */
  allow_content_loss?: boolean | null | undefined;

  /**
   * @deprecated Kit no longer documents this option: Starting point templates
   * now accept supplied HTML directly. It is still sent when provided.
   */
  allow_starting_point?: boolean | undefined;

  /**
   * The sending email address to use. Uses the account's sending email
   * address if not provided.
   */
  email_address?: string | null | undefined;

  /**
   * The HTML content of the email. On a Starting point template this is the
   * complete email and is incorporated into the template's design.
   */
  content?: string | null | undefined;
  description?: string | null | undefined;

  /**
   * Set to `true` to publish this broadcast. Otherwise, set to `false`
   * to save as a draft.
   */
  public?: boolean | null | undefined;

  /**
   * The published timestamp to display in ISO8601 format. If no timezone
   * is provided, UTC is assumed. Date objects will be automatically
   * converted into the correct format.
   */
  published_at?: Date | string | null | undefined;

  /**
   * The scheduled send time for this broadcast in ISO8601 format. If no
   * timezone is provided, UTC is assumed. Date objects will be
   * automatically converted into the correct format.
   */
  send_at?: Date | string | null | undefined;
  thumbnail_alt?: string | null | undefined;
  thumbnail_url?: string | null | undefined;
  preview_text?: string | null | undefined;
  subject?: string | null | undefined;

  /**
   * Filters your subscribers. At this time, Kit only supports using only
   * one filter group type via the API (e.g. all, any, or none but no
   * combinations). If nothing is provided, will default to all of
   * your subscribers.
   * Each entry matches any of its `ids`; under `all`, separate entries
   * must all match. The SDK sends entries as given and never merges or
   * splits them.
   */
  subscriber_filter?: UpdateBroadcastSubscriberFilterGroup[] | undefined;
}

export interface UpdateBroadcast {
  broadcast: Broadcast;
}
