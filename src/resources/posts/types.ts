import type { Pagination, PaginationParams } from "~/common/types";

export interface ListPostsParams extends PaginationParams {
  /** Include each post's HTML content; omitted by default. */
  include_content?: boolean | undefined;
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

/** Post lists requested with include_content: true include HTML on each item. */
export interface ListPostsWithContent extends Omit<ListPosts, "posts"> {
  posts: Post[];
}

/** Full post record returned by reads and lists requesting content. */
export type Post = Omit<PostListItem, "content"> & {
  /** Full reads always include HTML content. */
  content: string;
};

export interface GetPost {
  post: Post;
}
