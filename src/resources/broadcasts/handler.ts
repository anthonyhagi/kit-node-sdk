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
  UpdateBroadcast,
  UpdateBroadcastParams,
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
   * @param params - Filters that should be applied to the request.
   *
   * @see {@link https://developers.kit.com/api-reference/broadcasts/list-broadcasts}
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
      ...(per_page && { per_page: String(per_page) }),
    });

    return await this.api.get<ListBroadcasts>("/broadcasts", { query });
  }

  /**
   * Draft or schedule to send a broadcast to all or a subset of your
   * subscribers.
   *
   * @remarks To save a draft, set the `send_at` field to `null`. To
   * publish to the web, set `public` to `true`. To schedule the
   * Broadcast for sending, provide a `send_at` timestamp.
   *
   * Scheduled Broadcasts should contain a subject and your content,
   * at a minimum. Kit currently supports targeting your subscribers
   * based on Segment or Tag ids.
   *
   * @param params - The required parameters to create a broadcast.
   *
   * @see {@link https://developers.kit.com/api-reference/broadcasts/create-a-broadcast}
   *
   * @returns the created broadcast.
   */
  public async create(params: CreateBroadcastParams): Promise<CreateBroadcast> {
    const body = JSON.stringify(params);

    return await this.api.post<CreateBroadcast>("/broadcasts", { body });
  }

  /**
   * Returns the stats for all Broadcasts on the account.
   *
   * @remarks This endpoint requires either a Pro level plan or
   * developer authorization.
   *
   * @see {@link https://developers.kit.com/api-reference/broadcasts/get-stats-for-a-list-of-broadcasts}
   *
   * @returns an array of stats for all Broadcasts.
   */
  public async getAllStats(): Promise<GetBroadcastStats> {
    return await this.api.get<GetBroadcastStats>("/broadcasts/stats");
  }

  /**
   * Get the specific number of link clicks for a Broadcast.
   *
   * @param id - The specific Broadcast we are looking at.
   *
   * @see {@link https://developers.kit.com/api-reference/broadcasts/get-link-clicks-for-a-broadcast}
   *
   * @returns the broadcast link clicks in an array. Otherwise, `null`
   * if the broadcast cannot be found.
   */
  public async getLinkClicksById(id: number): Promise<GetLinkClicks | null> {
    this.validateId(id);

    return await this.api.get<GetLinkClicks | null>(`/broadcasts/${id}/clicks`);
  }

  /**
   * Get the stats for a single Broadcast.
   *
   * @param id - The unique ID of the Broadcast.
   *
   * @see {@link https://developers.kit.com/api-reference/broadcasts/get-stats-for-a-broadcast}
   *
   * @returns the Broadcast if it exists; `null` otherwise.
   */
  public async getStats(id: number): Promise<GetSingleBroadcastStats | null> {
    this.validateId(id);
    const url = `/broadcasts/${id}/stats`;

    return await this.api.get<GetSingleBroadcastStats | null>(url);
  }

  /**
   * Delete a Broadcast by it's unique ID.
   *
   * @param id the unique ID of the Broadcast.
   *
   * @see {@link https://developers.kit.com/api-reference/broadcasts/delete-a-broadcast}
   *
   * @returns an empty object when deleted successfully; `null` if
   * the Broadcast was not found.
   */
  public async delete(id: number): Promise<{} | null> {
    this.validateId(id);

    return await this.api.delete<{} | null>(`/broadcasts/${id}`);
  }

  /**
   * Get a broadcast by it's unique ID.
   *
   * @param id the unique ID of the broadcast.
   *
   * @returns the broadcast if it was found; `null` otherwise.
   * @see {@link https://developers.kit.com/api-reference/broadcasts/get-a-broadcast}
   */
  public async get(id: number): Promise<GetBroadcast | null> {
    this.validateId(id);

    return await this.api.get<GetBroadcast | null>(`/broadcasts/${id}`);
  }

  /**
   * Update an existing broadcast. Continue to draft or schedule to send
   * a broadcast to all or a subset of your subscribers.
   *
   * To save a draft, set `public` to false.
   *
   * To schedule the broadcast for sending, set the `public` field to
   * `true` and provide the `send_at` field. Scheduled broadcasts
   * should contain a subject and your content, at a minimum.
   *
   * Kit currently supports targeting your subscribers based on segment
   * or tag ids.
   *
   * @returns the updated broadcast with attached details. If the
   * broadcast was not found, `null` is returned.
   * @see {@link https://developers.kit.com/api-reference/broadcasts/update-a-broadcast}
   */
  public async update(
    id: number,
    params: UpdateBroadcastParams
  ): Promise<UpdateBroadcast | null> {
    this.validateId(id);

    const body = JSON.stringify(params);

    return await this.api.put<UpdateBroadcast | null>(`/broadcasts/${id}`, {
      body,
    });
  }

  /**
   * Handle validating that an actual ID was passed in.
   *
   * @param id the unqiue ID of the broadcast.
   *
   * @throws Error when the id is undefined, null or `0` as they
   * are invalid values.
   */
  private validateId(id: number) {
    if (!id || id == null) {
      throw new Error(
        "Please provide a valid broadcast id to get the link clicks"
      );
    }
  }
}
