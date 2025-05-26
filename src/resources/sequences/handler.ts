import type { Kit } from "~/index";
import { toDateString } from "~/utils/date";
import type {
  ListSequences,
  ListSequencesParams,
  ListSequenceSubscribers,
  ListSequenceSubscribersParams,
} from "./types";

export class SequencesHandler {
  private api: Kit;

  constructor(api: Kit) {
    this.api = api;
  }

  /**
   * Get a paginated list of all Sequences.
   *
   * @param params Optional parameters to filter by.
   *
   * @returns The paginated list of Sequences.
   */
  public async list(params?: ListSequencesParams): Promise<ListSequences> {
    const { after, before, include_total_count, per_page } = params || {};

    const query = new URLSearchParams({
      ...(after && { after }),
      ...(before && { before }),
      ...(include_total_count && {
        include_total_count: String(include_total_count),
      }),
      ...(per_page && { per_page: String(per_page) }),
    });

    return await this.api.get<ListSequences>("/sequences", { query });
  }

  /**
   * Get a paginated list of all Subscribers for a Sequence.
   *
   * @param id The unique ID of the sequence.
   * @param params Optional parameters to filter by.
   *
   * @returns The paginated list of Subscribers for a Sequence.
   */
  public async listSubscribers(
    id: number,
    params?: ListSequenceSubscribersParams
  ): Promise<ListSequenceSubscribers> {
    const {
      added_after,
      added_before,
      after,
      before,
      created_after,
      created_before,
      include_total_count,
      per_page,
      status,
    } = params || {};

    const query = new URLSearchParams({
      ...(added_after && { added_after: toDateString(added_after) }),
      ...(added_before && { added_before: toDateString(added_before) }),
      ...(after && { after }),
      ...(before && { before }),
      ...(created_after && { created_after: toDateString(created_after) }),
      ...(created_before && { created_before: toDateString(created_before) }),
      ...(include_total_count && {
        include_total_count: String(include_total_count),
      }),
      ...(per_page && { per_page: String(per_page) }),
      ...(status && { status }),
    });

    const url = `/sequences/${id}/subscribers`;

    return await this.api.get<ListSequenceSubscribers>(url, { query });
  }

  public async addSubscriberByEmail(id: number) {
    return await this.api.post(`/sequences/${id}/subscribers`);
  }

  public async addSubscriberById(id: number, subscriberId: number) {
    return await this.api.post(`/sequences/${id}/subscribers/${subscriberId}`);
  }
}
