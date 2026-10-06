import type {
  NonNullablePaginationParams,
  Pagination,
  PaginationParams,
  SubscriberState,
} from "~/common/types";
import type { Tag } from "~/resources/tags/types";

/** Core subscriber record shared by subscriber response types. */
export interface Subscriber {
  id: number;
  first_name: string | null;
  email_address: string;
  state: SubscriberState;
  created_at: string;
  fields: Record<string, string | null>;
}

/** Location fields returned by subscriber reads; individual values may be unknown. */
export interface SubscriberLocation {
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
}

/** Get and filter responses also permit omitted or explicitly undefined fields. */
type PartialSubscriberLocation = {
  [Key in keyof SubscriberLocation]?: SubscriberLocation[Key] | undefined;
};

export interface BulkCreateSubscribersParams {
  subscribers: {
    first_name?: string | null | undefined;
    /** Missing or invalid email addresses are reported in per-subscriber failures. */
    email_address?: string | null | undefined;
    state?: SubscriberState | null | undefined;
  }[];
  callback_url?: string | null | undefined;
}

/** Completed results posted by Kit to callback_url, without the SDK discriminator. */
export type BulkCreateSubscribersCallback = Omit<
  BulkCreateSubscribersSynchronous,
  "type"
>;

export interface BulkCreateSubscribersSynchronous {
  type: "synchronous";
  subscribers: Omit<Subscriber, "fields">[];
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
  BulkCreateSubscribersSynchronous | BulkCreateSubscribersAsynchronous;

export type BulkCreateSubscribersWithoutType =
  | Omit<BulkCreateSubscribersSynchronous, "type">
  | Omit<BulkCreateSubscribersAsynchronous, "type">;

export interface ListSubscribersParams extends PaginationParams {
  /** Created after this date (YYYY-MM-DD). Date objects use their UTC calendar date. */
  created_after?: Date | string | undefined;
  /** Created before this date (YYYY-MM-DD). Date objects use their UTC calendar date. */
  created_before?: Date | string | undefined;
  email_address?: string | undefined;
  /**
   * Comma-separated fields: attribution, tags, location, canceled_at.
   * Including canceled_at requires status: "cancelled".
   */
  include?: string | undefined;
  /** Omit custom field values from the response for a smaller payload. */
  slim?: boolean | undefined;
  /**
   * Field to order by (defaults to id). Cancellation sorts require status: "cancelled".
   * Engagement sorts use the trailing 90 days and cannot be combined with email_address.
   */
  sort_field?:
    | "id"
    | "created_at"
    | "updated_at"
    | "cancelled_at"
    | "canceled_at"
    | "engagement__sent"
    | "engagement__opens"
    | "engagement__clicks"
    | "engagement__open_rate"
    | "engagement__click_rate"
    | (string & {})
    | undefined;
  sort_order?: "asc" | "desc" | undefined;
  status?: SubscriberState | "all" | undefined;
  /** Updated after this date (YYYY-MM-DD). Date objects use their UTC calendar date. */
  updated_after?: Date | string | undefined;
  /** Updated before this date (YYYY-MM-DD). Date objects use their UTC calendar date. */
  updated_before?: Date | string | undefined;
}

export interface ListSubscribers {
  subscribers: (Omit<Subscriber, "fields"> & {
    /** Omitted when slim is true. */
    fields?: Subscriber["fields"] | undefined;
    /** Included when attribution is requested. */
    attribution?:
      | {
          referrer: string | null;
          utm_source: string | null;
          utm_medium: string | null;
          utm_campaign: string | null;
          utm_term: string | null;
          utm_content: string | null;
          source_type: string | null;
          source_name: string | null;
          source_mechanism: string | null;
          source_mechanism_id: number | null;
        }
      | null
      | undefined;
    /** Included when tags are requested. */
    tags?:
      | { id?: number | null | undefined; name?: string | null | undefined }[]
      | undefined;
    /** Included when location is requested. */
    location?: SubscriberLocation | null | undefined;
    /** Included when canceled_at is requested with status: "cancelled". */
    canceled_at?: string | null | undefined;
  })[];
  pagination: Pagination;
}

/** Full list responses include custom field values. */
export interface ListFullSubscribers {
  subscribers: (Omit<ListSubscribers["subscribers"][number], "fields"> &
    Pick<Subscriber, "fields">)[];
  pagination: Pagination;
}

/** Slim list responses may omit custom field values. */
export type ListSlimSubscribers = ListSubscribers;

export interface CreateSubscriberParams {
  /** Updated when a subscriber with the same email address already exists. */
  first_name?: string | null | undefined;
  /** Identifies an existing subscriber or creates one when no match exists. */
  email_address: string;
  /** Applies to new subscribers only; cannot change an existing subscriber's state. */
  state?: SubscriberState | (string & {}) | null | undefined;
  /** Use existing custom field keys; unknown keys are ignored and returned in warnings. */
  fields?: Record<string, string> | null | undefined;
}

export interface CreateSubscriber {
  /** Unknown custom field keys that were ignored while creating the subscriber. */
  warnings?: string[] | undefined;
  subscriber: Subscriber;
}

export interface FilterSubscriberParams extends NonNullablePaginationParams {
  /**
   * Number of results per page (max 100).
   *
   * As required from the api: 1 <= x <= 100
   */
  per_page?: number | undefined;

