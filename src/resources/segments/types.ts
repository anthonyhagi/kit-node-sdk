import type { Pagination, PaginationParams } from "~/common/types";

export interface ListSegmentsParams extends PaginationParams {}

/** Segment metadata returned by segment lists. */
export interface Segment {
  id: number;
  name: string;
  created_at: string;
}

export interface ListSegments {
  segments: Segment[];
  pagination: Pagination;
}
