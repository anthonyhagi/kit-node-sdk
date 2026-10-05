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

export type TypedSubscriberFilterItem = {
  type: "segment" | "tag" | (string & {});
  ids: number[];
};

/** Preserve update's required keys and non-null all group. */
type UpdateBroadcastSubscriberFilterGroup =
  Required<BroadcastSubscriberFilterGroup> & {
    all: TypedSubscriberFilterItem[];
  };

/** Use one of all, any, or none in a broadcast filter group. */
export type BroadcastSubscriberFilterGroup = {
  /** Subscribers must belong to all specified segments and tags. */
  all?: TypedSubscriberFilterItem[] | null | undefined;
  /** Subscribers must belong to at least one specified segment or tag. */
  any?: TypedSubscriberFilterItem[] | null | undefined;
  /** Subscribers must belong to none of the specified segments and tags. */
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

export interface ListBroadcasts {
  broadcasts: {
    status: BroadcastStatus;
    id: number;
    publication_id: number;
    created_at: string;
    subject: string;
    preview_text: string | null;
    description: string | null;
    content: string | null;
    public_url?: string | null | undefined;
    public: boolean;
    published_at: string | null;
    send_at: string | null;
    thumbnail_alt: string | null;
    thumbnail_url: string | null;
    email_address: string | null;
    email_template: BroadcastEmailTemplate;
    subscriber_filter: BroadcastSubscriberFilterResponseGroup[];
    clicks?: BroadcastLinkClick[] | undefined;
    stats?: BroadcastStats | undefined;
  }[];
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
   * template if not provided. When supplying content with a Starting
   * point template, set allow_starting_point to true.
   */
  email_template_id?: number | undefined;

  /** Allow custom HTML content when using a Starting point email template. */
  allow_starting_point?: boolean | undefined;

  /**
   * The sending email address to use. Uses the account's
   * sending email address if not provided.
   */
  email_address?: string | null | undefined;

  /**
   * The HTML content of the email. Omit when selecting a Starting point
   * template to use that template's own design. When supplying custom HTML
   * with a Starting point template, set allow_starting_point to true.
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
   * Pass an array of filter groups to match the API format. A single
   * group object is also accepted for backward compatibility and
   * is wrapped in an array before sending.
   */
  subscriber_filter:
    BroadcastSubscriberFilterGroup[] | BroadcastSubscriberFilterGroup | null;
}

export interface CreateBroadcast {
  broadcast: {
    status: BroadcastStatus;
    id: number;
    publication_id: number;
    created_at: string;
    subject: string;
    preview_text: string;
    description: string;
    content: string;
    public: boolean;
    published_at: string;
    send_at: string | null;
    thumbnail_alt: string | null;
    thumbnail_url: string | null;
    /** Public web URL; null when unavailable. */
    public_url: string | null;
    email_address: string;
    email_template: BroadcastEmailTemplate;
    subscriber_filter: BroadcastSubscriberFilterResponseGroup[];
  };
}

export interface GetBroadcastStatsParams extends PaginationParams {
  /** Filter broadcasts sent after this date (YYYY-MM-DD). */
  sent_after?: string | null | undefined;
  /** Filter broadcasts sent before this date (YYYY-MM-DD). */
  sent_before?: string | null | undefined;
  /** Filter broadcasts by lifecycle status. */
  status?: BroadcastStatus | undefined;
}

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
  broadcast: {
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
    public_url: string | null;
    email_address: string | null;
    email_template: BroadcastEmailTemplate;
    subscriber_filter: BroadcastSubscriberFilterResponseGroup[];
  };
}

export interface UpdateBroadcastParams {
  /**
   * Id of the email template to use. Uses the account's default template
   * if not provided. When supplying content with a Starting point
   * template, set allow_starting_point to true.
   */
  email_template_id: number | null;

  /** Allow custom HTML content when using a Starting point email template. */
  allow_starting_point?: boolean | undefined;

  /**
   * The sending email address to use. Uses the account's sending email
   * address if not provided.
   */
  email_address: string | null;

  /**
   * The HTML content of the email.
   */
  content: string | null;
  description: string | null;

  /**
   * Set to `true` to publish this broadcast. Otherwise, set to `false`
   * to save as a draft.
   */
  public: boolean | null;

  /**
   * The published timestamp to display in ISO8601 format. If no timezone
   * is provided, UTC is assumed. Date objects will be automatically
   * converted into the correct format.
   */
  published_at: Date | string | null;

  /**
   * The scheduled send time for this broadcast in ISO8601 format. If no
   * timezone is provided, UTC is assumed. Date objects will be
   * automatically converted into the correct format.
   */
  send_at: Date | string | null;
  thumbnail_alt: string | null;
  thumbnail_url: string | null;
  preview_text: string | null;
  subject: string | null;

  /**
   * Filters your subscribers. At this time, Kit only supports using only
   * one filter group type via the API (e.g. all, any, or none but no
   * combinations). If nothing is provided, will default to all of
   * your subscribers.
   */
  subscriber_filter: UpdateBroadcastSubscriberFilterGroup[];
}

export interface UpdateBroadcast {
  broadcast: {
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
    public_url: string | null;
    email_address: string | null;
    email_template: BroadcastEmailTemplate;
    subscriber_filter: BroadcastSubscriberFilterResponseGroup[];
  };
}