  /**
   * Include total count of matching subscribers in response.
   *
   * @default false.
   */
  include_total_count?: boolean | undefined;
}

export interface FilterSubscriberBodyAnyBroadcast {
  type: "broadcasts";
  /** Array of broadcast IDs. Subscriber must match ANY of these. */
  ids: number[];
}

export interface FilterSubscriberBodyAnyUrls {
  type: "urls";

  /** Array of URL IDs. Subscriber must have clicked ANY of these. */
  ids?: number[] | undefined;

  /** Array of URL patterns. Subscriber must have clicked ANY of these. */
  urls?: string[] | undefined;

  /** URL pattern matching strategy. Defaults to exact when omitted. */
  matching?:
    | "exact"
    | "contains"
    | "starts_with"
    | "ends_with"
    | (string & {})
    | undefined;
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

  /** Minimum count (exclusive). */
  count_greater_than?: number | undefined;

  /** Minimum count (inclusive). */
  count_greater_than_or_equal?: number | undefined;

  /** Maximum count (exclusive). */
  count_less_than?: number | undefined;

  /** Maximum count (inclusive). */
  count_less_than_or_equal?: number | undefined;

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

export interface FilterSubscriberBodyAnyForms {
  type: "forms";
  /** Original signup form or legacy landing-page IDs to match. */
  ids: number[];
}

/** Supplied fields are ANDed against the original signup attribution row. */
export interface FilterSubscriberBodyAnyKitSource {
  type: "kit_source";
  /** Original Kit source type, such as form_subscription, api_subscription, or manual. */
  source_type?: string | undefined;
  /** Match any listed Kit source ID. */
  source_ids?: number[] | undefined;
  /** Match any listed Kit source name. */
  source_names?: string[] | undefined;
  /** Original Kit source mechanism. */
  mechanism?: string | undefined;
  /** Match any listed Kit source mechanism ID. */
  mechanism_ids?: number[] | undefined;
}

export interface FilterSubscriberBodyAllAttribution {
  type: "attribution";
  /** Original signup attribution conditions combined with OR logic. */
  any: (FilterSubscriberBodyAnyForms | FilterSubscriberBodyAnyKitSource)[];
}

export interface FilterSubscriberBodyAllState {
  type: "subscriber_state";
  /** Lifecycle states to match. Subscribers matching any listed state pass. */
  states: SubscriberState[];
}

export interface FilterSubscriberBodyAllTags {
  type: "tags";
  /** Tag conditions combined with OR logic. */
  any: {
    type: "ids";
    /** Tag IDs to match. */
    matching: number[];
  }[];
}

export type FilterSubscriberBodyAllCustomField = {
  type: "custom_field";
  /** ID of the custom field to filter by. */
  subscriber_custom_field_id: number;
} & (
  | {
      /** Match any non-empty stored value. */
      comparison: "has_value";
      /** Ignored for has_value. */
      value?: string | undefined;
    }
  | {
      /** Exact equality, case-insensitive substring, or numeric comparison. */
      comparison:
        | "is"
        | "contains"
        | "greater_than"
        | "greater_than_or_equal"
        | "less_than"
        | "less_than_or_equal";
      /** Numeric comparisons parse this string as a number. */
      value: string;
    }
);

export interface FilterSubscriberBodyAllLocation {
  type: "location";
  /** Center latitude in decimal degrees. */
  latitude: number;
  /** Center longitude in decimal degrees. */
  longitude: number;
  /** Radius in miles. Matches primary locations inside the bounding box. */
  radius: number;
}

export type FilterSubscriberInclude =
  | {
      type:
        "attribution" | "tags" | "location" | "canceled_at" | "custom_fields";
    }
  | {
      type: "stats";
      /** Date window (YYYY-MM-DD). Defaults to the last 90 days. */
      range?:
        | {
            start?: string | undefined;
            end?: string | undefined;
          }
        | undefined;
    };

export interface FilterSubscriberBody {
  /** Additional fields to embed on each returned subscriber. */
  include?: FilterSubscriberInclude[] | undefined;
  /**
   * Count all engagement events (raw) or distinct emails (unique_email).
   * Applies to opens, clicks, sent, and delivered conditions.
   *
   * @default "raw"
   */
  counting_mode?: "raw" | "unique_email" | undefined;
  /**
   * Field to order results by. Engagement metrics use the trailing 90 days.
   * location__distance requires a location condition in the same request.
   *
   * @default "created_at"
   */
  sort_field?:
    | "id"
    | "first_name"
    | "email_address"
    | "created_at"
    | "engagement__sent"
    | "engagement__opens"
    | "engagement__clicks"
    | "engagement__open_rate"
    | "engagement__click_rate"
    | "location__distance"
    | undefined;
  /** Sort direction. Defaults to desc, or asc for location__distance. */
  sort_order?: "asc" | "desc" | undefined;
  all: (
    | FilterSubscriberBodyAllSubscribed
    | FilterSubscriberBodyAllBase
    | FilterSubscriberBodyAllAttribution
    | FilterSubscriberBodyAllState
    | FilterSubscriberBodyAllTags
    | FilterSubscriberBodyAllCustomField
    | FilterSubscriberBodyAllLocation
  )[];
}

export interface FilterSubscribers {
  subscribers: {
    id: string;
    first_name: string | null;
    email_address: string;
    created_at: string;
    tag_names?: string[] | undefined;
    tag_ids?: string[] | undefined;
    /** Included when attribution is requested; null when unavailable. */
    attribution?:
      | {
          referrer?: string | null | undefined;
          utm_source?: string | null | undefined;
          utm_medium?: string | null | undefined;
          utm_campaign?: string | null | undefined;
          utm_term?: string | null | undefined;
          utm_content?: string | null | undefined;
          source_type?: string | null | undefined;
          source_name?: string | null | undefined;
          source_mechanism?: string | null | undefined;
          source_mechanism_id?: number | null | undefined;
        }
      | null
      | undefined;
    /** Included when tags are requested. */
    tags?: { id?: number | undefined; name?: string | undefined }[] | undefined;
    /** Included when location is requested; null when unavailable. */
    location?: PartialSubscriberLocation | null | undefined;
    /** Most recent state transition timestamp, included when canceled_at is requested. */
    canceled_at?: string | null | undefined;
    /** Engagement over the requested range, included when stats are requested. */
    stats?: PartialSubscriberStats | undefined;
    /** All custom field values, included when custom_fields is requested. */
    fields?: Record<string, string | null> | undefined;
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
  subscriber: Subscriber & {
    /** Cancellation timestamp, when present. */
    canceled_at?: string | null | undefined;
    /** Primary location. Individual fields are null when not yet determined. */
    location?: PartialSubscriberLocation | undefined;
  };
}

export interface UpdateSubscriberParams {
  first_name?: string | null | undefined;
  email_address: string;
  /** Use existing custom field keys; unknown keys are ignored and returned in warnings. */
  fields?: Record<string, string> | null | undefined;
}

export interface UpdateSubscriber {
  /** Unknown custom field keys that were ignored while updating the subscriber. */
  warnings?: string[] | undefined;
  subscriber: Subscriber;
}

export interface PinSubscriberLocationParams {
  location: {
    city: string;
    state_province: string;
    /** ISO 3166-1 alpha-2 country code. */
    country_code: string;
    latitude: number;
    longitude: number;
    /** IANA timezone name, such as America/Denver. */
    timezone: string;
  };
}

export interface PinSubscriberLocation {
  subscriber: {
    id: number;
    location: PinSubscriberLocationParams["location"];
  };
}

/** All location fields are required: updates replace the entire pinned location. */
export type UpdateSubscriberLocationParams = PinSubscriberLocationParams;

export type UpdateSubscriberLocation = PinSubscriberLocation;

export interface GetSubscriberStatsParams {
  /**
   * Filter to stats for emails sent after this date (YYYY-MM-DD).
   *
   * Starting October 15, 2026, Kit limits email stats to the last five years.
   * Explicit dates outside that window return a 400 error.
   * @see https://developers.kit.com/api-reference/email-data-retention
   */
  email_sent_after?: string | undefined;

