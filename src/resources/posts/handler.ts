import type { Kit } from "~/index";
import type { GetPost, ListPosts, ListPostsParams } from "./types";

export class PostsHandler {
  constructor(private api: Kit) {}

  /**
   * Get a post's full HTML content and publishing metadata.
   *
   * @param id - The post to retrieve.
   * @returns The post details, or null when the post was not found.
   * @see {@link https://developers.kit.com/api-reference/posts/get-a-post}
   */
  public async get(id: number): Promise<GetPost | null> {
    return await this.api.get<GetPost | null>(`/posts/${id}`);
  }

  /**
   * List posts published to the creator's Kit site or sent by email.
   *
   * @param params - Optional pagination and content inclusion parameters.
   * @returns A page of posts, with HTML content when requested.
   * @see {@link https://developers.kit.com/api-reference/posts/list-posts}
   */
  public async list(params?: ListPostsParams): Promise<ListPosts> {
    const { after, before, include_content, include_total_count, per_page } =
      params || {};
    const query = new URLSearchParams({
      ...(after && { after }),
      ...(before && { before }),
      ...(include_content !== undefined && {
        include_content: String(include_content),
      }),
      ...(include_total_count !== undefined && {
        include_total_count: String(include_total_count),
      }),
      ...(per_page !== undefined && { per_page: String(per_page) }),
    });
    return await this.api.get<ListPosts>("/posts", { query });
  }
}
