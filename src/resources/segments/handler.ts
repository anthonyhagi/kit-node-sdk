import type { Kit, RequestOptions } from "~/index";
import type { ListSegments, ListSegmentsParams } from "./types";

export class SegmentsHandler {
  private api: Kit;

  constructor(api: Kit) {
    this.api = api;
  }

  /**
   * Get a paginated list of all Segments.
   *
   * @param params - Optional parameters for filter by.
   * @param options - Optional request controls, including cancellation.
   *
   * @see {@link https://developers.kit.com/api-reference/segments/list-segments}
   *
   * @returns The paginated list of Segments.
   */
  public async list(
    params?: ListSegmentsParams,
    options?: RequestOptions
  ): Promise<ListSegments> {
    const { after, before, include_total_count, per_page } = params || {};

    const query = new URLSearchParams({
      ...(after && { after }),
      ...(before && { before }),
      ...(include_total_count !== undefined && {
        include_total_count: String(include_total_count),
      }),
      ...(per_page && { per_page: String(per_page) }),
    });

    return await this.api.get<ListSegments>("/segments", {
      query,
      signal: options?.signal,
      maxRetries: options?.maxRetries,
    });
  }
}
