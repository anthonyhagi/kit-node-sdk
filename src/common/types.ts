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
