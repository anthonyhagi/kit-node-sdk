import type { Pagination, PaginationParams } from "~/common/types";

export interface ListSegmentsParams extends PaginationParams {}

export interface ListSegments {
  segments: {
    id: number;
    name: string;
    created_at: string;
  }[];
  pagination: Pagination;
}