  /**
   * Filter to stats for emails sent before this date (YYYY-MM-DD).
   *
   * Starting October 15, 2026, Kit limits email stats to the last five years.
   * Explicit dates outside that window return a 400 error.
   * @see https://developers.kit.com/api-reference/email-data-retention
   */
  email_sent_before?: string | undefined;
}

/** Engagement statistics returned by the subscriber stats endpoint. */
export interface SubscriberStats {
  sent: number;
  opened: number;
  clicked: number;
  bounced: number;
  open_rate: number;
  click_rate: number;
  last_sent: string;
  last_opened: string;
  last_clicked: string;
  sends_since_last_open: number;
  sends_since_last_click: number;
}

/** Filter responses permit partial stats and null timestamps for missing events. */
type PartialSubscriberStats = {
  [Key in keyof SubscriberStats]?:
    | SubscriberStats[Key]
    | (Key extends "last_sent" | "last_opened" | "last_clicked" ? null : never)
    | undefined;
};

export interface GetSubscriberStats {
  subscriber: {
    id: number;
    stats: SubscriberStats;
  };
}

export interface GetSubscriberTagsParams extends PaginationParams {}

/** Tag record attached to a subscriber, with optional subscription timestamps. */
export interface SubscriberTag extends Pick<Tag, "id" | "name"> {
  added_at?: string | undefined;
  tagged_at?: string | undefined;
}

export interface GetSubscriberTags {
  tags: SubscriberTag[];
  pagination: Pagination;
}
