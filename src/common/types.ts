export type Pagination = {
  has_previous_page: boolean;
  has_next_page: boolean;
  start_cursor: string | null;
  end_cursor: string | null;
  per_page: number;
  /** Total records when requested with `include_total_count: true`. */
  total_count?: number | undefined;
};

export type SubscriberState =
  "active" | "bounced" | "cancelled" | "complained" | "inactive";

/** Pagination controls shared by collection requests. */
export interface PaginationParams {
  /** Cursor from the previous page's end_cursor; null is omitted. */
  after?: string | null | undefined;
  /** Cursor from the next page's start_cursor; null is omitted. */
  before?: string | null | undefined;
  /** Include the total record count; large collections may respond more slowly. */
  include_total_count?: boolean | undefined;
  /** Number of results per page. Default 500, maximum 1000; null is omitted. */
  per_page?: number | null | undefined;
}

/** Pagination controls for endpoints whose input types do not accept null. */
export type NonNullablePaginationParams = {
  [Key in keyof PaginationParams]: Exclude<PaginationParams[Key], null>;
};
