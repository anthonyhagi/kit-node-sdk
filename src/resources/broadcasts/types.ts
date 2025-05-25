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
   * @example after: pagination.start_cursor
   */
  before?: string | undefined;

  /**
   * To include the total count of records in the response,
   * use `true`. For large collections, expect a slightly
   * slower response.
   */
  include_total_count?: boolean | undefined;

  /**
   * Number of results per page. Default 500, maximum 1000.
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
    email_template: {
      id: number;
      name: string;
    };
    subscriber_filter: {
      all: { type: string; ids: number[] }[];
      any?: { type: string; ids: number[] }[];
      none?: { type: string; ids: number[] }[];
    }[];
    publication_id?: number | undefined;
    clicks?: unknown[] | undefined;
    stats?:
      | {
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
        }
      | undefined;
  }[];
  pagination: {
    has_previous_page: boolean;
    has_next_page: boolean;
    start_cursor: string | null;
    end_cursor: string | null;
    per_page: number;
  };
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
    all: {
      type: "segment" | "tag" | (string & {});
      ids: number[];
    } | null;

    /**
     * Filters your subscribers using a logical OR of all provided
     * segment and tag ids, i.e. a subscriber would have to be
     * part of at least one of the segments or tags provided.
     */
    any: {
      type: "segment" | "tag" | (string & {});
      ids: number[];
    } | null;

    /**
     * Filters your subscribers using a logical NOT of all provided
     * segment and tag ids, i.e. a subscriber would have to be in
     * none of the segments or tags provided.
     */
    none: {
      type: "segment" | "tag" | (string & {});
      ids: number[];
    } | null;
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
    thumbnail_alt: unknown;
    thumbnail_url: unknown;
    email_address: string;
    email_template: {
      id: number;
      name: string;
    };
    subscriber_filter: {
      all: {
        type: string;
        ids: number[];
      };
      any: {
        type: string;
        ids: number[];
      };
      none: {
        type: string;
        ids: number[];
      };
    };
    publication_id: number;
  };
}

export interface GetBroadcast {
  broadcast: {
    id: number;
    created_at: string;
    subject: string;
    description: unknown;
    content: unknown;
    public: boolean;
    published_at: unknown;
    send_at: unknown;
    thumbnail_alt: unknown;
    thumbnail_url: unknown;
    email_address: string | null;
    preview_text?: unknown | undefined;
    email_template: {
      id: number;
      name: string;
    };
    subscriber_filter: {
      all?: { type: string; ids?: number[] | undefined }[] | undefined;
      any?: { type: string; ids: number[] }[] | undefined;
      none?: { type: string; ids: number[] }[] | undefined;
    }[];
    publication_id?: number | undefined;
    clicks?:
      | {
          url: string;
          unique_clicks: number;
          click_to_delivery_rate: number;
          click_to_open_rate: number;
        }[]
      | undefined;
    stats?:
      | {
          recipients: number[];
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
        }
      | undefined;
  };
}
