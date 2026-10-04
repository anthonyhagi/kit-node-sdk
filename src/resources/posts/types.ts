import type { Pagination } from "~/common/types";

export interface ListPostsParams {
  /** Cursor from the previous page's end_cursor. */
  after?: string | undefined;
  /** Cursor from the next page's start_cursor. */
  before?: string | undefined;
  /** Include each post's HTML content; omitted by default. */
  include_content?: boolean | undefined;
  include_total_count?: boolean | undefined;
  /** Number of results per page. Default 500, maximum 1000. */
  per_page?: number | undefined;
}

export interface PostListItem {
  id: number;
  /** Shared with a matching broadcast when the post was also sent by email. */
  publication_id: number;
  created_at: string;
  title: string;
  slug: string | null;
  description: string | null;
  meta_description: string | null;
  status: string;
  published_at: string | null;
  sent_at: string | null;
  thumbnail_alt: string | null;
  thumbnail_url: string | null;
  is_paid: boolean;
  public_url: string | null;
  /** Account's paid-post product; null when none is configured. */
  product_id?: number | null | undefined;
  /** Included when requested with include_content: true. */
  content?: string | undefined;
}

export interface ListPosts {
  posts: PostListItem[];
  pagination: Pagination;
}
