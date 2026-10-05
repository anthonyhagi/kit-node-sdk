import type { Kit, RequestOptions } from "~/index";
import type {
  GetPost,
  ListPosts,
  ListPostsParams,
  ListPostsWithContent,
} from "./types";

export class PostsHandler {
  constructor(private api: Kit) {}

  /**
   * Get a post's full HTML content and publishing metadata.
   *
   * @param id - The post to retrieve.
   * @param options - Optional request controls, including cancellation.
   * @returns The post details, or null when the post was not found.
   * @see {@link https://developers.kit.com/api-reference/posts/get-a-post}
   */
  public async get(
    id: number,
    options?: RequestOptions
  ): Promise<GetPost | null> {
    return await this.api.get<GetPost | null>(`/posts/${id}`, {
      signal: options?.signal,
      maxRetries: options?.maxRetries,
    });
  }

  /**
   * List posts published to the creator's Kit site or sent by email.
   *
   * @param params - Optional pagination and content inclusion parameters.
   * @param options - Optional request controls, including cancellation.
   * @returns A page of posts, with HTML content when requested.
   * @see {@link https://developers.kit.com/api-reference/posts/list-posts}
   */
  public async list(
    params: ListPostsParams & { include_content: true },
    options?: RequestOptions
  ): Promise<ListPostsWithContent>;
  public async list(
    params?: ListPostsParams & { include_content?: false | undefined },
    options?: RequestOptions
  ): Promise<ListPosts>;
  public async list(
    params?: ListPostsParams,
    options?: RequestOptions
  ): Promise<ListPosts | ListPostsWithContent>;
  public async list(
    params?: ListPostsParams,
    options?: RequestOptions
  ): Promise<ListPosts | ListPostsWithContent> {
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
      ...(per_page != null && { per_page: String(per_page) }),
    });
    return await this.api.get<ListPosts>("/posts", {
      query,
      signal: options?.signal,
      maxRetries: options?.maxRetries,
    });
  }
}
