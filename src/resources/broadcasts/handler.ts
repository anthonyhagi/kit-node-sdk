import type { Kit } from "~/index";
import type {
  CreateBroadcast,
  CreateBroadcastParams,
  GetBroadcast,
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
  public async listBroadcasts(
    params: ListBroadcastsParams = {}
  ): Promise<ListBroadcasts> {
    const { after, before, include_total_count, per_page } = params;

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
   * We currently support targeting your subscribers based on segment
   * or tag ids.
   *
   * @param params The required parameters to create a broadcast.
   *
   * @returns the created broadcast.
   */
  public async createBroadcast(
    params: CreateBroadcastParams
  ): Promise<CreateBroadcast> {
    const body = JSON.stringify(params);

    return await this.api.post<CreateBroadcast>("/broadcasts", { body });
  }

  public async getLinkClicks(id: number) {
    return await this.api.get(`/broadcasts/${id}/clicks`);
  }

  public async getStatsForBroadcast(id: number) {
    return await this.api.get(`/broadcasts/${id}/stats`);
  }

  public async deleteBroadcast(id: number): Promise<void> {
    return await this.api.delete<undefined>(`/broadcasts/${id}`);
  }

  public async getBroadcast(id: number): Promise<GetBroadcast | null> {
    return await this.api.get<GetBroadcast | null>(`/broadcasts/${id}`);
  }
}
