import type { Kit } from "~/index";
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
   *
   * @see {@link https://developers.kit.com/v4#list-segments}
   *
   * @returns The paginated list of Segments.
   */
  public async list(params?: ListSegmentsParams): Promise<ListSegments> {
    const { after, before, include_total_count, per_page } = params || {};

    const query = new URLSearchParams({
      ...(after && { after }),
      ...(before && { before }),
      ...(include_total_count && {
        include_total_count: String(include_total_count),
      }),
      ...(per_page && { per_page: String(per_page) }),
    });

    return await this.api.get<ListSegments>("/segments", { query });
  }
}
