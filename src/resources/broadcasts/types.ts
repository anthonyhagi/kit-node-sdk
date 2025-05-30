import type { Pagination } from "~/common/types";

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
  url: string;
  unique_clicks: number;
  click_to_delivery_rate: number;
  click_to_open_rate: number;
};

export type BasicSubscriberFilterItem = {
  type: string;
  ids: number[];
};

export type TypedSubscriberFilterItem = {
  type: "segment" | "tag" | (string & {});
  ids: number[];
};

export interface ListBroadcastsParams {
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

export interface ListBroadcasts {
  broadcasts: {
    id: number;
    created_at: string;
    subject: string;
    description: string | null;
    content: string | null;
    public: boolean;
    published_at: string | null;
    send_at: string | null;
    thumbnail_alt: string | null;
    thumbnail_url: string | null;
    email_address: string | null;
    preview_text?: string | null | undefined;
    email_template: BroadcastEmailTemplate;
    subscriber_filter: {
      all: BasicSubscriberFilterItem[];
      any?: BasicSubscriberFilterItem[];
      none?: BasicSubscriberFilterItem[];
    }[];
    publication_id?: number | undefined;
    clicks?: BroadcastLinkClick[] | undefined;
    stats?: BroadcastStats | undefined;
  }[];
  pagination: Pagination;
}

export interface CreateBroadcastParams {
  /**
   * Id of the email template to use. Uses the account's default
   * template if not provided. 'Starting point' template is not
   * supported.
   */
  email_template_id: number | null;

  /**
   * The sending email address to use. Uses the account's
   * sending email address if not provided.
   */
  email_address: string | null;

  /**
   * The HTML content of the email.
   */
  content: string | null;
  description: string | null;

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
  published_at: Date | string | null;

  /**
   * The scheduled send time for this broadcast in ISO8601 format. If
   * no timezone is provided, UTC is assumed.
   */
  send_at: Date | string | null;
  thumbnail_alt: string | null;
  thumbnail_url: string | null;
  preview_text: string | null;
  subject: string | null;

  /**
   * Filters your subscribers. At this time, Kit only supports using
   * one filter group type via the API (e.g. all, any, or none but
   * no combinations). If nothing is provided, will default to all
   * of your subscribers.
   */
  subscriber_filter: {
    /**
     * Filters your subscribers using a logical AND of all provided
     * segment and tag ids, i.e. a subscriber would have to be part
     * of all segments and tags provided.
     */
    all: TypedSubscriberFilterItem[] | null;

    /**
     * Filters your subscribers using a logical OR of all provided
     * segment and tag ids, i.e. a subscriber would have to be
     * part of at least one of the segments or tags provided.
     */
    any: TypedSubscriberFilterItem[] | null;

    /**
     * Filters your subscribers using a logical NOT of all provided
     * segment and tag ids, i.e. a subscriber would have to be in
     * none of the segments or tags provided.
     */
    none: TypedSubscriberFilterItem[] | null;
  } | null;
}

export interface CreateBroadcast {
  broadcast: {
    id: number;
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
    email_address: string;
    email_template: BroadcastEmailTemplate;
    subscriber_filter: {
      all: BasicSubscriberFilterItem[];
      any: BasicSubscriberFilterItem[] | null;
      none: BasicSubscriberFilterItem[] | null;
    };
    publication_id: number;
  };
}

export interface GetBroadcastStats {
  broadcasts: {
    id: number;
    stats: BroadcastStats;
  }[];
  pagination: Pagination;
}

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
    id: number;
    created_at: string;
    subject: string;
    description: string | null;
    content: string | null;
    public: boolean;
    published_at: string | null;
    send_at: string | null;
    thumbnail_alt: string | null;
    thumbnail_url: string | null;
    email_address: string | null;
    preview_text?: string | null | undefined;
    email_template: BroadcastEmailTemplate;
    subscriber_filter: {
      all?: BasicSubscriberFilterItem[] | undefined;
      any?: BasicSubscriberFilterItem[] | undefined;
      none?: BasicSubscriberFilterItem[] | undefined;
    }[];
    publication_id?: number | undefined;
    clicks?: BroadcastLinkClick[] | undefined;
    stats?: BroadcastStats | undefined;
  };
}

export interface UpdateBroadcastParams {
  /**
   * Id of the email template to use. Uses the account's default template
   * if not provided.
   */
  email_template_id: number | null;

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
  subscriber_filter:
    | {
        /**
         * Filters your subscribers using a logical AND of all provided
         * segment and tag ids, i.e. a subscriber would have to be part
         * of all segments and tags provided.
         */
        all: TypedSubscriberFilterItem[] | null; // UpdateParams expects arrays of items or null for each type

        /**
         * Filters your subscribers using a logical OR of all provided
         * segment and tag ids, i.e. a subscriber would have to be
         * part of at least one of the segments or tags provided.
         */
        any: TypedSubscriberFilterItem[] | null;

        /**
         * Filters your subscribers using a logical NOT of all provided
         * segment and tag ids, i.e. a subscriber would have to be in
         * none of the segments or tags provided.
         */
        none: TypedSubscriberFilterItem[] | null;
      }[]
    | null;
}

export interface UpdateBroadcast {
  broadcast: {
    id: number;
    created_at: string;
    subject: string;
    preview_text: string;
    description: string;
    content: string;
    public: boolean;
    published_at: string;
    send_at: string;
    thumbnail_alt: string | null;
    thumbnail_url: string | null;
    email_address: string;
    email_template: BroadcastEmailTemplate;
    subscriber_filter: {
      all: BasicSubscriberFilterItem[];
    }[];
    publication_id?: number | undefined;
  };
}
