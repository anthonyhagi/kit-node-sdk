import type { Kit } from "~/index";
import type {
  CreateBroadcast,
  CreateBroadcastParams,
  GetBroadcast,
  GetBroadcastStats,
  GetLinkClicks,
  GetSingleBroadcastStats,
  ListBroadcasts,
  ListBroadcastsParams,
} from "./types";

export class BroadcastsHandler {
  private api: Kit;

  constructor(api: Kit) {
    this.api = api;
  }

  /**
   * Returns a paginated list of all broadcasts for your account
   * (including draft, scheduled, and already sent).
   *
   * @param params any filters that should be applied to the request.
   *
   * @returns the paginated list of broadcasts.
   */
  public async list(params?: ListBroadcastsParams): Promise<ListBroadcasts> {
    const { after, before, include_total_count, per_page } = params || {};

    const query = new URLSearchParams({
      ...(after && { after }),
      ...(before && { before }),
      ...(include_total_count && {
        include_total_count: String(include_total_count),
      }),
      ...(per_page && { per_page: per_page.toString() }),
    });

    return await this.api.get<ListBroadcasts>("/broadcasts", { query });
  }

  /**
   * Draft or schedule to send a broadcast to all or a subset of your
   * subscribers.
   *
   * To save a draft, set the `send_at` field to null.
   *
   * To publish to the web, set `public` to true.
   *
   * To schedule the broadcast for sending, provide a `send_at` timestamp.
   * Scheduled broadcasts should contain a subject and your content,
   * at a minimum.
   *
   * Kit currently supports targeting your subscribers based on segment
   * or tag ids.
   *
   * @param params The required parameters to create a broadcast.
   *
   * @returns the created broadcast.
   */
  public async create(params: CreateBroadcastParams): Promise<CreateBroadcast> {
    const body = JSON.stringify(params);

    return await this.api.post<CreateBroadcast>("/broadcasts", { body });
  }

  /**
   * Returns the stats for all broadcasts on the account.
   *
   * NOTE: This endpoint requires either a Pro level plan or
   * developer authorization.
   *
   * @returns an array of stats for all broadcasts.
   */
  public async getStats(): Promise<GetBroadcastStats> {
    return await this.api.get<GetBroadcastStats>("/broadcasts/stats");
  }

  /**
   * Get the specific number of link clicks for a broadcast.
   *
   * @param id The specific broadcast we are looking at.
   *
   * @returns the broadcast link clicks in an array.
   */
  public async getLinkClicks(id: number): Promise<GetLinkClicks | null> {
    if (!id || id == null) {
      throw new Error(
        "Please provide a valid broadcast id to get it's link clicks"
      );
    }

    return await this.api.get<GetLinkClicks | null>(`/broadcasts/${id}/clicks`);
  }

  /**
   * Get the stats for a single broadcast.
   *
   * @param id the unique ID of the broadcast.
   *
   * @returns the broadcast if it exists, `null` otherwise.
   */
  public async getStatsById(
    id: number
  ): Promise<GetSingleBroadcastStats | null> {
    return await this.api.get<GetSingleBroadcastStats | null>(
      `/broadcasts/${id}/stats`
    );
  }

  /**
   * Delete a broadcast by it's unique ID.
   *
   * @param id the unique ID of the broadcast.
   *
   * @returns `true` when deleted successfully, `false` otherwise.
   */
  public async deleteBroadcast(id: number): Promise<boolean> {
    const resp = await this.api.delete<object | null>(`/broadcasts/${id}`);

    if (resp == null) {
      return false;
    }

    return true;
  }

  /**
   *
   * @param id
   * @returns
   */
  public async getBroadcast(id: number): Promise<GetBroadcast | null> {
    return await this.api.get<GetBroadcast | null>(`/broadcasts/${id}`);
  }
}
